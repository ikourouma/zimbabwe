import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { db } from "@/lib/db/client";
import { projectDocuments } from "@/lib/db/schema";

type RouteParams = { params: Promise<{ id: string; docId: string }> };

/**
 * DELETE /api/projects/[id]/documents/[docId] (admin/super_admin/ministry_admin) — removes the DB
 * row only; the R2 object is left in place, consistent with the soft-delete convention used
 * elsewhere (never a destructive storage-provider call from a single admin action).
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "ministry_admin"]);
    const { id, docId } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (actor.role === "ministry_admin") {
      if (!actor.ministryId || !projectMatchesMinistry(project, actor.ministryId)) {
        return NextResponse.json({ error: "You do not have permission to remove documents from this project." }, { status: 403 });
      }
    }

    const [doc] = await db
      .select()
      .from(projectDocuments)
      .where(and(eq(projectDocuments.id, docId), eq(projectDocuments.projectId, project.id)))
      .limit(1);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.delete(projectDocuments).where(eq(projectDocuments.id, docId));

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "project.document_removed",
      entityType: "project",
      entityId: project.id,
      metadata: { documentId: docId, title: doc.title },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
