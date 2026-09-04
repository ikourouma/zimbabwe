import type { AccountRole } from "./types";
import { roleToWorkflowRole } from "./role-map";
import type { WorkflowRole } from "@/lib/governance/project-workflow";
import type { InvestmentProject } from "@/lib/types";

/** Minimal shape needed to resolve a workflow role — deliberately just the fields this needs
 *  (not the full session `CurrentUserContext`/`useAuth()` value) so this stays usable from both
 *  server route handlers and client components without pulling in either's full type. */
export interface WorkflowRoleActor {
  role: AccountRole;
  userId: string;
  ministryId?: string | null;
}

/**
 * Resolves a caller's `WorkflowRole` **for one specific project** — the single source of truth
 * for two inline, per-project exceptions the shared `roleToWorkflowRole(role)` deliberately
 * doesn't grant platform-wide (Team Ministry Traceability Batch, Phase 3, item 8):
 *
 * 1. `qualified` is a "creator" only on their own Propose-a-Project submission (or one they're a
 *    validated co-editor teammate on) — never on any other project.
 * 2. `ministry_admin` is a "reviewer" (full stewardship through Approved, but never Publish — see
 *    the `reviewer` tier in lib/governance/project-workflow.ts, Platform Feedback Batch v4, Phase 7)
 *    only on projects whose `primaryBeneficiaryMinistryId` matches their own `ministryId` — `null`
 *    (no authority) on every other ministry's projects. Two ministry_admin accounts on the *same*
 *    ministry both resolve to "reviewer" here — the multi-admin/backup case is intentional (see
 *    Phase 1). Publish is admin/super_admin-only: ZIDA is the final validation gate, by design.
 *
 * Every other role falls through to the existing shared `roleToWorkflowRole`. Used by both the
 * server-side PATCH /api/projects/[id] gate and the client-side ProjectDetailDrawer Actions tab /
 * Kanban drag handler, so the same rule can never drift between "can I show this button" and "will
 * the server actually accept this transition".
 */
export function resolveProjectWorkflowRole(
  actor: WorkflowRoleActor,
  project: Pick<InvestmentProject, "createdBy" | "teamAssignedUserIds" | "primaryBeneficiaryMinistryId">
): WorkflowRole | null {
  if (actor.role === "qualified") {
    const isOwner = project.createdBy === actor.userId;
    const isAssignedTeammate = project.teamAssignedUserIds?.includes(actor.userId) ?? false;
    return isOwner || isAssignedTeammate ? "creator" : null;
  }
  if (actor.role === "ministry_admin") {
    return actor.ministryId && project.primaryBeneficiaryMinistryId === actor.ministryId ? "reviewer" : null;
  }
  return roleToWorkflowRole(actor.role);
}
