import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { ministries, projectMessages } from "@/lib/db/schema";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { fetchCaseManagerCandidates, fetchMinistryAdminsForMinistry } from "@/lib/db/queries/users";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { notifyUser } from "@/lib/email/notify";
import { mapDbMessageToApp } from "@/lib/db/mappers/message";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import type { InvestmentProject, MessageActionPayload } from "@/lib/types";
import { AMENDABLE_FIELD_LABELS, isAmendmentRequestPending } from "@/lib/governance/amendable-fields";

type RouteParams = { params: Promise<{ id: string }> };

// Amendments only ever touch content/financial fields — never governance/bookkeeping fields
// (visibilityLevel, dataVerificationStatus, projectStatus, createdBy, investorSubmitted, or any
// *By/*At attribution stamp). Same rationale as CREATOR_STRIPPED_FIELDS in PATCH
// /api/projects/[id]: those stay staff/server-controlled no matter which path an investor uses.
// Sourced from the shared client-facing label map (lib/governance/amendable-fields.ts) so the
// server allowlist and the "Request Amendment" form's field picker can never drift apart.
const AMENDABLE_FIELDS: (keyof InvestmentProject)[] = Object.keys(AMENDABLE_FIELD_LABELS) as (keyof InvestmentProject)[];

/**
 * POST /api/projects/[id]/amendment-request — the compliant "Request Amendment" path for a
 * locked (approved/published) proposal's field changes. Two filers, two eligibility rules, two
 * adjudication chains — the project row itself is never mutated here either way; this only posts
 * an interactive Action Card (kind='action') that a later POST /api/messages/[id]/action resolves:
 *   - `qualified` investor-owner on their own submission (Investor Dashboard Expansion plan,
 *     Phase 5): single-stage, admin/super_admin-only decision. Mirrors
 *     POST /api/engagements/[id]/correction.
 *   - `government` reviewer on their own ministry's project (Platform Feedback Batch v4, Phase 8):
 *     two-stage — routes to the requester's own ministry_admin first (`status: "open"`), who can
 *     approve (escalates to `"escalated"`, awaiting ZIDA) or decline (terminal). Falls back to
 *     filing straight into `"escalated"` if that ministry currently has no active ministry_admin
 *     seat, so it's never stuck waiting on nobody.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["qualified", "government"]);
    const { id } = await params;
    const body = (await request.json()) as { reason?: string; proposedChanges?: Partial<InvestmentProject> };

    if (!body.reason || !body.reason.trim()) {
      return NextResponse.json({ error: "A reason is required to request an amendment." }, { status: 400 });
    }

    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (actor.role === "qualified") {
      if (!project.investorSubmitted || project.createdBy !== actor.userId) {
        return NextResponse.json({ error: "You do not have permission to amend this project." }, { status: 403 });
      }
    } else {
      // government (Phase 8) — scoped to their own ministry's project, same predicate
      // ministry_admin's own visibility/association-request eligibility already uses.
      if (!actor.ministryId || !projectMatchesMinistry(project, actor.ministryId)) {
        return NextResponse.json(
          { error: "You can only request amendments on your own ministry's projects." },
          { status: 403 }
        );
      }
    }
    if (project.projectStatus !== "approved" && project.projectStatus !== "published") {
      return NextResponse.json(
        { error: "Amendment requests only apply to approved or published proposals — this one is still editable directly." },
        { status: 400 }
      );
    }

    const proposedChanges: Partial<InvestmentProject> = {};
    for (const [key, value] of Object.entries(body.proposedChanges ?? {})) {
      if (AMENDABLE_FIELDS.includes(key as keyof InvestmentProject) && value !== undefined && value !== "") {
        (proposedChanges as Record<string, unknown>)[key] = value;
      }
    }
    if (Object.keys(proposedChanges).length === 0) {
      return NextResponse.json({ error: "At least one proposed change is required." }, { status: 400 });
    }

    const existingCards = await db.select().from(projectMessages).where(eq(projectMessages.projectId, project.id));
    const alreadyPending = existingCards.some((r) => {
      if (r.kind !== "action" || r.authorUserId !== actor.userId) return false;
      const p = r.payload as MessageActionPayload | null;
      return p?.type === "project_amendment_request" && isAmendmentRequestPending(p.status);
    });
    if (alreadyPending) {
      return NextResponse.json({ error: "You already have a pending amendment request on this project." }, { status: 409 });
    }

    const reason = body.reason.trim();
    const changesSummary = Object.keys(proposedChanges).join(", ");

    const payload: MessageActionPayload = {
      type: "project_amendment_request",
      reason,
      proposedChanges,
      status: "open",
    };

    let noteSuffix = "";
    let ministryAdminsToNotify: Awaited<ReturnType<typeof fetchMinistryAdminsForMinistry>> = [];
    if (actor.role === "government") {
      const [ministry, ministryAdmins] = await Promise.all([
        db.select().from(ministries).where(eq(ministries.id, actor.ministryId!)).limit(1),
        fetchMinistryAdminsForMinistry(actor.ministryId!),
      ]);
      payload.requestingMinistryId = actor.ministryId!;
      payload.requestingMinistryName = ministry[0]?.name;
      if (ministryAdmins.length > 0) {
        noteSuffix = ` Routed to ${payload.requestingMinistryName ?? "your ministry"}'s Ministry Admin for first review.`;
        ministryAdminsToNotify = ministryAdmins;
      } else {
        // No active ministry_admin to route to — skip straight to the ZIDA stage rather than
        // leaving this stuck waiting on a seat nobody occupies (Phase 8's explicit fallback).
        payload.status = "escalated";
        noteSuffix = ` ${payload.requestingMinistryName ?? "Your ministry"} has no active Ministry Admin — routed directly to ZIDA Admin.`;
      }
    }

    const [inserted] = await db
      .insert(projectMessages)
      .values({
        projectId: project.id,
        authorUserId: actor.userId,
        authorName: actor.name,
        authorRole: actor.role,
        visibility: "investor_visible",
        kind: "action",
        payload,
        body: `Amendment requested — proposed changes to: ${changesSummary}. ${reason}${noteSuffix}`,
      })
      .returning();

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "project.amendment_requested",
      entityType: "project",
      entityId: project.id,
      metadata: { title: project.title, reason, fields: Object.keys(proposedChanges), filedByRole: actor.role },
    });

    for (const admin of ministryAdminsToNotify) {
      void notifyUser({
        userId: admin.userId,
        prefKey: "newMessages",
        subject: `Amendment request awaiting your review: ${project.title}`,
        bodyHtml: `<p>${actor.name} requested an amendment on <strong>${project.title}</strong>. Review it in your Ministry Desk Review Queue.</p>`,
      });
    }
    if (actor.role === "government" && payload.status === "escalated") {
      const zidaDesk = await fetchCaseManagerCandidates();
      for (const staff of zidaDesk) {
        void notifyUser({
          userId: staff.userId,
          prefKey: "newMessages",
          subject: `Amendment request awaiting ZIDA review: ${project.title}`,
          bodyHtml: `<p>${actor.name} requested an amendment on <strong>${project.title}</strong>. Their ministry has no active Ministry Admin, so this was routed directly to ZIDA. Review it in the Admin Review Queue.</p>`,
        });
      }
    }
    if (actor.role === "qualified") {
      const zidaDesk = await fetchCaseManagerCandidates();
      for (const staff of zidaDesk) {
        void notifyUser({
          userId: staff.userId,
          prefKey: "newMessages",
          subject: `Amendment request awaiting review: ${project.title}`,
          bodyHtml: `<p>${actor.name} requested an amendment on <strong>${project.title}</strong>. Review it in the Admin Review Queue.</p>`,
        });
      }
    }

    return NextResponse.json(mapDbMessageToApp(inserted), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

// Also allow staff to read a project's pending amendment cards without wiring a whole new list
// endpoint — reuses the same message table already surfaced in the Communication Hub, so this
// GET only exists for the investor's own "do I already have a pending request" UI affordance.
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["qualified", "admin", "super_admin", "government", "ministry_admin"]);
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (actor.role === "qualified" && project.createdBy !== actor.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (actor.role === "ministry_admin" && (!actor.ministryId || !projectMatchesMinistry(project, actor.ministryId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await db.select().from(projectMessages).where(eq(projectMessages.projectId, project.id));
    const cards = rows
      .filter((r) => r.kind === "action" && (r.payload as MessageActionPayload | null)?.type === "project_amendment_request")
      .map((r) => mapDbMessageToApp(r));
    return NextResponse.json(cards);
  } catch (error) {
    return handleRouteError(error);
  }
}
