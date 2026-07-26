import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { mapDbEngagementToApp } from "@/lib/db/mappers/engagement";
import { db } from "@/lib/db/client";
import { investorEngagements } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { canTransitionEngagement, canWithdrawEngagement, isDraftEditable } from "@/lib/governance/engagement-workflow";
import type { InvestorEngagement } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Two distinct write paths:
 *  - Qualified investor (must own the record): edit while `draft`, or publish `draft -> submitted`
 *    with a certification attestation. Every post-draft state is immutable to the investor.
 *  - Staff (admin/super_admin/government): drive the compliance status workflow + notes.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified"]);
    const { id } = await params;
    const body = (await request.json()) as Partial<InvestorEngagement> & {
      certified?: boolean;
      archived?: boolean;
      action?: string;
    };

    const [existing] = await db.select().from(investorEngagements).where(eq(investorEngagements.id, id)).limit(1);
    if (!existing || existing.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Follow-Through Status — admin/super_admin only (not government, and never the investor). A
    // purely administrative lever ("investor signed the MOU but doesn't follow up") independent of
    // the formal compliance status workflow below, so it's handled as its own branch rather than
    // threaded through handleInvestorPatch/handleStaffPatch.
    if (body.followThroughStatus !== undefined) {
      if (actor.role !== "admin" && actor.role !== "super_admin") {
        return NextResponse.json({ error: "Only ZIDA Admin or Platform Admin may set follow-through status." }, { status: 403 });
      }
      const [updated] = await db
        .update(investorEngagements)
        .set({ followThroughStatus: body.followThroughStatus, updatedAt: new Date() })
        .where(eq(investorEngagements.id, id))
        .returning();
      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "engagement.follow_through_updated",
        entityType: "engagement",
        entityId: id,
        metadata: { investorName: updated.investorName, projectId: existing.projectId, from: existing.followThroughStatus, to: updated.followThroughStatus },
      });
      return NextResponse.json(mapDbEngagementToApp(updated));
    }

    if (actor.role === "qualified") {
      return handleInvestorPatch(actor, existing, body);
    }
    return handleStaffPatch(actor, existing, body);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Soft-delete. Owner-only. Blocked once `approved` — at that point deletion requires the governed
 * delete-request workflow (POST .../delete-request) so ZIDA/government can be notified and weigh
 * in, since an approved engagement is the credibility record their process relies on.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["qualified"]);
    const { id } = await params;

    const [existing] = await db.select().from(investorEngagements).where(eq(investorEngagements.id, id)).limit(1);
    if (!existing || existing.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== actor.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.status === "approved") {
      return NextResponse.json(
        {
          error:
            "Approved engagements can't be deleted directly — submit a deletion request with justification instead.",
        },
        { status: 403 }
      );
    }

    await db
      .update(investorEngagements)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(investorEngagements.id, id));

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "engagement.deleted",
      entityType: "engagement",
      entityId: id,
      metadata: { investorName: existing.investorName, projectId: existing.projectId, statusAtDeletion: existing.status },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

type Actor = Awaited<ReturnType<typeof requireRole>>;
type EngagementRow = typeof investorEngagements.$inferSelect;

async function handleInvestorPatch(
  actor: Actor,
  existing: EngagementRow,
  body: Partial<InvestorEngagement> & { certified?: boolean; archived?: boolean; action?: string }
) {
  // Ownership gate — an investor can only touch their own engagement.
  if (!existing.userId || existing.userId !== actor.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Archive/unarchive — purely cosmetic, reversible, and allowed at ANY status (never touches the
  // compliance workflow). Handled first and independently of every other branch below.
  if (typeof body.archived === "boolean") {
    const [updated] = await db
      .update(investorEngagements)
      .set({ archivedAt: body.archived ? new Date() : null, updatedAt: new Date() })
      .where(eq(investorEngagements.id, existing.id))
      .returning();
    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: body.archived ? "engagement.archived" : "engagement.unarchived",
      entityType: "engagement",
      entityId: existing.id,
      metadata: { investorName: updated.investorName, projectId: existing.projectId },
    });
    return NextResponse.json(mapDbEngagementToApp(updated));
  }

  // Withdraw to Draft — self-service, pre-approval only (submitted/under_review/rejected). Lets an
  // investor pull an engagement back for revision without staff involvement. Never available once
  // `approved` — that status is the credibility record ZIDA/government rely on.
  if (body.action === "withdraw") {
    if (!canWithdrawEngagement(existing.status)) {
      return NextResponse.json(
        { error: "This engagement can no longer be withdrawn to draft." },
        { status: 403 }
      );
    }
    const [updated] = await db
      .update(investorEngagements)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(investorEngagements.id, existing.id))
      .returning();
    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "engagement.withdrawn",
      entityType: "engagement",
      entityId: existing.id,
      metadata: { investorName: updated.investorName, projectId: existing.projectId, from: existing.status },
    });
    return NextResponse.json(mapDbEngagementToApp(updated));
  }

  // Publish: draft -> submitted, requires an explicit certification + signatory title. This is the
  // one-way lock point; content becomes immutable to the investor afterward.
  const isPublish = body.status === "submitted" && existing.status === "draft";
  if (isPublish) {
    if (!body.certified || !(body.signatoryTitle ?? existing.signatoryTitle)) {
      return NextResponse.json(
        { error: "Certification and signatory title are required to publish." },
        { status: 400 }
      );
    }
    const now = new Date();
    const [updated] = await db
      .update(investorEngagements)
      .set({
        status: "submitted",
        // Allow a final field pass at the publish moment (still draft until this commits).
        investorOrganization: body.investorOrganization ?? existing.investorOrganization,
        ticketSize: body.ticketSize ?? existing.ticketSize,
        signatoryTitle: body.signatoryTitle ?? existing.signatoryTitle,
        notes: body.notes ?? existing.notes,
        certifiedAt: now,
        publishedAt: now,
        updatedAt: now,
      })
      .where(eq(investorEngagements.id, existing.id))
      .returning();

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "engagement.published",
      entityType: "engagement",
      entityId: existing.id,
      metadata: {
        investorName: updated.investorName,
        projectId: existing.projectId,
        signatoryTitle: updated.signatoryTitle,
      },
    });
    return NextResponse.json(mapDbEngagementToApp(updated));
  }

  // Otherwise this is an in-place draft edit — only permitted while still a draft.
  if (!isDraftEditable(existing.status)) {
    return NextResponse.json(
      { error: "This engagement is locked and can no longer be edited. Request a correction instead." },
      { status: 403 }
    );
  }
  // Reject illegal status changes (a draft may only stay draft or publish, handled above).
  if (body.status && body.status !== "draft") {
    return NextResponse.json({ error: "Invalid engagement status change" }, { status: 400 });
  }

  const [updated] = await db
    .update(investorEngagements)
    .set({
      investorOrganization: body.investorOrganization ?? existing.investorOrganization,
      ticketSize: body.ticketSize ?? existing.ticketSize,
      signatoryTitle: body.signatoryTitle ?? existing.signatoryTitle,
      notes: body.notes ?? existing.notes,
      updatedAt: new Date(),
    })
    .where(eq(investorEngagements.id, existing.id))
    .returning();

  return NextResponse.json(mapDbEngagementToApp(updated));
}

async function handleStaffPatch(
  actor: Actor,
  existing: EngagementRow,
  body: Partial<InvestorEngagement>
) {
  if (body.status && body.status !== existing.status && !canTransitionEngagement(existing.status, body.status)) {
    return NextResponse.json({ error: "Invalid engagement status transition" }, { status: 400 });
  }

  const now = new Date();
  const isStaffPublish = existing.status === "draft" && body.status === "submitted";
  // While an engagement is still a draft, staff may amend its content on the investor's behalf;
  // once published (submitted+) the record is immutable, matching the investor-side lock.
  const editableWhileDraft = existing.status === "draft";

  const [updated] = await db
    .update(investorEngagements)
    .set({
      status: body.status ?? existing.status,
      notes: body.notes ?? existing.notes,
      ...(editableWhileDraft
        ? {
            investorOrganization: body.investorOrganization ?? existing.investorOrganization,
            ticketSize: body.ticketSize ?? existing.ticketSize,
            signatoryTitle: body.signatoryTitle ?? existing.signatoryTitle,
          }
        : {}),
      // Staff publishing a draft stamps publishedAt (no certifiedAt — that's the investor attestation).
      ...(isStaffPublish ? { publishedAt: now } : {}),
      updatedAt: now,
    })
    .where(eq(investorEngagements.id, existing.id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status && body.status !== existing.status) {
    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "engagement.status_changed",
      entityType: "engagement",
      entityId: existing.id,
      // projectId lets GET /api/projects/[id]/history pull engagement-status events into a
      // single project timeline alongside project.status_changed rows (see that route).
      metadata: {
        from: existing.status,
        to: updated.status,
        investorName: updated.investorName,
        projectId: existing.projectId,
      },
    });
  }

  return NextResponse.json(mapDbEngagementToApp(updated));
}
