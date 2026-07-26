import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { mapAppProjectToDbRow } from "@/lib/db/mappers/project";
import { db } from "@/lib/db/client";
import { auditLogs, projects } from "@/lib/db/schema";
import { fetchAllProjects, fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { logAuditEvent } from "@/lib/db/queries/audit";
import type { InvestmentProject, ProjectStatus, VisibilityLevel } from "@/lib/types";

interface RevertBody {
  auditLogId: string;
}

/**
 * One-click rollback of a Publishing Override: reads the original override's `metadata.from`
 * snapshot and re-applies it, restoring the project to its exact pre-override status/visibility.
 * Logged as `project.override_reverted` referencing the original entry.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireRole(["super_admin"]);
    const { auditLogId } = (await request.json()) as RevertBody;
    if (!auditLogId) return NextResponse.json({ error: "auditLogId is required" }, { status: 400 });

    const [entry] = await db.select().from(auditLogs).where(eq(auditLogs.id, auditLogId)).limit(1);
    if (!entry || entry.action !== "project.override_applied") {
      return NextResponse.json({ error: "Override entry not found" }, { status: 404 });
    }

    const meta = (entry.metadata as Record<string, unknown>) ?? {};
    const from = meta.from as { status: ProjectStatus; visibility: VisibilityLevel } | undefined;
    if (!from?.status || !from?.visibility) {
      return NextResponse.json({ error: "Override entry has no restorable snapshot" }, { status: 400 });
    }

    const existing = await fetchProjectByIdOrSlug(entry.entityId);
    if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const current = { status: existing.projectStatus, visibility: existing.visibilityLevel };
    const merged: InvestmentProject = {
      ...existing,
      projectStatus: from.status,
      visibilityLevel: from.visibility,
      id: existing.id,
    };

    const row = mapAppProjectToDbRow(merged);
    await db.update(projects).set({ ...row, updatedAt: new Date() }).where(eq(projects.id, existing.id));

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "project.override_reverted",
      entityType: "project",
      entityId: existing.id,
      metadata: { from: current, to: from, revertedFromAuditLogId: auditLogId, title: existing.title },
    });

    const all = await fetchAllProjects();
    return NextResponse.json(all.find((p) => p.id === existing.id));
  } catch (error) {
    return handleRouteError(error);
  }
}
