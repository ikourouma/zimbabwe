import type { AccountRole } from "./types";
import type { DemoPersona } from "@/lib/types";
import type { WorkflowRole } from "@/lib/governance/project-workflow";

export function roleToPersona(role: AccountRole | null): DemoPersona {
  if (!role) return "public";
  if (role === "super_admin") return "super_admin";
  if (role === "admin") return "admin";
  if (role === "government") return "government";
  if (role === "qualified") return "qualified";
  return "registered";
}

/** Maps an authenticated account role to the governance role used by `canTransition()`. */
export function roleToWorkflowRole(role: AccountRole): WorkflowRole | null {
  if (role === "government") return "reviewer";
  if (role === "admin") return "approver";
  if (role === "super_admin") return "super_admin";
  return null;
}
