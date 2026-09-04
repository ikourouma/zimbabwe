import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { ministries, projectMessages } from "@/lib/db/schema";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { fetchCaseManagerCandidates } from "@/lib/db/queries/users";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { notifyUser } from "@/lib/email/notify";
import { mapDbMessageToApp } from "@/lib/db/mappers/message";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import type { MessageActionPayload } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/projects/[id]/association-request — "Request Association" (Platform Feedback Batch v4,
 * Phase 6): a `ministry_admin` or `government` reviewer whose own ministry is a stranger to this
 * project asks for their ministry to be added as a secondary beneficiary. Mirrors
 * POST /api/projects/[id]/amendment-request: the project row is never mutated here — this only
 * posts an interactive Action Card (kind='action') that admin/super_admin later adjudicate via
 * POST /api/messages/[id]/action.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["ministry_admin", "government"]);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };

    if (!actor.ministryId) {
      return NextResponse.json({ error: "Your account is not linked to a ministry." }, { status: 403 });
    }
    if (!body.reason || !body.reason.trim()) {
      return NextResponse.json({ error: "A reason is required to request association." }, { status: 400 });
    }

    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (projectMatchesMinistry(project, actor.ministryId)) {
      return NextResponse.json(
        { error: "Your ministry is already a beneficiary on this project." },
        { status: 400 }
      );
    }

    const existingOpen = await db.select().from(projectMessages).where(eq(projectMessages.projectId, project.id));
    const alreadyPending = existingOpen.some((r) => {
      if (r.kind !== "action") return false;
      const p = r.payload as MessageActionPayload | null;
      return p?.type === "ministry_association_request" && p.status === "open" && p.requestingMinistryId === actor.ministryId;
    });
    if (alreadyPending) {
      return NextResponse.json(
        { error: "Your ministry already has a pending association request on this project." },
        { status: 409 }
      );
    }

    const [ministry] = await db.select().from(ministries).where(eq(ministries.id, actor.ministryId)).limit(1);
    const reason = body.reason.trim();

    const payload: MessageActionPayload = {
      type: "ministry_association_request",
      reason,
      requestingMinistryId: actor.ministryId,
      requestingMinistryName: ministry?.name,
      status: "open",
    };

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
        body: `${ministry?.name ?? "A ministry"} requested association with this project as a secondary beneficiary. ${reason}`,
      })
      .returning();

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "project.association_requested",
      entityType: "project",
      entityId: project.id,
      metadata: { title: project.title, reason, requestingMinistryId: actor.ministryId },
    });

    const zidaDesk = await fetchCaseManagerCandidates();
    for (const staff of zidaDesk) {
      void notifyUser({
        userId: staff.userId,
        prefKey: "newMessages",
        subject: `Association request awaiting review: ${project.title}`,
        bodyHtml: `<p>${ministry?.name ?? actor.name} requested association with <strong>${project.title}</strong> as a secondary beneficiary. Review it in the Admin Review Queue.</p>`,
      });
    }

    return NextResponse.json(mapDbMessageToApp(inserted), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

// Same rationale as GET /api/projects/[id]/amendment-request — lets the "Request Association"
// button know whether the viewer's own ministry already has an open request, without wiring a
// whole new list endpoint.
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["ministry_admin", "government", "admin", "super_admin"]);
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const rows = await db.select().from(projectMessages).where(eq(projectMessages.projectId, project.id));
    const cards = rows
      .filter((r) => r.kind === "action" && (r.payload as MessageActionPayload | null)?.type === "ministry_association_request")
      .map((r) => mapDbMessageToApp(r));
    return NextResponse.json(cards);
  } catch (error) {
    return handleRouteError(error);
  }
}
