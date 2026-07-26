import type { LeadInquiry } from "@/lib/types";
import { isWithinTimeHorizon, type TimeHorizon } from "@/lib/utils/time-horizon";

/**
 * Inquiries workspace filter taxonomy (/admin/inquiries, /super-admin/inquiries). Every dimension
 * is backed by a real `LeadInquiry` field:
 *  - Channel Origin uses the real `type` values as-is (no invented "Contact Form / Registration /
 *    Strategic Partnerships / Project Workspace" 4-bucket grouping) — several real types
 *    (document_request, meeting_request, investment_interest, valuation_teaser) aren't
 *    unambiguously "one" of those four buckets, so collapsing them would misrepresent the data.
 *  - Sector Interest matches `sectorIds`, only ever populated by the Strategic Partnerships wizard
 *    — every other inquiry type honestly has no sector data yet, never fabricated.
 *  - Status only offers the three states the schema actually supports (pending/approved/declined)
 *    — there is no "Under Review" or "Archived" status anywhere in the data model.
 */
export type InquiryStatusFilter = "all" | NonNullable<LeadInquiry["status"]>;

export const INQUIRY_STATUS_LABELS: Record<NonNullable<LeadInquiry["status"]>, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
};

export const INQUIRY_STATUS_ORDER: NonNullable<LeadInquiry["status"]>[] = ["pending", "approved", "declined"];

export const INQUIRY_TYPE_ORDER: LeadInquiry["type"][] = [
  "contact",
  "registration",
  "strategic_partnership",
  "investment_interest",
  "document_request",
  "meeting_request",
  "valuation_teaser",
];

export interface InquiryFilters {
  search: string;
  type: LeadInquiry["type"] | "all";
  timeHorizon: TimeHorizon;
  customFrom?: string;
  customTo?: string;
  sectorId: string; // "all" or a real sector id
}

export const DEFAULT_INQUIRY_FILTERS: InquiryFilters = {
  search: "",
  type: "all",
  timeHorizon: "all",
  sectorId: "all",
};

type InquiryFilterDimension = "search" | "status" | "type" | "timeHorizon" | "sectorId";

/** Matches one inquiry against the full filter set (status pill + the drawer's channel/time/sector
 *  dimensions). `exclude` skips a single dimension — used to compute each pill/button's own "live"
 *  count against everything *except* itself, the same pattern the audit log and project registries
 *  use. */
export function matchesInquiryRow(
  inquiry: LeadInquiry,
  statusFilter: InquiryStatusFilter,
  filters: InquiryFilters,
  exclude?: InquiryFilterDimension
): boolean {
  if (exclude !== "status" && statusFilter !== "all" && (inquiry.status ?? "pending") !== statusFilter) return false;
  if (exclude !== "type" && filters.type !== "all" && inquiry.type !== filters.type) return false;
  if (
    exclude !== "timeHorizon" &&
    !isWithinTimeHorizon(inquiry.createdAt, filters.timeHorizon, filters.customFrom, filters.customTo)
  ) {
    return false;
  }
  if (exclude !== "sectorId" && filters.sectorId !== "all" && !(inquiry.sectorIds ?? []).includes(filters.sectorId)) {
    return false;
  }
  if (exclude !== "search" && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const haystack = [inquiry.name, inquiry.email, inquiry.organization ?? "", inquiry.message ?? ""].join(" ").toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}
