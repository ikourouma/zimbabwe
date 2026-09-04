import type { InvestorEngagement, InvestorEngagementStatus } from "@/lib/types";

export type EngagementStatusFilter = "all" | InvestorEngagementStatus;

export interface EngagementFilters {
  search: string;
  showArchived: boolean;
}

export const DEFAULT_ENGAGEMENT_FILTERS: EngagementFilters = {
  search: "",
  showArchived: false,
};

/**
 * Shared row predicate for the Engagements registry's pills, expandable filters, and search
 * (Platform Feedback Batch v4, Phase 1) — mirrors matchesMouRow's shape (an `exclude` dimension
 * so each pill can compute a live count against "everything except itself"). `projectTitle` is
 * resolved by the caller (via useProjectStore) since this lib module has no store access of its
 * own.
 */
export function matchesEngagementRow(
  engagement: InvestorEngagement,
  projectTitle: string,
  statusFilter: EngagementStatusFilter,
  filters: EngagementFilters,
  exclude?: "status" | "archived"
): boolean {
  if (exclude !== "archived" && !filters.showArchived && engagement.archivedAt) return false;
  if (exclude !== "status" && statusFilter !== "all" && engagement.status !== statusFilter) return false;

  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = `${engagement.investorName} ${engagement.investorOrganization ?? ""} ${projectTitle}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}
