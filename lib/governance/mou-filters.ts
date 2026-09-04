import type { InvestorEngagement, InvestorEngagementStatus, MouStatus } from "@/lib/types";
import { MOU_STATUS_LABELS, MOU_STATUS_ORDER } from "@/lib/governance/mou-workflow";

/** "none" is a synthetic stage for engagements whose MOU row hasn't been created yet (lazily
 *  created on first visit to the MOU tab, see getOrCreateMouForEngagement) — the MOU registry
 *  (Platform Feedback Batch v3, Phase 8) needs a bucket for these just as much as for any real
 *  MouStatus, since most engagements sit here until ZIDA starts drafting. */
export type MouStageFilter = "all" | "none" | MouStatus;

export const MOU_STAGE_ORDER: MouStageFilter[] = ["none", ...MOU_STATUS_ORDER];

export const MOU_STAGE_LABELS: Record<MouStageFilter, string> = {
  all: "All",
  none: "No MOU Yet",
  ...MOU_STATUS_LABELS,
};

export interface MouFilters {
  search: string;
  engagementStatus: "all" | InvestorEngagementStatus;
  showArchived: boolean;
}

export const DEFAULT_MOU_FILTERS: MouFilters = {
  search: "",
  engagementStatus: "all",
  showArchived: false,
};

/** Effective MOU stage for grouping/filtering — `mouStatus` is `null`/`undefined` until the MOU
 *  row is first created. */
export function mouStageOf(engagement: InvestorEngagement): MouStageFilter {
  return engagement.mouStatus ?? "none";
}

/**
 * Shared row predicate for the MOU registry's pills, expandable filters, and search — mirrors
 * matchesInquiryRow's shape (an `exclude` dimension so each pill/select can compute a live count
 * against "everything except itself"). `projectTitle` is resolved by the caller (via
 * useProjectStore) since this lib module has no store access of its own.
 */
export function matchesMouRow(
  engagement: InvestorEngagement,
  projectTitle: string,
  stageFilter: MouStageFilter,
  filters: MouFilters,
  exclude?: "stage" | "engagementStatus" | "archived"
): boolean {
  if (exclude !== "archived" && !filters.showArchived && engagement.archivedAt) return false;
  if (exclude !== "engagementStatus" && filters.engagementStatus !== "all" && engagement.status !== filters.engagementStatus)
    return false;
  if (exclude !== "stage" && stageFilter !== "all" && mouStageOf(engagement) !== stageFilter) return false;

  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = `${engagement.investorName} ${engagement.investorOrganization ?? ""} ${projectTitle}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}
