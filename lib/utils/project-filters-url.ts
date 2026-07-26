import { getSectorById, getPillarById, getSdgById, getMinistryById } from "@/lib/data/taxonomies";
import type { CapitalBracket, ProjectFilters, UpdatedWithin } from "@/lib/types";

const CAPITAL_BRACKET_VALUES: CapitalBracket[] = ["micro", "growth", "middle", "infrastructure", "assessment_pending"];
const UPDATED_WITHIN_VALUES: UpdatedWithin[] = ["7d", "30d", "quarter"];

/** All registry query-string keys that mirror a `ProjectFilters` field, so URL writes can wipe the
 *  filter slice cleanly without disturbing unrelated params (e.g. `?welcome=1`, `?status=`). Shared
 *  by every surface that mounts `ProjectFiltersBar` (`/projects`, `/deal-room/pipeline`,
 *  `ProjectRegistryView`) so a filtered link means exactly the same thing everywhere. */
export const FILTER_PARAM_KEYS = [
  "search", "sectorId", "pillarId", "sdgId", "ministryId", "province", "financingType",
  "pipelineType", "minCapitalMillions", "maxCapitalMillions", "capitalBracket",
  "updatedWithin", "recentDataRoom",
] as const;

/** Parse the current query string into a validated `ProjectFilters` (ignoring unknown/invalid values),
 *  so shared filtered links restore exactly and taxonomy deep-links keep working. */
export function paramsToFilters(params: URLSearchParams): ProjectFilters {
  const next: ProjectFilters = {};

  const search = params.get("search");
  if (search) next.search = search;

  const sectorId = params.get("sectorId");
  if (sectorId && getSectorById(sectorId)) next.sectorId = sectorId;

  const pillarIds = params.getAll("pillarId").filter((id) => getPillarById(id));
  if (pillarIds.length) next.pillarId = pillarIds;

  const sdgIds = params.getAll("sdgId").filter((id) => getSdgById(id));
  if (sdgIds.length) next.sdgId = sdgIds;

  const ministryId = params.get("ministryId");
  if (ministryId && getMinistryById(ministryId)) next.ministryId = ministryId;

  const province = params.get("province");
  if (province) next.province = province;

  const financingTypes = params.getAll("financingType");
  if (financingTypes.length) next.financingType = financingTypes;

  const pipelineType = params.get("pipelineType");
  if (pipelineType === "zida_catalogue" || pipelineType === "policy_initiative") next.pipelineType = pipelineType;

  const minCap = Number(params.get("minCapitalMillions"));
  if (params.get("minCapitalMillions") && !Number.isNaN(minCap) && minCap > 0) next.minCapitalMillions = minCap;

  const maxCap = Number(params.get("maxCapitalMillions"));
  if (params.get("maxCapitalMillions") && !Number.isNaN(maxCap) && maxCap > 0) next.maxCapitalMillions = maxCap;

  const capitalBracket = params.get("capitalBracket");
  if (capitalBracket && CAPITAL_BRACKET_VALUES.includes(capitalBracket as CapitalBracket)) {
    next.capitalBracket = capitalBracket as CapitalBracket;
  }

  const updatedWithin = params.get("updatedWithin");
  if (updatedWithin && UPDATED_WITHIN_VALUES.includes(updatedWithin as UpdatedWithin)) {
    next.updatedWithin = updatedWithin as UpdatedWithin;
  }

  if (params.get("recentDataRoom") === "1") next.recentDataRoom = true;

  return next;
}

/** Coerce the multi-select fields (pillarId, sdgId, financingType) to arrays. Guards against
 *  saved searches persisted before these fields became multi-select (stored as plain strings),
 *  so applying an old saved search can't crash the array-based matcher. */
export function normalizeFilters(filters: ProjectFilters): ProjectFilters {
  const toArray = (v: unknown): string[] | undefined => {
    if (Array.isArray(v)) return v.length ? (v as string[]) : undefined;
    if (typeof v === "string" && v) return [v];
    return undefined;
  };
  return {
    ...filters,
    pillarId: toArray(filters.pillarId),
    sdgId: toArray(filters.sdgId),
    financingType: toArray(filters.financingType),
  };
}

/** Serialize filters back onto the current URL (preserving unrelated params) via replaceState so
 *  the address bar always reflects the active filter set and is shareable, without a navigation. */
export function syncFiltersToUrl(filters: ProjectFilters) {
  const params = new URLSearchParams(window.location.search);
  for (const key of FILTER_PARAM_KEYS) params.delete(key);

  if (filters.search) params.set("search", filters.search);
  if (filters.sectorId) params.set("sectorId", filters.sectorId);
  filters.pillarId?.forEach((id) => params.append("pillarId", id));
  filters.sdgId?.forEach((id) => params.append("sdgId", id));
  if (filters.ministryId) params.set("ministryId", filters.ministryId);
  if (filters.province) params.set("province", filters.province);
  filters.financingType?.forEach((v) => params.append("financingType", v));
  if (filters.pipelineType) params.set("pipelineType", filters.pipelineType);
  if (filters.minCapitalMillions) params.set("minCapitalMillions", String(filters.minCapitalMillions));
  if (filters.maxCapitalMillions) params.set("maxCapitalMillions", String(filters.maxCapitalMillions));
  if (filters.capitalBracket) params.set("capitalBracket", filters.capitalBracket);
  if (filters.updatedWithin) params.set("updatedWithin", filters.updatedWithin);
  if (filters.recentDataRoom) params.set("recentDataRoom", "1");

  const query = params.toString();
  window.history.replaceState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
}
