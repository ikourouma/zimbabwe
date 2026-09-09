/**
 * Project Data Standardisation, Phase 3 — scores a project against the full data standard the
 * Phase 3 wizard now captures, and lists exactly what's missing so a reviewer doesn't have to
 * guess. Distinct from (and a superset of) REQUIRED_FIELDS in lib/governance/project-workflow.ts,
 * which only gates the draft -> submitted_for_review step; this gates the approved -> published
 * step, the one place today's platform lets a project reach the public registry with, for
 * example, no capital figure at all (the gap this file closes — see PATCH /api/projects/[id]).
 *
 * The two-tier model from Phase 1/2 carries through here: a `catalogue_seed` record (one of the
 * 32 ZIDA deck imports, see lib/governance/record-standard.ts) is exempt from the gate outright —
 * it reports its real score for transparency, but `meetsPublicationMinimum` always returns true
 * for it, because the deck simply doesn't carry every field the template now asks a *new* project
 * for. Only `full_template` records — everything created through the wizard from here on — are
 * actually held to the minimum.
 */

import type { InvestmentProject } from "@/lib/types";
import { isZidaCatalogueRecord } from "@/lib/governance/record-standard";

interface StandardField {
  label: string;
  isPresent: (p: Partial<InvestmentProject>) => boolean;
}

/** The full data standard: the eight-field submission gate (REQUIRED_FIELDS) plus the Phase 3
 *  wizard additions — province, a structured capital figure, at least one structured return
 *  metric, development impact, and at least one supporting document. */
const STANDARD_FIELDS: StandardField[] = [
  { label: "Title", isPresent: (p) => Boolean(p.title) },
  { label: "Sector", isPresent: (p) => Boolean(p.sectorId) },
  { label: "Primary Beneficiary Ministry", isPresent: (p) => Boolean(p.primaryBeneficiaryMinistryId) },
  { label: "Project Owner", isPresent: (p) => Boolean(p.projectOwner) },
  { label: "Location", isPresent: (p) => Boolean(p.location) },
  { label: "Province", isPresent: (p) => Boolean(p.province) },
  { label: "Readiness Level", isPresent: (p) => Boolean(p.projectReadiness) },
  { label: "Opportunity Summary", isPresent: (p) => Boolean(p.opportunitySummary) },
  { label: "Full Description", isPresent: (p) => Boolean(p.description) },
  { label: "Development Impact", isPresent: (p) => (p.developmentImpact?.length ?? 0) > 0 },
  { label: "Capital Required (structured figure)", isPresent: (p) => typeof p.capitalTotalUsd === "number" },
  {
    label: "At least one return metric (IRR, NPV, ROI, payback or projected revenue)",
    isPresent: (p) => [p.irrPct, p.npvUsd, p.roiPct, p.paybackMonths, p.projectedRevenueUsd].some((v) => typeof v === "number"),
  },
  { label: "Supporting Documents", isPresent: (p) => (p.documentRecords?.length ?? 0) > 0 },
];

/** Below this score, a `full_template` project cannot be published — see
 *  `meetsPublicationMinimum`. Set well under 100 so a project can reasonably reach Published
 *  without every last field (e.g. a genuinely undocumented but otherwise complete opportunity),
 *  while still ruling out the "no capital figure, no summary" case the gap report found. */
const PUBLICATION_MINIMUM_SCORE = 70;

export interface ProjectCompleteness {
  /** 0–100, rounded. */
  score: number;
  filled: number;
  total: number;
  /** Human-readable labels of every standard field this project is missing. */
  missing: string[];
  /** True for `catalogue_seed` records — reported for transparency but never gates publication. */
  exemptFromGate: boolean;
}

export function scoreProjectCompleteness(project: Partial<InvestmentProject>): ProjectCompleteness {
  const missing: string[] = [];
  let filled = 0;
  for (const field of STANDARD_FIELDS) {
    if (field.isPresent(project)) filled += 1;
    else missing.push(field.label);
  }
  const total = STANDARD_FIELDS.length;
  return {
    score: Math.round((filled / total) * 100),
    filled,
    total,
    missing,
    exemptFromGate: isZidaCatalogueRecord(project),
  };
}

/** Server-side publication gate (PATCH /api/projects/[id], approved -> published). Client-side
 *  surfacing (review queue, detail drawer) reads `scoreProjectCompleteness` directly instead —
 *  this function exists purely for the one boolean decision the gate needs. */
export function meetsPublicationMinimum(project: Partial<InvestmentProject>): boolean {
  const { score, exemptFromGate } = scoreProjectCompleteness(project);
  return exemptFromGate || score >= PUBLICATION_MINIMUM_SCORE;
}
