import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser, requireRole } from "@/lib/auth/session";
import { accessLevelForRole, sanitizeProjectForAccess } from "@/lib/entitlements/visibility";
import { mapAppProjectToDbRow } from "@/lib/db/mappers/project";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import {
  fetchAllProjects,
  fetchProjectByIdOrSlug,
  syncProjectRelations,
} from "@/lib/db/queries/projects";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { canTransition } from "@/lib/governance/project-workflow";
import { roleToWorkflowRole } from "@/lib/auth/role-map";
import type { InvestmentProject, ProjectStatus } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Mask data-room-only financials for sub-qualified callers (see sanitizeProjectForAccess).
    const user = await getCurrentUser();
    const level = accessLevelForRole(user?.role ?? null);
    return NextResponse.json(sanitizeProjectForAccess(project, level));
  } catch (error) {
    return handleRouteError(error);
  }
}

// Timestamp/attribution fields the client may request a bump for, keyed by the target status —
// stamped from the *server-side session* (never trusted from the request body) so the "ZIDA
// Reviewer"/"ZIDA Admin" hardcoded-actor gap the dashboard audit found can't recur.
const ATTRIBUTION_BY_STATUS: Partial<Record<ProjectStatus, { byField: keyof InvestmentProject; atField: keyof InvestmentProject }>> = {
  submitted_for_review: { byField: "submittedBy", atField: "submittedAt" },
  under_review: { byField: "reviewedBy", atField: "reviewedAt" },
  changes_requested: { byField: "reviewedBy", atField: "reviewedAt" },
  approved: { byField: "approvedBy", atField: "approvedAt" },
  published: { byField: "publishedBy", atField: "publishedAt" },
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await requireRole(["admin", "super_admin", "government"]);
    const { id } = await params;
    const existing = await fetchProjectByIdOrSlug(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await request.json()) as Partial<InvestmentProject> & { reason?: string };
    const editReason = body.reason;
    const statusChanged = Boolean(body.projectStatus && body.projectStatus !== existing.projectStatus);

    // Which non-status, non-bookkeeping fields the caller actually changed — drives the
    // `project.updated` audit diff so field edits are no longer silent in the trail.
    const IGNORED_KEYS = new Set(["reason", "updatedAt", "projectStatus", "id"]);
    const changedFields = Object.keys(body).filter((key) => {
      if (IGNORED_KEYS.has(key)) return false;
      const nextVal = (body as Record<string, unknown>)[key];
      const prevVal = (existing as unknown as Record<string, unknown>)[key];
      return JSON.stringify(nextVal) !== JSON.stringify(prevVal);
    });

    if (statusChanged) {
      const workflowRole = roleToWorkflowRole(user.role);
      if (!workflowRole || !canTransition(existing.projectStatus, body.projectStatus as ProjectStatus, workflowRole)) {
        if (user.role !== "super_admin") {
          return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
        }
      }
    }

    const merged: InvestmentProject = { ...existing, ...body, id: existing.id };
    if (statusChanged) {
      const attribution = ATTRIBUTION_BY_STATUS[body.projectStatus as ProjectStatus];
      const now = new Date().toISOString();
      if (attribution) {
        (merged[attribution.byField] as unknown as string) = user.name;
        (merged[attribution.atField] as unknown as string) = now;
      }
    }

    const row = mapAppProjectToDbRow(merged);
    await db
      .update(projects)
      .set({ ...row, updatedAt: new Date() })
      .where(eq(projects.id, existing.id));

    await syncProjectRelations(existing.id, body);

    if (statusChanged) {
      await logAuditEvent({
        actorUserId: user.userId,
        actorName: user.name,
        action: "project.status_changed",
        entityType: "project",
        entityId: existing.id,
        metadata: {
          from: existing.projectStatus,
          to: merged.projectStatus,
          title: existing.title,
          notes: body.reviewerNotes ?? null,
        },
      });
    }

    // Log field-only edits (distinct from status transitions) so admin corrections are auditable.
    if (changedFields.length > 0) {
      await logAuditEvent({
        actorUserId: user.userId,
        actorName: user.name,
        action: "project.updated",
        entityType: "project",
        entityId: existing.id,
        metadata: { changedFields, reason: editReason ?? null, title: existing.title },
      });
    }

    const all = await fetchAllProjects();
    const updated = all.find((p) => p.id === existing.id);
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
