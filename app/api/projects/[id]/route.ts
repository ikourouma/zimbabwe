import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser, requireRole } from "@/lib/auth/session";
import { accessLevelForRole, sanitizeProjectForAccess } from "@/lib/entitlements/visibility";
import { loadEntitlementContext } from "@/lib/entitlements/load";
import { mapAppProjectToDbRow } from "@/lib/db/mappers/project";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import {
  fetchAllProjects,
  fetchProjectByIdOrSlug,
  syncProjectRelations,
} from "@/lib/db/queries/projects";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { resolveOrCreatePendingSubsector } from "@/lib/db/queries/taxonomies";
import { fetchCaseManagerCandidates, fetchGovernmentOfficialsForMinistry } from "@/lib/db/queries/users";
import { notifyUser } from "@/lib/email/notify";
import { canTransition, validateRequiredFields } from "@/lib/governance/project-workflow";
import { resolveProjectWorkflowRole } from "@/lib/auth/project-workflow-role";
import { isVisibleToMinistryAdmin } from "@/lib/entitlements/ministry-scope";
import type { InvestmentProject, ProjectStatus } from "@/lib/types";
import type { WorkflowRole } from "@/lib/governance/project-workflow";

// Stages an investor-owner ("creator" workflow role) may still freely edit their own proposal in
// — once it moves to submitted_for_review or beyond, further changes must go through the Phase 5
// Amendment Request flow instead of a direct PATCH.
const CREATOR_EDITABLE_STAGES: ProjectStatus[] = ["draft", "changes_requested"];

// Server-controlled bookkeeping/governance fields a creator can never set directly via PATCH body
// — status transitions (handled below) are the only way any of these should change for their own
// proposal; stripping them here means a crafted request body simply can't smuggle in e.g. a
// visibilityLevel escalation or a self-attributed reviewerNotes.
const CREATOR_STRIPPED_FIELDS: (keyof InvestmentProject)[] = [
  "visibilityLevel",
  "dataVerificationStatus",
  "reviewerNotes",
  "assignedStaffUserId",
  "assignedReviewingOfficerUserId",
  "createdBy",
  "investorSubmitted",
  "submittedBy",
  "reviewedBy",
  "approvedBy",
  "publishedBy",
  "submittedAt",
  "reviewedAt",
  "approvedAt",
  "publishedAt",
];

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const user = await getCurrentUser();
    const isStaffViewer = user?.role === "admin" || user?.role === "super_admin" || user?.role === "government";
    // Same "an investor's own unpublished proposal is private, not institutional data" rule as
    // GET /api/projects — see that route for the full rationale. A validated org teammate
    // (Phase 5) assigned to this specific proposal counts as a viewer here too.
    const isAssignedTeammate = Boolean(user?.userId && project.teamAssignedUserIds?.includes(user.userId));
    // ministry_admin (Phase 6): staff-like visibility for their own ministry's submitted proposals
    // only — see lib/entitlements/ministry-scope.ts and GET /api/projects for the shared rationale.
    const isMinistryScopedViewer =
      user?.role === "ministry_admin" && !!user.ministryId && isVisibleToMinistryAdmin(project, user.ministryId);
    if (
      project.investorSubmitted &&
      project.projectStatus !== "published" &&
      !isStaffViewer &&
      project.createdBy !== user?.userId &&
      !isAssignedTeammate &&
      !isMinistryScopedViewer
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Mask data-room-only financials for sub-qualified callers (see sanitizeProjectForAccess).
    const level = accessLevelForRole(user?.role ?? null);
    const entitlements = await loadEntitlementContext();
    return NextResponse.json(sanitizeProjectForAccess(project, level, entitlements.matrix, entitlements.costStructureHidden));
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
    const user = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const { id } = await params;
    const existing = await fetchProjectByIdOrSlug(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Per-project workflow role resolution (qualified-creator + ministry_admin-reviewer
    // exceptions) — see resolveProjectWorkflowRole for the full rationale. Every other role falls
    // through to the existing shared roleToWorkflowRole() unchanged.
    const workflowRole: WorkflowRole | null = resolveProjectWorkflowRole(user, existing);

    if (user.role === "ministry_admin" && workflowRole === null) {
      // Not this ministry_admin's own ministry — 403, never silently fall back to read-only, so a
      // crafted PATCH against another ministry's project fails loudly instead of no-op'ing.
      return NextResponse.json({ error: "You can only manage your own ministry's projects." }, { status: 403 });
    }

    if (workflowRole === "creator") {
      // A validated org teammate assigned to this specific proposal (Phase 5) gets the same
      // "creator" edit rights as the actual owner — the whole point of the co-editor grant —
      // while the audit trail below still attributes the edit to their own identity (user.userId/
      // user.name), never the owner's, since it's stamped from the session, not the project row.
      const isAssignedTeammate = existing.teamAssignedUserIds?.includes(user.userId) ?? false;
      if (existing.createdBy !== user.userId && !isAssignedTeammate) {
        return NextResponse.json({ error: "You do not have permission to edit this proposal." }, { status: 403 });
      }
      if (!CREATOR_EDITABLE_STAGES.includes(existing.projectStatus)) {
        return NextResponse.json(
          { error: "This proposal is locked — file an Amendment Request to change it further." },
          { status: 403 }
        );
      }
    }

    const body = (await request.json()) as Partial<InvestmentProject> & { reason?: string };
    if (workflowRole === "creator") {
      for (const field of CREATOR_STRIPPED_FIELDS) delete body[field];
    }
    // ministry_admin gets "reviewer"-tier workflow authority on their own ministry's projects
    // (Phase 3; re-tiered from "approver" in Phase 7 — see resolveProjectWorkflowRole) but Case
    // Manager assignment stays admin/super_admin-only regardless (Phase 2's explicit scoping) —
    // strip it here rather than adding a third CREATOR_STRIPPED_FIELDS-style list just for one field.
    if (user.role === "ministry_admin") {
      delete body.assignedStaffUserId;
    }

    // Assigned Reviewing Officer (Phase 6) — settable by the project's own ministry_admin (already
    // scope-gated to their own ministry by the workflowRole===null 403 above) or admin/super_admin
    // only; a `government` reviewer (or anyone else reaching this route) can never self-assign or
    // reassign this, so it's stripped for every other role, same convention as CREATOR_STRIPPED_FIELDS.
    if (user.role !== "admin" && user.role !== "super_admin" && user.role !== "ministry_admin") {
      delete body.assignedReviewingOfficerUserId;
    }

    // Case Manager override (Team Ministry Traceability Batch, Phase 2, item 6) — admin/super_admin
    // only (see CREATOR_STRIPPED_FIELDS above); validate against the same active admin/super_admin
    // pool the picker itself is built from, so a stale/typo'd userId can't be smuggled in.
    if (body.assignedStaffUserId !== undefined && body.assignedStaffUserId !== existing.assignedStaffUserId) {
      if (body.assignedStaffUserId) {
        const candidates = await fetchCaseManagerCandidates();
        if (!candidates.some((c) => c.userId === body.assignedStaffUserId)) {
          return NextResponse.json({ error: "That user is not an active admin/super_admin account." }, { status: 400 });
        }
      }
      await logAuditEvent({
        actorUserId: user.userId,
        actorName: user.name,
        action: "project.case_manager_assigned",
        entityType: "project",
        entityId: existing.id,
        metadata: { from: existing.assignedStaffUserId ?? null, to: body.assignedStaffUserId ?? null, title: existing.title },
      });

      // Notification hook (Phase 8, item 1): the newly-designated per-project Case Manager finds
      // out this specific project now routes through them (overriding the ministry default).
      if (body.assignedStaffUserId) {
        void notifyUser({
          userId: body.assignedStaffUserId,
          prefKey: "teamActivity",
          subject: "You've been designated Case Manager for a project",
          bodyHtml: `<p>You're now the ZIDA Case Manager for <strong>${existing.title}</strong>.</p>`,
        });
      }
    }

    // Assigned Reviewing Officer (Phase 6) — validate against the project's own primary ministry's
    // active government pool, same candidate-pool-revalidation convention as Case Manager above.
    if (
      body.assignedReviewingOfficerUserId !== undefined &&
      body.assignedReviewingOfficerUserId !== existing.assignedReviewingOfficerUserId
    ) {
      if (body.assignedReviewingOfficerUserId) {
        const candidates = await fetchGovernmentOfficialsForMinistry(existing.primaryBeneficiaryMinistryId);
        if (!candidates.some((c) => c.userId === body.assignedReviewingOfficerUserId)) {
          return NextResponse.json(
            { error: "That user is not an active government reviewer in this project's ministry." },
            { status: 400 }
          );
        }
      }
      await logAuditEvent({
        actorUserId: user.userId,
        actorName: user.name,
        action: "project.reviewing_officer_assigned",
        entityType: "project",
        entityId: existing.id,
        metadata: {
          from: existing.assignedReviewingOfficerUserId ?? null,
          to: body.assignedReviewingOfficerUserId ?? null,
          title: existing.title,
        },
      });

      if (body.assignedReviewingOfficerUserId) {
        void notifyUser({
          userId: body.assignedReviewingOfficerUserId,
          prefKey: "teamActivity",
          subject: "You've been designated Assigned Reviewing Officer for a project",
          bodyHtml: `<p>You're now the Assigned Reviewing Officer for <strong>${existing.title}</strong>.</p>`,
        });
      }
    }

    // "Other (not listed)" subsector (item 7) — same pending-taxonomy resolution as the create path.
    if (body.subsectorOther?.trim()) {
      const sectorId = body.sectorId ?? existing.sectorId;
      body.subsectorId = await resolveOrCreatePendingSubsector(sectorId, body.subsectorOther);
    }
    delete body.subsectorOther;

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
      if (!workflowRole || !canTransition(existing.projectStatus, body.projectStatus as ProjectStatus, workflowRole)) {
        if (user.role !== "super_admin") {
          return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
        }
      }
      // A creator submitting their proposal for review must meet the same bar as every other
      // project, checked against the full merged record (not just this request's partial body) so
      // fields saved on an earlier autosave still count.
      if (workflowRole === "creator" && body.projectStatus === "submitted_for_review") {
        const { valid, missing } = validateRequiredFields({ ...existing, ...body });
        if (!valid) {
          return NextResponse.json(
            { error: `Cannot submit — missing required field(s): ${missing.join(", ")}` },
            { status: 400 }
          );
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
