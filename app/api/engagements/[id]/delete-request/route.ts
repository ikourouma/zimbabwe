import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { investorEngagements, projectMessages, projects } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { fetchGovernmentOfficialsForMinistry } from "@/lib/db/queries/users";
import { mapDbEngagementToApp } from "@/lib/db/mappers/engagement";
import type { MessageActionPayload } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

// "Comprehensive justification" per the original ask — not a one-liner. Mirrors the correction
// request's free-text reason, just with a firmer floor given the credibility stakes.
const MIN_JUSTIFICATION_LENGTH = 40;

/**
 * POST /api/engagements/[id]/delete-request — the governed path for deleting an *approved*
 * engagement (the record ZIDA/government rely on as a company's credibility signal). Callable by
 * the owning investor OR staff (admin/super_admin) on the investor's behalf. Requires a
 * comprehensive written justification, posts an interactive Action Card into the engagement
 * thread naming every notified party — the ZIDA deal team, Super Admin, AND the designated
 * government official(s) for the project's beneficiary ministry (looked up via
 * profiles.ministryId), so the transparency step reads as deliberate rather than incidental (see
 * the `government` request_briefing carve-out in POST /api/messages/[id]/action) — and flags the
 * row `pending` so the self-service DELETE route (see [id]/route.ts) refuses direct deletion.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["qualified", "admin", "super_admin"]);
    const { id } = await params;
    const body = (await request.json()) as { reason?: string };
    const reason = (body.reason ?? "").trim();
    if (reason.length < MIN_JUSTIFICATION_LENGTH) {
      return NextResponse.json(
        { error: `A comprehensive justification (at least ${MIN_JUSTIFICATION_LENGTH} characters) is required to request deletion.` },
        { status: 400 }
      );
    }

    const [engagement] = await db.select().from(investorEngagements).where(eq(investorEngagements.id, id)).limit(1);
    if (!engagement || engagement.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (actor.role === "qualified" && engagement.userId !== actor.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (engagement.status !== "approved") {
      return NextResponse.json(
        { error: "This engagement isn't approved — it can be deleted directly instead." },
        { status: 400 }
      );
    }
    if (engagement.deleteRequestStatus === "pending") {
      return NextResponse.json({ error: "A deletion request is already pending review." }, { status: 409 });
    }

    const [project] = await db
      .select({ ministryId: projects.primaryBeneficiaryMinistryId })
      .from(projects)
      .where(eq(projects.id, engagement.projectId))
      .limit(1);
    const officials = project?.ministryId ? await fetchGovernmentOfficialsForMinistry(project.ministryId) : [];
    const notifiedLine =
      officials.length > 0
        ? `Notified: ZIDA Deal Team, Platform Admin, and ${officials.map((o) => o.name).join(", ")} (beneficiary ministry).`
        : "Notified: ZIDA Deal Team and Platform Admin.";

    const now = new Date();
    const [updated] = await db
      .update(investorEngagements)
      .set({ deleteRequestedAt: now, deleteRequestReason: reason, deleteRequestStatus: "pending", updatedAt: now })
      .where(eq(investorEngagements.id, id))
      .returning();

    const payload: MessageActionPayload = {
      type: "delete_request",
      engagementId: engagement.id,
      reason,
      status: "open",
    };
    await db.insert(projectMessages).values({
      projectId: engagement.projectId,
      engagementId: engagement.id,
      authorUserId: actor.userId,
      authorName: actor.name,
      authorRole: actor.role,
      visibility: "investor_visible",
      kind: "action",
      payload,
      body: `${actor.name} requested deletion of this approved engagement. Justification: ${reason} ${notifiedLine}`,
    });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "engagement.delete_requested",
      entityType: "engagement",
      entityId: engagement.id,
      metadata: {
        investorName: engagement.investorName,
        projectId: engagement.projectId,
        reason,
        notifiedGovernmentOfficials: officials.map((o) => ({ userId: o.userId, name: o.name })),
      },
    });

    return NextResponse.json(mapDbEngagementToApp(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
