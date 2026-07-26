import type { InvestmentProject, ProjectStatus } from "@/lib/types";

export type WorkflowRole = "creator" | "reviewer" | "approver" | "super_admin";

const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["submitted_for_review"],
  submitted_for_review: ["under_review", "draft"],
  under_review: ["changes_requested", "approved", "archived"],
  changes_requested: ["submitted_for_review", "draft"],
  approved: ["published", "archived"],
  published: ["archived"],
  archived: [],
};

const SUPER_ADMIN_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["submitted_for_review", "under_review", "approved", "published", "archived"],
  submitted_for_review: ["draft", "under_review", "changes_requested", "approved", "published", "archived"],
  under_review: ["draft", "submitted_for_review", "changes_requested", "approved", "published", "archived"],
  changes_requested: ["draft", "submitted_for_review", "under_review", "approved", "published", "archived"],
  approved: ["draft", "under_review", "changes_requested", "published", "archived"],
  published: ["draft", "approved", "under_review", "changes_requested", "archived"],
  archived: ["draft", "under_review", "approved", "published"],
};

export const REQUIRED_FIELDS: (keyof InvestmentProject)[] = [
  "title",
  "sectorId",
  "primaryBeneficiaryMinistryId",
  "projectOwner",
  "location",
  "projectReadiness",
  "opportunitySummary",
  "description",
];

export function canTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  role: WorkflowRole
): boolean {
  if (role === "super_admin") {
    return SUPER_ADMIN_TRANSITIONS[from]?.includes(to) ?? false;
  }
  if (role === "creator") {
    if (from === "draft" && to === "submitted_for_review") return true;
    if (from === "changes_requested" && to === "submitted_for_review") return true;
    return false;
  }
  if (role === "reviewer") {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }
  if (role === "approver") {
    if (from === "under_review" && ["changes_requested", "approved", "archived"].includes(to)) return true;
    if (from === "approved" && to === "published") return true;
    return false;
  }
  return false;
}

export function getAvailableActions(
  project: InvestmentProject,
  role: WorkflowRole
): ProjectStatus[] {
  const map = role === "super_admin" ? SUPER_ADMIN_TRANSITIONS : TRANSITIONS;
  return map[project.projectStatus] ?? [];
}

export function validateRequiredFields(
  project: Partial<InvestmentProject>
): { valid: boolean; missing: string[] } {
  const missing = REQUIRED_FIELDS.filter((field) => {
    const val = project[field];
    return val === undefined || val === null || val === "";
  });
  return { valid: missing.length === 0, missing };
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  submitted_for_review: "Submitted for Review",
  under_review: "Under Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted_for_review: "bg-blue-100 text-blue-800",
  under_review: "bg-amber-100 text-amber-800",
  changes_requested: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  published: "bg-zim-green-700 text-white",
  archived: "bg-gray-200 text-gray-600",
};

/** Statuses that represent a project actively moving through the review pipeline
 *  (as opposed to draft, published, or archived). Shared by the Deal Room card badge
 *  and drawer so the "in review" figure is computed identically in both places. */
const IN_REVIEW_STATUSES: ProjectStatus[] = ["submitted_for_review", "under_review", "changes_requested"];

export function getInReviewCount(projects: InvestmentProject[]): number {
  return projects.filter((p) => IN_REVIEW_STATUSES.includes(p.projectStatus)).length;
}

/** Shared predicate so the Deal Room Overview "In Review" KPI card and the Pipeline page's
 *  `?status=in_review` deep link (see StatCard href wiring) agree on exactly the same set of
 *  statuses. */
export function isInReviewStatus(status: ProjectStatus): boolean {
  return IN_REVIEW_STATUSES.includes(status);
}
