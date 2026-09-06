import type { InvestmentProject, ProjectStatus } from "@/lib/types";

export type WorkflowRole = "creator" | "reviewer" | "approver" | "super_admin";

/** `creator` tier — the proposal's own owner/co-editor (`qualified`, via `resolveProjectWorkflowRole`).
 *  Can only push a draft (or a resubmission after feedback) into the queue; never touches anything
 *  past `submitted_for_review` — approving/publishing is never this tier's call. */
const CREATOR_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["submitted_for_review"],
  submitted_for_review: [],
  under_review: [],
  changes_requested: ["submitted_for_review"],
  approved: [],
  published: [],
  archived: [],
};

/** `reviewer` tier (Platform Feedback Batch v4, Phase 7) — `ministry_admin` on their own ministry's
 *  projects and `government` platform-wide. Full stewardship from draft through Approved, including
 *  the resubmit-after-`changes_requested` loop — but **never** `approved -> published` or
 *  `published -> archived`. ZIDA (`admin`/`super_admin`, the `approver` tier below) is the sole
 *  publish-authority gate; this is the one-line-in-spirit fix that closes both the ministry_admin
 *  publish gap (they used to be `approver`) and the dormant `government` publish/unpublish gap (they
 *  used to fall through to the generic `TRANSITIONS` table below, which included both). */
const REVIEWER_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["submitted_for_review"],
  submitted_for_review: ["under_review"],
  under_review: ["changes_requested", "approved", "archived"],
  changes_requested: ["submitted_for_review"],
  approved: [],
  published: [],
  archived: [],
};

/** `approver` tier (`admin`, and `super_admin` via this same shared path) — everything `reviewer`
 *  can do, plus the final `approved -> published` publish step. Also picks up
 *  `submitted_for_review -> under_review` for free via the spread, closing the gap where a plain
 *  `admin` previously had no way to move a fresh submission into Under Review themselves. */
const APPROVER_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  ...REVIEWER_TRANSITIONS,
  approved: ["published"],
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

/** Single source of truth for "which table governs this role" — used by both `canTransition()` and
 *  `getAvailableActions()` so the Review Queue's buttons can never drift from what the server will
 *  actually accept (Platform Feedback Batch v4, Phase 7 — closes the button/permission mismatch the
 *  page's own copy already claimed to guarantee but didn't). */
function transitionsFor(role: WorkflowRole): Record<ProjectStatus, ProjectStatus[]> {
  if (role === "super_admin") return SUPER_ADMIN_TRANSITIONS;
  if (role === "approver") return APPROVER_TRANSITIONS;
  if (role === "reviewer") return REVIEWER_TRANSITIONS;
  return CREATOR_TRANSITIONS;
}

export function canTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  role: WorkflowRole
): boolean {
  return transitionsFor(role)[from]?.includes(to) ?? false;
}

export function getAvailableActions(
  project: InvestmentProject,
  role: WorkflowRole
): ProjectStatus[] {
  return transitionsFor(role)[project.projectStatus] ?? [];
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

/** "in_review" is a synthetic value grouping submitted_for_review/under_review/changes_requested
 *  (mirrors the Overview KPI card and isInReviewStatus) — not a real ProjectStatus. Shared by
 *  every project registry's status-pill row (Pipeline, Saved Projects, My Proposals) so they
 *  never drift from one another (Platform Feedback Batch v4, Phase 1 addendum). */
export type StatusFilterValue = "all" | "in_review" | ProjectStatus;

// 1:1 with DealRoomKanban's BOARD_COLUMNS (draft → submitted_for_review → under_review →
// changes_requested → approved → published) — every real Kanban column gets its own pill instead
// of grouping submitted_for_review/under_review/changes_requested into one "In Review" chip. The
// synthetic "in_review" StatusFilterValue itself stays supported by callers purely for the legacy
// ?status=in_review deep link from the Overview KPI cards — it deliberately isn't its own pill.
export const STATUS_FILTER_CHIPS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: STATUS_LABELS.draft },
  { value: "submitted_for_review", label: STATUS_LABELS.submitted_for_review },
  { value: "under_review", label: STATUS_LABELS.under_review },
  { value: "changes_requested", label: STATUS_LABELS.changes_requested },
  { value: "approved", label: STATUS_LABELS.approved },
  { value: "published", label: STATUS_LABELS.published },
  // Archived closes the partition. Without it the pills summed to one less than the All count,
  // because an archived project was counted in the total while no pill and no board column could
  // reach it — arithmetic a reader can do on a screenshot, and did. A government reviewer has only
  // this console, so dropping archived from the total instead would have made closed records
  // unreachable for the one role with no registry view to fall back on.
  { value: "archived", label: STATUS_LABELS.archived },
];
