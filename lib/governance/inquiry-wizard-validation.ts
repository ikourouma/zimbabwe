import type { LeadInquiry } from "@/lib/types";

/**
 * Single source of truth for the Strategic Partnerships wizard's step-validity rules — imported
 * by both the client wizard (components/strategic-partnerships/engagement-wizard.tsx) and the
 * server-side draft/submit routes (app/api/inquiries/draft/route.ts), per the Investor
 * Qualification Vetting plan's "mirror client rules server-side" requirement. An incomplete
 * inquiry must never be able to reach `pending` review through either surface.
 */
export interface InquiryWizardPayload {
  engagementType?: LeadInquiry["engagementType"] | "";
  name?: string;
  email?: string;
  organization?: string;
  phone?: string;
  /** Investor-only KYC fields, required before an investor application can submit — see the
   *  KYC-before-qualified rule driving this plan. */
  hqAddress?: string;
  businessRegistrationId?: string;
  websiteUrl?: string;
  investorType?: string;
  sectorIds?: string[];
  ticketSizeRange?: string;
  ministryRepresented?: string;
  natureOfEngagement?: string;
  partnershipType?: string;
  /** Step 3's "objective" free-text field, stored as LeadInquiry.message. */
  message?: string;
}

const nonEmpty = (v?: string) => Boolean(v && v.trim());

/** Step 1: identity + institutional basics, plus (investor-only) the five KYC fields that used
 *  to only be collected at the NDA gate after qualification. */
export function isWizardStep1Valid(p: InquiryWizardPayload): boolean {
  const base = Boolean(p.engagementType && nonEmpty(p.name) && nonEmpty(p.email) && nonEmpty(p.organization));
  if (!base) return false;
  if (p.engagementType === "investor") {
    return (
      nonEmpty(p.phone) &&
      nonEmpty(p.hqAddress) &&
      nonEmpty(p.businessRegistrationId) &&
      nonEmpty(p.websiteUrl)
    );
  }
  return true;
}

/** Step 2: engagement-type-specific interest fields. Skipped entirely (always valid) when the
 *  inquiry is anchored to a specific project, mirroring the wizard's own `isProjectLinked` gate. */
export function isWizardStep2Valid(p: InquiryWizardPayload, isProjectLinked: boolean): boolean {
  if (isProjectLinked) return true;
  switch (p.engagementType) {
    case "investor":
      return Boolean(p.investorType && (p.sectorIds?.length ?? 0) > 0 && p.ticketSizeRange);
    case "government_dfi":
      return Boolean(p.ministryRepresented && p.natureOfEngagement);
    case "strategic_partner":
      return Boolean(p.partnershipType && (p.sectorIds?.length ?? 0) > 0);
    default:
      return false;
  }
}

/** Step 3: the investment/partnership objective free-text field. */
export function isWizardStep3Valid(p: InquiryWizardPayload): boolean {
  return nonEmpty(p.message);
}

export function isWizardComplete(p: InquiryWizardPayload, isProjectLinked: boolean): boolean {
  return isWizardStep1Valid(p) && isWizardStep2Valid(p, isProjectLinked) && isWizardStep3Valid(p);
}
