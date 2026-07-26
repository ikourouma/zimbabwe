import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { investorEngagements, projectMessages } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { mapDbMessageToApp } from "@/lib/db/mappers/message";
import type { MessageActionPayload } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/engagements/[id]/schedule-call — proposes a call/meeting as an interactive Action Card
 * inside the engagement's Communication Hub thread. Mirrors the correction-card pattern: the
 * counterparty Accepts or Declines it via POST /api/messages/[id]/action, which stamps the card and
 * posts a system reply. Either party (investor or staff) can propose.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified"]);
    const { id } = await params;
    const body = (await request.json()) as { proposedTime?: string; callMode?: string; note?: string };

    const proposedTime = (body.proposedTime ?? "").trim();
    if (!proposedTime) {
      return NextResponse.json({ error: "A proposed date/time is required." }, { status: 400 });
    }

    const [engagement] = await db
      .select()
      .from(investorEngagements)
      .where(eq(investorEngagements.id, id))
      .limit(1);
    if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (actor.role === "qualified" && engagement.userId !== actor.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const callMode = (body.callMode ?? "").trim() || undefined;
    const note = (body.note ?? "").trim();
    const when = new Date(proposedTime);
    const whenLabel = Number.isNaN(when.getTime()) ? proposedTime : when.toLocaleString();

    const payload: MessageActionPayload = {
      type: "schedule_call",
      engagementId: engagement.id,
      proposedTime,
      status: "open",
      ...(callMode ? { callMode } : {}),
      ...(note ? { reason: note } : {}),
    };
    const summary = `Call proposed for ${whenLabel}${callMode ? ` (${callMode})` : ""}.${note ? ` ${note}` : ""}`;

    const [inserted] = await db
      .insert(projectMessages)
      .values({
        projectId: engagement.projectId,
        engagementId: engagement.id,
        authorUserId: actor.userId,
        authorName: actor.name,
        authorRole: actor.role,
        visibility: "investor_visible",
        kind: "action",
        payload,
        body: summary,
      })
      .returning();

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "engagement.call_proposed",
      entityType: "engagement",
      entityId: engagement.id,
      metadata: { projectId: engagement.projectId, proposedTime, callMode: callMode ?? null },
    });

    return NextResponse.json(mapDbMessageToApp(inserted), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
