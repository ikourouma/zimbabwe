/**
 * Taxonomies workspace filter taxonomy (/super-admin/taxonomies) — every dimension here is backed
 * by a real field already on the relevant entity. There is deliberately no "Canonical vs Custom
 * Authority Scope" filter: no taxonomy table carries a system-default/custom-origin flag, and the
 * only real canonical/editable split in this app (UN SDGs are a fixed global standard with no
 * add/archive/delete affordances at all, everything else is admin-editable) is a whole-category
 * fact, not a per-row one — fabricating a per-row flag to back that filter would misrepresent the
 * data, so it's tracked in BACKLOG.md instead of being built here.
 */
export type TaxonomyCategory = "sectors" | "subsectors" | "ministries" | "provinces" | "pillars" | "sdgs" | "contact";

export const TAXONOMY_CATEGORY_LABELS: Record<TaxonomyCategory, string> = {
  sectors: "Sectors",
  subsectors: "Subsectors",
  ministries: "Ministries",
  provinces: "Provinces",
  pillars: "Strategic Pillars",
  sdgs: "UN SDGs",
  contact: "Contact Reasons",
};

export const TAXONOMY_CATEGORY_ORDER: TaxonomyCategory[] = [
  "sectors",
  "subsectors",
  "ministries",
  "provinces",
  "pillars",
  "sdgs",
  "contact",
];

export type TaxonomyStatusFilter = "all" | "active" | "archived";
export type TaxonomyCoverageFilter = "all" | "linked" | "unlinked";

export interface TaxonomyFilters {
  search: string;
  status: TaxonomyStatusFilter;
  coverage: TaxonomyCoverageFilter;
}

export const DEFAULT_TAXONOMY_FILTERS: TaxonomyFilters = {
  search: "",
  status: "all",
  coverage: "all",
};

/** Normalized shape every taxonomy row (sector, ministry, province, pillar, SDG, contact reason)
 *  is projected into before matching — lets one filter predicate work across five differently
 *  shaped entities. `isActive` is `true` for entities with no archive concept at all (provinces,
 *  SDGs) since they have no inactive state to fall into; `linkedCount` is `0` (never fabricated)
 *  for contact reasons, which don't link to projects in this domain model. */
export interface TaxonomyRow {
  searchText: string;
  isActive: boolean;
  linkedCount: number;
}

type TaxonomyFilterDimension = "search" | "status" | "coverage";

export function matchesTaxonomyRow(row: TaxonomyRow, filters: TaxonomyFilters, exclude?: TaxonomyFilterDimension): boolean {
  if (exclude !== "search" && filters.search.trim()) {
    if (!row.searchText.toLowerCase().includes(filters.search.trim().toLowerCase())) return false;
  }
  if (exclude !== "status" && filters.status !== "all") {
    if (filters.status === "active" && !row.isActive) return false;
    if (filters.status === "archived" && row.isActive) return false;
  }
  if (exclude !== "coverage" && filters.coverage !== "all") {
    if (filters.coverage === "linked" && row.linkedCount <= 0) return false;
    if (filters.coverage === "unlinked" && row.linkedCount > 0) return false;
  }
  return true;
}
