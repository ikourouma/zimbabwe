import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { investorEngagements } from "@/lib/db/schema";
import { mapDbEngagementToApp } from "@/lib/db/mappers/engagement";
import { isActiveTeamMemberOf } from "@/lib/db/queries/org-team";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { notifyUser } from "@/lib/email/notify";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Engagement Delegate assignment (Team Ministry Traceability Batch, Phase 5, item 5) — grants one
 * of the owner's own validated Team Members equal authority on this specific engagement. Never
 * exclusive: the owner (`existing.userId`) always keeps full authority too, whether or not a
 * Delegate is assigned (see the PATCH ownership-gate widening in ../route.ts).
 *
 * Two callers, symmetric with the proposal co-editor pattern:
 *  - The engagement's own owner (`qualified`/`ministry_admin`) — `userId` must be one of *their
 *    own* active org invites.
 *  - `admin`/`super_admin` (staff-assist, both tiers, only while the engagement is still `draft` —
 *    mirrors the existing "staff may amend investor's engagement while draft" rule in
 *    handleStaffPatch) — `userId` must be one of the *engagement owner's* active org invites, since
 *    staff are managing the investor's own roster on their behalf, not adding a stranger.
 */
async function loadEngagementAndAuthorize(
  id: string,
  actor: { role: string; userId: string }
): Promise<{ existing: typeof investorEngagements.$inferSelect } | { error: NextResponse }> {
  const [existing] = await db.select().from(investorEngagements).where(eq(investorEngagements.id, id)).limit(1);
  if (!existing || existing.deletedAt) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  const isOwner = existing.userId === actor.userId;
  const isStaff = actor.role === "admin" || actor.role === "super_admin";
  if (isOwner) return { existing };
  if (isStaff) {
    if (existing.status !== "draft") {
      return {
        error: NextResponse.json(
          { error: "Staff can only manage the Delegate while this engagement is still a draft." },
          { status: 403 }
        ),
      };
    }
    return { existing };
  }
  return { error: NextResponse.json({ error: "Only this engagement's owner can manage its Delegate." }, { status: 403 }) };
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["qualified", "ministry_admin", "admin", "super_admin"]);
    const { id } = await params;
    const result = await loadEngagementAndAuthorize(id, actor);
    if ("error" in result) return result.error;
    const { existing } = result;

    const body = (await request.json()) as { userId?: string };
    if (!body.userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    // Roster check always runs against the engagement OWNER's own team, not the acting staffer's —
    // see the doc comment above.
    const rosterOwnerId = existing.userId ?? actor.userId;
    if (!(await isActiveTeamMemberOf(rosterOwnerId, body.userId))) {
      return NextResponse.json({ error: "This person is not one of the owner's validated team members." }, { status: 400 });
    }

    const [updated] = await db
      .update(investorEngagements)
      .set({ assignedUserId: body.userId, assignedBy: actor.userId, assignedAt: new Date(), updatedAt: new Date() })
      .where(eq(investorEngagements.id, id))
      .returning();

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "engagement.delegate_assigned",
      entityType: "engagement",
      entityId: id,
      metadata: { assignedUserId: body.userId, investorName: updated.investorName, projectId: updated.projectId },
    });

    // Notification hook (Phase 8, item 1): the Delegate finds out they now have full authority on
    // this engagement alongside the owner.
    void notifyUser({
      userId: body.userId,
      prefKey: "teamActivity",
      subject: "You've been assigned as a Delegate on an engagement",
      bodyHtml: `<p>You've been assigned as a Delegate on the engagement for <strong>${updated.investorName}</strong>. You now have full authority to drive its remaining stages alongside the owner.</p>`,
    });

    return NextResponse.json(mapDbEngagementToApp(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["qualified", "ministry_admin", "admin", "super_admin"]);
    const { id } = await params;
    const result = await loadEngagementAndAuthorize(id, actor);
    if ("error" in result) return result.error;
    const { existing } = result;

    if (!existing.assignedUserId) {
      return NextResponse.json({ error: "No Delegate is currently assigned." }, { status: 400 });
    }

    const [updated] = await db
      .update(investorEngagements)
      .set({
        assignedUserId: null,
        assignedBy: null,
        assignedAt: null,
        // Safe reassignment handoff (Phase 8, item 3): if primary contact was pointed at the
        // Delegate being removed, fall it back to the owner rather than leaving it dangling on a
        // user who no longer has any authority here.
        ...(existing.primaryContactUserId === existing.assignedUserId ? { primaryContactUserId: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(investorEngagements.id, id))
      .returning();

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "engagement.delegate_unassigned",
      entityType: "engagement",
      entityId: id,
      metadata: { previousAssignedUserId: existing.assignedUserId, investorName: updated.investorName, projectId: updated.projectId },
    });

    // Notification hook (Phase 8, item 1): notify the removed Delegate, and — since the plan calls
    // for notifying "the delegate (and the org admin, on unassign)" — the owner too, unless the
    // owner is the one who just made the change themselves.
    void notifyUser({
      userId: existing.assignedUserId,
      prefKey: "teamActivity",
      subject: "You've been removed as Delegate on an engagement",
      bodyHtml: `<p>You're no longer the Delegate on the engagement for <strong>${updated.investorName}</strong>.</p>`,
    });
    if (existing.userId && existing.userId !== actor.userId) {
      void notifyUser({
        userId: existing.userId,
        prefKey: "teamActivity",
        subject: "Delegate removed from your engagement",
        bodyHtml: `<p>The Delegate on your engagement for <strong>${updated.investorName}</strong> has been removed — you remain the sole owner driving it.</p>`,
      });
    }

    return NextResponse.json(mapDbEngagementToApp(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
