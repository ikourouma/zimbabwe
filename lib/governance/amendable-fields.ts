import type { InvestmentProject } from "@/lib/types";

/** The `project_amendment_request` field allowlist's display-side counterpart — must stay a
 *  subset of `AMENDABLE_FIELDS` in app/api/projects/[id]/amendment-request/route.ts (server is the
 *  actual enforcement point; this is just shared copy so the "Request Amendment" form and the
 *  Unified Review Queue's old-vs-new diff (Platform Feedback Batch v4, Phase 7) never label the
 *  same field two different ways). */
export type AmendableField = keyof Pick<
  InvestmentProject,
  | "title"
  | "opportunitySummary"
  | "description"
  | "scope"
  | "developmentImpact"
  | "projectOwner"
  | "location"
  | "province"
  | "district"
  | "capitalRequired"
  | "financingType"
  | "projectReadiness"
  | "jobsDirect"
  | "jobsIndirect"
  | "irr"
  | "npv"
  | "roi"
  | "paybackPeriod"
  | "projectedRevenue"
  | "investmentSource"
  | "capitalStructure"
  | "shareholderContribution"
  | "sectorExperienceYears"
  | "priorProjectsCompleted"
  | "annualTurnover"
  | "financingConfirmation"
  | "financingPartners"
>;

export const AMENDABLE_FIELD_LABELS: Record<AmendableField, string> = {
  title: "Project Title",
  opportunitySummary: "Opportunity Summary",
  description: "Full Description",
  scope: "Scope",
  developmentImpact: "Development Impact",
  projectOwner: "Project Owner / Sponsor",
  location: "Location",
  province: "Province",
  district: "District",
  capitalRequired: "Capital Required",
  financingType: "Financing Type",
  projectReadiness: "Readiness Level",
  jobsDirect: "Direct Jobs Projected",
  jobsIndirect: "Indirect Jobs Projected",
  irr: "IRR",
  npv: "NPV",
  roi: "ROI",
  paybackPeriod: "Payback Period",
  projectedRevenue: "Projected Revenue",
  investmentSource: "Investment Source",
  capitalStructure: "Capital Structure",
  shareholderContribution: "Shareholder Contribution",
  sectorExperienceYears: "Years of Sector Experience",
  priorProjectsCompleted: "Prior Projects Completed",
  annualTurnover: "Company Annual Turnover",
  financingConfirmation: "Source of Financing Confirmation",
  financingPartners: "Financing / Co-Investment Partners",
};

export const NUMERIC_AMENDABLE_FIELDS = new Set<AmendableField>(["jobsDirect", "jobsIndirect"]);

/** Best-effort label for any field name the diff view encounters — falls back to the raw key for
 *  the rare non-allowlisted field rather than throwing, since the payload is untyped JSON at rest. */
export function labelForAmendableField(field: string): string {
  return AMENDABLE_FIELD_LABELS[field as AmendableField] ?? field;
}

/** A `project_amendment_request` card is still "in flight" (blocks filing a duplicate, counts
 *  toward the Unified Review Queue's pending list) in either of two states: "open" (single-stage
 *  investor-filed, or a government-filed request still awaiting its own ministry_admin) or
 *  "escalated" (a government-filed request the ministry_admin already approved, now awaiting
 *  admin/super_admin's final call) — see MessageActionPayload's Phase 8 doc comment. */
export function isAmendmentRequestPending(status?: string | null): boolean {
  return status === "open" || status === "escalated";
}
