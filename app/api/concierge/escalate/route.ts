import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { projectMessages } from "@/lib/db/schema";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { logAuditEvent } from "@/lib/db/queries/audit";

/**
 * POST /api/concierge/escalate — staff re-scope a project-less General Concierge thread onto a
 * specific opportunity ("Link to Opportunity"). Every concierge message owned by the investor is
 * moved to the project's general question thread (project_id set, scope='project'); threadOwnerUserId
 * is preserved for provenance. This closes the cold-start → live-deal handoff.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government"]);
    const body = (await request.json()) as { ownerUserId?: string; projectId?: string };
    if (!body.ownerUserId || !body.projectId) {
      return NextResponse.json({ error: "ownerUserId and projectId are required" }, { status: 400 });
    }

    const project = await fetchProjectByIdOrSlug(body.projectId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const moved = await db
      .update(projectMessages)
      .set({ projectId: project.id, scope: "project" })
      .where(
        and(eq(projectMessages.scope, "concierge"), eq(projectMessages.threadOwnerUserId, body.ownerUserId))
      )
      .returning({ id: projectMessages.id });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "concierge.escalated",
      entityType: "project",
      entityId: project.id,
      metadata: { ownerUserId: body.ownerUserId, movedMessages: moved.length },
    });

    return NextResponse.json({ ok: true, projectId: project.id, moved: moved.length });
  } catch (error) {
    return handleRouteError(error);
  }
}
