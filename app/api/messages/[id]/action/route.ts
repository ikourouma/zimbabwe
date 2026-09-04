import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { investorEngagements, projectMessages, projects } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { mapDbMessageToApp } from "@/lib/db/mappers/message";
import { mapAppProjectToDbRow } from "@/lib/db/mappers/project";
import { fetchProjectByIdOrSlug, syncProjectRelations } from "@/lib/db/queries/projects";
import { fetchCaseManagerCandidates } from "@/lib/db/queries/users";
import { notifyUser } from "@/lib/email/notify";
import type { CorrectionField, InvestmentProject, MessageActionPayload } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

const CORRECTION_FIELDS: CorrectionField[] = ["investorOrganization", "ticketSize", "signatoryTitle"];

/**
 * POST /api/messages/[id]/action — staff resolve an interactive Action Card. Handles four card
 * types: `correction` and `schedule_call` (Approve/Decline, open to admin/super_admin/government
 * alike); `delete_request` — the governed engagement-deletion workflow, where a decision
 * (`approve` soft-deletes, `decline` clears the request, `request_briefing` keeps it open pending
 * a call) is **admin/super_admin only**; government sees the same card for transparency but has
 * no decision authority, matching the "notified but not a decision-maker" requirement;
 * `project_amendment_request` — an investor-owner's single-stage request is admin/super_admin
 * only; a **government**-filed request (Phase 8) is two-stage: the requester's own ministry_admin
 * decides first (`"open"` -> approve escalates to `"escalated"`, decline is terminal), then
 * admin/super_admin makes the final call (`"escalated"` -> resolved/declined) — Super Admin may
 * also override and decide an `"open"` government-filed card directly, per the confirmed
 * escalation-oversight model; and `ministry_association_request` (admin/super_admin only — a
 * ministry_admin/government reviewer's ask to add their own ministry as a secondary beneficiary
 * on someone else's project, see POST /api/projects/[id]/association-request).
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "ministry_admin"]);
    const { id } = await params;
    const body = (await request.json()) as { decision?: "approve" | "decline" | "request_briefing" };
    const decision = body.decision;
    if (decision !== "approve" && decision !== "decline" && decision !== "request_briefing") {
      return NextResponse.json({ error: "A decision (approve|decline|request_briefing) is required" }, { status: 400 });
    }

    const [card] = await db.select().from(projectMessages).where(eq(projectMessages.id, id)).limit(1);
    if (!card || card.kind !== "action" || !card.payload) {
      return NextResponse.json({ error: "Action card not found" }, { status: 404 });
    }
    const payload = card.payload as MessageActionPayload;
    if (payload.status === "resolved" || payload.status === "declined") {
      return NextResponse.json({ error: "This request has already been resolved" }, { status: 409 });
    }

    // Phase 8's stage-1 gate — a ministry_admin has decision authority on exactly one thing
    // platform-wide: an "open", government-filed amendment request from their own ministry. Every
    // other card type (and every other status on this one) stays out of their reach, so adding
    // ministry_admin to the role allowlist above can't accidentally hand them decision authority
    // on correction/schedule_call/delete_request/ministry_association_request cards too.
    const isGovFiledAmendment = payload.type === "project_amendment_request" && card.authorRole === "government";
    if (actor.role === "ministry_admin") {
      if (!isGovFiledAmendment || payload.status !== "open") {
        return NextResponse.json(
          { error: "Ministry Admins can only action a pending amendment request filed by their own ministry's government officials." },
          { status: 403 }
        );
      }
      if (!actor.ministryId || payload.requestingMinistryId !== actor.ministryId) {
        return NextResponse.json({ error: "You can only action requests filed by your own ministry." }, { status: 403 });
      }
    }
    // A plain admin must wait for that ministry-level decision first; Super Admin retains full
    // override/intervention authority at any stage, per the confirmed escalation-oversight model
    // ("all the actions are logged for the super admin to see and interact if necessary").
    if (isGovFiledAmendment && payload.status === "open" && actor.role === "admin") {
      return NextResponse.json(
        { error: "This request is still awaiting a decision from the requester's Ministry Admin. A Super Admin can override if needed." },
        { status: 403 }
      );
    }

    // Government is copied on every delete_request card for transparency and MAY ask for a
    // briefing before a decision is made (non-destructive), but has no approve/decline authority
    // — that adjudication stays ZIDA/Super Admin only, per the original ask.
    if (payload.type === "delete_request" && actor.role === "government" && decision !== "request_briefing") {
      return NextResponse.json(
        { error: "Government accounts can request a briefing but can't approve or decline a deletion request." },
        { status: 403 }
      );
    }
    if (payload.type === "project_amendment_request" && actor.role === "government") {
      return NextResponse.json(
        { error: "Government accounts can view amendment requests but can't approve or decline them." },
        { status: 403 }
      );
    }
    // ministry_association_request (Phase 6) is admin/super_admin-only — government is copied for
    // transparency (they may well be the one who filed it) but never decides it, same "notified but
    // not a decision-maker" convention as delete_request/project_amendment_request above.
    if (payload.type === "ministry_association_request" && actor.role === "government") {
      return NextResponse.json(
        { error: "Government accounts can view association requests but can't approve or decline them." },
        { status: 403 }
      );
    }

    if (decision === "request_briefing" && payload.type !== "delete_request") {
      return NextResponse.json({ error: "'Request a briefing' only applies to deletion requests." }, { status: 400 });
    }

    // Ministry Admin's stage-1 approve doesn't resolve the card — it escalates it to ZIDA Admin
    // for the final call (Phase 8). Handled as its own early-return branch since every other
    // decision path below assumes a terminal (resolved/declined) outcome. Decline, by contrast,
    // *is* terminal (a declined request never reaches ZIDA), so it falls through to the generic
    // path unchanged, just like the pre-existing project_amendment_request decline handling.
    if (actor.role === "ministry_admin" && decision === "approve") {
      const escalatedAt = new Date();
      const nextPayload: MessageActionPayload = {
        ...payload,
        status: "escalated",
        firstStageApprovedByName: actor.name,
        firstStageApprovedAt: escalatedAt.toISOString(),
      };
      const [updatedCard] = await db
        .update(projectMessages)
        .set({ payload: nextPayload })
        .where(eq(projectMessages.id, card.id))
        .returning();
      await db.insert(projectMessages).values({
        projectId: card.projectId,
        scope: card.scope,
        threadOwnerUserId: card.threadOwnerUserId,
        engagementId: card.engagementId,
        parentMessageId: card.id,
        authorUserId: actor.userId,
        authorName: actor.name,
        authorRole: actor.role,
        visibility: "investor_visible",
        body: `Ministry-level approval by ${actor.name} — escalated to ZIDA Admin for final action.`,
      });
      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "project.amendment_escalated",
        entityType: "project",
        entityId: card.projectId ?? card.id,
        metadata: { sourceMessageId: card.id },
      });
      const projectTitle = card.projectId ? (await fetchProjectByIdOrSlug(card.projectId))?.title : null;
      const zidaDesk = await fetchCaseManagerCandidates();
      for (const staff of zidaDesk) {
        void notifyUser({
          userId: staff.userId,
          prefKey: "newMessages",
          subject: `Amendment request escalated for final review: ${projectTitle ?? "a project"}`,
          bodyHtml: `<p>${actor.name} ministry-approved an amendment request on <strong>${projectTitle ?? "a project"}</strong>. It now needs a final ZIDA decision in the Admin Review Queue.</p>`,
        });
      }
      return NextResponse.json(mapDbMessageToApp(updatedCard), { status: 200 });
    }

    if (payload.type === "delete_request" && decision === "request_briefing") {
      const nextPayload: MessageActionPayload = { ...payload, status: "briefing_requested" };
      const [updatedCard] = await db
        .update(projectMessages)
        .set({ payload: nextPayload })
        .where(eq(projectMessages.id, card.id))
        .returning();
      await db.insert(projectMessages).values({
        projectId: card.projectId,
        scope: card.scope,
        threadOwnerUserId: card.threadOwnerUserId,
        engagementId: card.engagementId,
        parentMessageId: card.id,
        authorUserId: actor.userId,
        authorName: actor.name,
        authorRole: actor.role,
        visibility: "investor_visible",
        body: `${actor.name} requested a briefing before deciding on this deletion request. Use "Propose a Call" to schedule it.`,
      });
      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "engagement.delete_briefing_requested",
        entityType: "project_message",
        entityId: card.id,
        metadata: { engagementId: payload.engagementId ?? card.engagementId, projectId: card.projectId },
      });
      return NextResponse.json(mapDbMessageToApp(updatedCard), { status: 200 });
    }

    const now = new Date();
    let appliedNote = "";

    // delete_request: approve permanently (soft-)deletes the engagement; decline clears the
    // pending request so the investor can try again later with a new justification.
    if (payload.type === "delete_request") {
      const engagementId = (payload.engagementId ?? card.engagementId)!;
      const [engagement] = await db
        .select()
        .from(investorEngagements)
        .where(eq(investorEngagements.id, engagementId))
        .limit(1);
      if (!engagement) return NextResponse.json({ error: "Engagement not found" }, { status: 404 });

      if (decision === "approve") {
        await db
          .update(investorEngagements)
          .set({ deletedAt: now, deleteRequestStatus: "approved", updatedAt: now })
          .where(eq(investorEngagements.id, engagementId));
      } else {
        await db
          .update(investorEngagements)
          .set({ deleteRequestStatus: "declined", updatedAt: now })
          .where(eq(investorEngagements.id, engagementId));
      }

      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: decision === "approve" ? "engagement.delete_approved" : "engagement.delete_declined",
        entityType: "engagement",
        entityId: engagementId,
        metadata: { projectId: engagement.projectId, investorName: engagement.investorName, reason: payload.reason ?? null },
      });
    }

    // Approve + a concrete field proposal → apply the governed amendment to the engagement.
    if (
      decision === "approve" &&
      payload.field &&
      CORRECTION_FIELDS.includes(payload.field) &&
      payload.proposedValue != null &&
      (payload.engagementId ?? card.engagementId)
    ) {
      const engagementId = (payload.engagementId ?? card.engagementId)!;
      const [engagement] = await db
        .select()
        .from(investorEngagements)
        .where(eq(investorEngagements.id, engagementId))
        .limit(1);
      if (!engagement) {
        return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
      }
      await db
        .update(investorEngagements)
        .set({ [payload.field]: payload.proposedValue, updatedAt: now })
        .where(eq(investorEngagements.id, engagementId));
      appliedNote = ` The ${payload.fieldLabel ?? payload.field} was updated to "${payload.proposedValue}".`;

      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "engagement.correction_applied",
        entityType: "engagement",
        entityId: engagementId,
        metadata: {
          projectId: engagement.projectId,
          field: payload.field,
          from: payload.currentValue ?? engagement[payload.field as keyof typeof engagement] ?? null,
          to: payload.proposedValue,
          sourceMessageId: card.id,
        },
      });
    }

    // Approve a project amendment request → apply the proposed field changes directly onto the
    // live project row (same ownership+field checks were already enforced when the card was
    // filed — see POST /api/projects/[id]/amendment-request's AMENDABLE_FIELDS allowlist).
    if (payload.type === "project_amendment_request" && decision === "approve" && payload.proposedChanges) {
      const project = card.projectId ? await fetchProjectByIdOrSlug(card.projectId) : null;
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      const merged: InvestmentProject = { ...project, ...payload.proposedChanges, id: project.id };
      const row = mapAppProjectToDbRow(merged);
      await db
        .update(projects)
        .set({ ...row, updatedAt: now })
        .where(eq(projects.id, project.id));

      appliedNote = ` Applied changes to: ${Object.keys(payload.proposedChanges).join(", ")}.`;

      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "project.amendment_applied",
        entityType: "project",
        entityId: project.id,
        metadata: { title: project.title, fields: Object.keys(payload.proposedChanges), sourceMessageId: card.id },
      });
    }
    if (payload.type === "project_amendment_request" && decision === "decline" && card.projectId) {
      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "project.amendment_declined",
        entityType: "project",
        entityId: card.projectId,
        metadata: { sourceMessageId: card.id },
      });
    }

    // Approve a ministry association request → add the requesting ministry as a secondary
    // beneficiary on the live project (idempotent — a no-op if it's already listed, e.g. a second
    // request slipped in before this one resolved).
    if (payload.type === "ministry_association_request" && decision === "approve" && payload.requestingMinistryId && card.projectId) {
      const project = await fetchProjectByIdOrSlug(card.projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      const current = project.secondaryBeneficiaryMinistryIds ?? [];
      if (!current.includes(payload.requestingMinistryId)) {
        await syncProjectRelations(project.id, {
          secondaryBeneficiaryMinistryIds: [...current, payload.requestingMinistryId],
        });
      }
      appliedNote = ` ${payload.requestingMinistryName ?? "The requesting ministry"} was added as a secondary beneficiary.`;

      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "project.association_approved",
        entityType: "project",
        entityId: project.id,
        metadata: { title: project.title, requestingMinistryId: payload.requestingMinistryId, sourceMessageId: card.id },
      });
    }
    if (payload.type === "ministry_association_request" && decision === "decline" && card.projectId) {
      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "project.association_declined",
        entityType: "project",
        entityId: card.projectId,
        metadata: { requestingMinistryId: payload.requestingMinistryId ?? null, sourceMessageId: card.id },
      });
    }

    // Stamp the card resolved/declined.
    const nextPayload: MessageActionPayload = {
      ...payload,
      status: decision === "approve" ? "resolved" : "declined",
      resolvedByName: actor.name,
      resolvedAt: now.toISOString(),
    };
    const [updatedCard] = await db
      .update(projectMessages)
      .set({ payload: nextPayload })
      .where(eq(projectMessages.id, card.id))
      .returning();

    // Post an investor-visible system reply into the same thread for a clear trail. Wording adapts
    // to the card type.
    const isCall = payload.type === "schedule_call";
    const isDelete = payload.type === "delete_request";
    const isAmendment = payload.type === "project_amendment_request";
    const isAssociation = payload.type === "ministry_association_request";
    const replyBody =
      decision === "approve"
        ? isDelete
          ? `Deletion approved by ${actor.name}. The engagement has been removed from the pipeline.`
          : isCall
            ? `Call proposal accepted by ${actor.name}.`
            : isAmendment
              ? `Amendment request approved by ${actor.name}.${appliedNote}`
              : isAssociation
                ? `Association request approved by ${actor.name}.${appliedNote}`
                : `Correction approved by ${actor.name}.${appliedNote}`
        : isDelete
          ? `Deletion request declined by ${actor.name}. The engagement remains in the pipeline.`
          : isCall
            ? `Call proposal declined by ${actor.name}.`
            : isAmendment
              ? `Amendment request declined by ${actor.name}.`
              : isAssociation
                ? `Association request declined by ${actor.name}.`
                : `Correction request declined by ${actor.name}.`;
    await db.insert(projectMessages).values({
      projectId: card.projectId,
      scope: card.scope,
      threadOwnerUserId: card.threadOwnerUserId,
      engagementId: card.engagementId,
      parentMessageId: card.id,
      authorUserId: actor.userId,
      authorName: actor.name,
      authorRole: actor.role,
      visibility: "investor_visible",
      body: replyBody,
    });

    if (!isDelete && !isAmendment && !isAssociation) {
      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: decision === "approve" ? "engagement.correction_approved" : "engagement.correction_declined",
        entityType: "project_message",
        entityId: card.id,
        metadata: {
          engagementId: payload.engagementId ?? card.engagementId,
          projectId: card.projectId,
        },
      });
    }

    return NextResponse.json(mapDbMessageToApp(updatedCard), { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
