import type { AccountRole } from "./types";
import type { DemoPersona } from "@/lib/types";
import type { WorkflowRole } from "@/lib/governance/project-workflow";

export function roleToPersona(role: AccountRole | null): DemoPersona {
  if (!role) return "public";
  if (role === "super_admin") return "super_admin";
  if (role === "admin") return "admin";
  // No dedicated DemoPersona exists for ministry_admin (a Phase 6 real-auth-only role, added well
  // after the legacy demo-persona system) — "government" is the closest fit for the handful of
  // legacy DemoPersona-based helpers still in use (both share the "qualified" AccessLevel per
  // accessLevelForRole above). Real ministry-scoping is enforced separately and unaffected by this.
  if (role === "government" || role === "ministry_admin") return "government";
  if (role === "qualified") return "qualified";
  return "registered";
}

/** Maps an authenticated account role to the governance role used by `canTransition()` — for the
 *  *reviewing* side of the pipeline (Kanban drag, drawer Actions tab, engagement management).
 *  Deliberately still returns `null` for `qualified`: those call sites (deal-room/pipeline,
 *  deal-room/engagements, ProjectDetailDrawer) treat "workflowRole !== null" as "this viewer is
 *  staff on every project shown," which is only true for reviewer/approver/super_admin. A
 *  qualified investor IS a workflow "creator" on their *own* Propose-a-Project submissions
 *  (Investor Dashboard Expansion plan, Phase 4) — but that narrower resolution is intentionally
 *  kept out of this shared function; see the inline creator-role checks in
 *  app/api/projects/route.ts and app/api/projects/[id]/route.ts, which additionally verify
 *  `project.createdBy === actor.userId` before treating the actor as that project's creator. */
export function roleToWorkflowRole(role: AccountRole): WorkflowRole | null {
  if (role === "government") return "reviewer";
  if (role === "admin") return "approver";
  if (role === "super_admin") return "super_admin";
  // ministry_admin deliberately falls through to null (read-only on the shared registry
  // components) for this phase — see the /ministry console's own scoped view instead of granting
  // platform-wide stage-transition authority via this shared workflow-role path.
  return null;
}
