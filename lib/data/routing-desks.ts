import type { LeadInquiry } from "@/lib/types";

/**
 * Mirrors a real CRM "Team Owner" routing convention (cf. LNDC-style investor desks):
 * the engagement type — plus whether the inquiry is anchored to a specific project —
 * determines which internal desk picks it up. Demo-only: drives confirmation copy and
 * the admin inbox column, no actual routing/notification occurs.
 */
export type RoutingDesk =
  | "Investment Promotion Desk"
  | "Government & DFI Relations Desk"
  | "Strategic Partnerships Desk"
  | "Deal Room Team";

export function getRoutingDesk(
  engagementType: LeadInquiry["engagementType"],
  hasProject: boolean
): RoutingDesk {
  if (hasProject) return "Deal Room Team";
  switch (engagementType) {
    case "investor":
      return "Investment Promotion Desk";
    case "government_dfi":
      return "Government & DFI Relations Desk";
    case "strategic_partner":
      return "Strategic Partnerships Desk";
    default:
      return "Investment Promotion Desk";
  }
}
