import type { InvestmentProject } from "@/lib/types";

/**
 * The subset of fields a "Propose a Project" first save genuinely cannot go without — every one
 * of these backs a NOT NULL (and, for sectorId/primaryBeneficiaryMinistryId, FK-constrained)
 * database column, so no amount of "draft leniency" can skip them. Everything else
 * (opportunitySummary, description, scope, developmentImpact, financials, taxonomy links) is
 * backfilled with an empty placeholder on first save and completed over the rest of the wizard's
 * steps. Shared between the server-side POST /api/projects validation and the client-side
 * ProposeProjectWizard's step-0 "Continue" gate so the two can never drift.
 */
export const INVESTOR_FIRST_SAVE_REQUIRED_FIELDS: (keyof InvestmentProject)[] = [
  "title",
  "sectorId",
  "primaryBeneficiaryMinistryId",
  "projectOwner",
  "location",
  "projectReadiness",
];

/**
 * Same set as above, under a role-neutral name (Platform Feedback Batch v3, Phase 5) — the
 * unconditional draft-leniency backfill in POST /api/projects (opportunitySummary/description/
 * scope/etc. all default to empty when omitted) was never actually investor-specific, so the new
 * admin/government full-page wizard's step-0 "Continue" gate reuses this exact list rather than
 * inventing a parallel one that could drift.
 */
export const PROJECT_FIRST_SAVE_REQUIRED_FIELDS = INVESTOR_FIRST_SAVE_REQUIRED_FIELDS;
