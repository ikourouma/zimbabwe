import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { investorEngagements, projectMessages } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { mapDbMessageToApp } from "@/lib/db/mappers/message";
import type { CorrectionField, MessageActionPayload } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

const CORRECTION_FIELDS: CorrectionField[] = ["investorOrganization", "ticketSize", "signatoryTitle"];

/**
 * POST /api/messages/[id]/action — staff resolve an interactive Action Card. Handles three card
 * types: `correction` and `schedule_call` (Approve/Decline, open to admin/super_admin/government
 * alike), and `delete_request` — the governed engagement-deletion workflow, where a decision
 * (`approve` soft-deletes, `decline` clears the request, `request_briefing` keeps it open pending
 * a call) is **admin/super_admin only**; government sees the same card for transparency but has
 * no decision authority, matching the "notified but not a decision-maker" requirement.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government"]);
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

    // Government is copied on every delete_request card for transparency and MAY ask for a
    // briefing before a decision is made (non-destructive), but has no approve/decline authority
    // — that adjudication stays ZIDA/Super Admin only, per the original ask.
    if (payload.type === "delete_request" && actor.role === "government" && decision !== "request_briefing") {
      return NextResponse.json(
        { error: "Government accounts can request a briefing but can't approve or decline a deletion request." },
        { status: 403 }
      );
    }

    if (decision === "request_briefing" && payload.type !== "delete_request") {
      return NextResponse.json({ error: "'Request a briefing' only applies to deletion requests." }, { status: 400 });
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
    const replyBody =
      decision === "approve"
        ? isDelete
          ? `Deletion approved by ${actor.name}. The engagement has been removed from the pipeline.`
          : isCall
            ? `Call proposal accepted by ${actor.name}.`
            : `Correction approved by ${actor.name}.${appliedNote}`
        : isDelete
          ? `Deletion request declined by ${actor.name}. The engagement remains in the pipeline.`
          : isCall
            ? `Call proposal declined by ${actor.name}.`
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

    if (!isDelete) {
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
