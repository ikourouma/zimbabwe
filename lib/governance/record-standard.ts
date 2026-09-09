/**
 * Distinguishes the two tiers a project record can belong to, ahead of the `record_standard`
 * column Phase 2 of the data-standardisation plan adds to the schema.
 *
 * Until that column exists, tier is inferred from `sourceReference`: every one of the 32 records
 * seeded from the ZIDA 2025 Projects deck carries a `sourceReference` beginning with that string
 * (see lib/data/seed-raw.ts); nothing created through the project wizard sets that field at all.
 * That makes the check exact today — it is a closed, unchanging set of legacy records — and safe
 * to retire once the real column lands, at which point this function becomes its accessor instead
 * of a heuristic.
 */

const CATALOGUE_SOURCE_PREFIX = "ZIDA 2025 Projects deck";

/** True for one of the 32 records seeded from the ZIDA catalogue; false for anything filed
 *  through the wizard, where the full data standard applies. */
export function isZidaCatalogueRecord(sourceReference?: string | null): boolean {
  return typeof sourceReference === "string" && sourceReference.startsWith(CATALOGUE_SOURCE_PREFIX);
}

export type RecordStandard = "catalogue_seed" | "full_template";

/** Human label for the tier a record was captured under, for anywhere that needs to name it
 *  rather than just badge it (tooltips, CSV exports, the review queue). */
export function recordStandardOf(sourceReference?: string | null): RecordStandard {
  return isZidaCatalogueRecord(sourceReference) ? "catalogue_seed" : "full_template";
}

export const RECORD_STANDARD_LABELS: Record<RecordStandard, string> = {
  catalogue_seed: "ZIDA Catalogue",
  full_template: "Full Template",
};

export const RECORD_STANDARD_DESCRIPTIONS: Record<RecordStandard, string> = {
  catalogue_seed:
    "Seeded from the ZIDA 2025 Projects deck. Fields not captured in that source are shown as not stated, and the record is pending official validation before the figures on it can be relied on.",
  full_template:
    "Created directly on the platform against the full project data standard.",
};
