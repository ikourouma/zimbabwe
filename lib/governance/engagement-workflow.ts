import type { InvestorEngagementStatus } from "@/lib/types";

// Investor engagements previously allowed jumping to any of the 4 statuses via a free <Select>
// (see the deal-room dashboard audit) — this is the real transition graph the Deal Room CRM
// redesign enforces instead. `submitted` is always the entry state (set on creation), so it
// never appears as a destination here.
const ENGAGEMENT_TRANSITIONS: Record<InvestorEngagementStatus, InvestorEngagementStatus[]> = {
  // draft -> submitted is the investor's Publish/lock action (owner-gated in the route, not here);
  // once submitted it can never return to draft (immutability — corrections use an addendum).
  draft: ["submitted"],
  submitted: ["under_review", "rejected"],
  under_review: ["approved", "rejected", "submitted"],
  approved: ["under_review"],
  rejected: ["under_review"],
};

export function canTransitionEngagement(from: InvestorEngagementStatus, to: InvestorEngagementStatus): boolean {
  if (from === to) return true;
  return ENGAGEMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Staff (admin/gov) status-change dropdown options. Deliberately excludes `draft` and the
 *  `draft -> submitted` publish step, which only the owning investor performs. */
export function getAvailableEngagementActions(status: InvestorEngagementStatus): InvestorEngagementStatus[] {
  if (status === "draft") return [];
  return ENGAGEMENT_TRANSITIONS[status] ?? [];
}

/** Only a `draft` engagement may be edited (or published) by its owning investor; every later
 *  state is immutable to the investor (see the Engagement Draft-Lock plan's compliance model). */
export function isDraftEditable(status: InvestorEngagementStatus): boolean {
  return status === "draft";
}

/** Self-service "Withdraw to Draft" — an investor may pull a pre-approval engagement back for
 *  revision without staff involvement. Never available once `approved` (Fortune-100 Gap-Closure
 *  Round 2's governed-delete rule applies the same pre-approval/post-approval line here). */
export function canWithdrawEngagement(status: InvestorEngagementStatus): boolean {
  return status === "submitted" || status === "under_review" || status === "rejected";
}

/** Whether the owning investor may soft-delete this engagement directly (no justification/notify
 *  flow). Mirrors canWithdrawEngagement's pre-approval line, plus `draft` (which has no downstream
 *  stakeholders yet). `approved` is excluded — see the governed delete-request workflow. */
export function canSelfDeleteEngagement(status: InvestorEngagementStatus): boolean {
  return status !== "approved";
}

export const ENGAGEMENT_STATUS_LABELS: Record<InvestorEngagementStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Compliance Review",
  approved: "Approved",
  rejected: "Rejected",
};
