/**
 * Distinguishes the two tiers a project record can belong to.
 *
 * The `recordStandard` column (Project Data Standardisation, Phase 2) is the source of truth once
 * a record has been through scripts/migrate-financial-fields.ts. Before that — and for any record
 * this file predates — tier is inferred from `sourceReference`: every one of the 32 records seeded
 * from the ZIDA 2025 Projects deck carries a `sourceReference` beginning with that string (see
 * lib/data/seed-raw.ts); nothing created through the project wizard sets that field at all. The
 * fallback keeps every caller correct during the migration window instead of needing two code
 * paths, and becomes dead weight rather than a bug once every row has a real column value.
 */

const CATALOGUE_SOURCE_PREFIX = "ZIDA 2025 Projects deck";

export type RecordStandard = "catalogue_seed" | "full_template";

interface RecordStandardInput {
  recordStandard?: RecordStandard | null;
  sourceReference?: string | null;
}

/** True for one of the 32 records seeded from the ZIDA catalogue; false for anything filed
 *  through the wizard, where the full data standard applies. */
export function isZidaCatalogueRecord(project: RecordStandardInput | string | null | undefined): boolean {
  // A bare string is treated as `sourceReference`, so call sites that only have the text field
  // in hand (a table column, a badge prop) don't need to wrap it in an object.
  if (typeof project === "string" || project === null || project === undefined) {
    return typeof project === "string" && project.startsWith(CATALOGUE_SOURCE_PREFIX);
  }
  if (project.recordStandard) return project.recordStandard === "catalogue_seed";
  return typeof project.sourceReference === "string" && project.sourceReference.startsWith(CATALOGUE_SOURCE_PREFIX);
}

/** Human label for the tier a record was captured under, for anywhere that needs to name it
 *  rather than just badge it (tooltips, CSV exports, the review queue). */
export function recordStandardOf(project: RecordStandardInput | string | null | undefined): RecordStandard {
  return isZidaCatalogueRecord(project) ? "catalogue_seed" : "full_template";
}

// Deliberately not "ZIDA Catalogue" — that phrase is already the pipelineType filter chip label
// for "not a policy initiative" (see components/projects/project-filters.tsx), an unrelated axis.
// Reusing it here for the data-standard tier would put two different meanings on one term on the
// same registry screen.
export const RECORD_STANDARD_LABELS: Record<RecordStandard, string> = {
  catalogue_seed: "Catalogue Seed",
  full_template: "Full Template",
};

export const RECORD_STANDARD_DESCRIPTIONS: Record<RecordStandard, string> = {
  catalogue_seed:
    "Seeded from the ZIDA 2025 Projects deck. Fields not captured in that source are shown as not stated, and the record is pending official validation before the figures on it can be relied on.",
  full_template: "Created directly on the platform against the full project data standard.",
};
