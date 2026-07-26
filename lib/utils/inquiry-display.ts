import type { LeadInquiry } from "@/lib/types";
import { sectors } from "@/lib/data/taxonomies";

export const ENGAGEMENT_TYPE_LABELS: Record<string, string> = {
  investor: "Investor",
  government_dfi: "Government / DFI",
  strategic_partner: "Strategic Partner",
};

/** Human-facing labels for `LeadInquiry.type` in the admin inbox. Types not listed here fall back
 *  to a de-underscored rendering, so this only needs entries where that isn't good enough. */
export const LEAD_INQUIRY_TYPE_LABELS: Record<string, string> = {
  investment_interest: "Investment Interest",
  document_request: "Document Request",
  meeting_request: "Meeting Request",
  strategic_partnership: "Strategic Partnership",
  valuation_teaser: "Valuation Teaser",
};

/** Humanized inquiry-type label with an underscore→space fallback. */
export function formatInquiryType(type: string): string {
  return LEAD_INQUIRY_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function describeInterest(inq: LeadInquiry): string {
  if (inq.ministryRepresented) return inq.ministryRepresented;
  if (inq.sectorIds?.length) {
    const names = inq.sectorIds.map((id) => sectors.find((s) => s.id === id)?.name).filter(Boolean);
    const ticket = inq.ticketSizeRange ? ` · ${inq.ticketSizeRange}` : "";
    return `${names.join(", ")}${ticket}`;
  }
  if (inq.ticketSizeRange) return inq.ticketSizeRange;
  if (inq.partnershipType) return inq.partnershipType;
  return "—";
}
