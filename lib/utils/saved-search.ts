import type { ProjectFilters } from "@/lib/types";
import { sectors, strategicPillars } from "@/lib/data/taxonomies";
import { formatMillions } from "@/lib/utils/capital";

const CAPITAL_BRACKET_TEXT: Record<string, string> = {
  micro: "under $2M",
  growth: "$2M–$10M",
  middle: "$10M–$50M",
  infrastructure: "$50M+",
  assessment_pending: "assessment pending",
};

const UPDATED_WITHIN_TEXT: Record<string, string> = {
  "7d": "updated in the past 7 days",
  "30d": "updated in the past 30 days",
  quarter: "updated this quarter",
};

/**
 * Renders a `ProjectFilters` mandate into the structured pieces a lead needs: the `sectorIds` a
 * saved-search inquiry should carry (so `describeInterest()` shows the sector) and a human-readable
 * `text` summary of the whole filter set for the inquiry message body.
 */
export function summarizeFiltersForLead(filters: ProjectFilters): { sectorIds: string[]; text: string } {
  const parts: string[] = [];

  const sectorIds = filters.sectorId ? [filters.sectorId] : [];
  if (filters.sectorId) {
    const sector = sectors.find((s) => s.id === filters.sectorId);
    if (sector) parts.push(`Sector: ${sector.name}`);
  }
  if (filters.pillarId?.length) {
    const names = filters.pillarId
      .map((id) => strategicPillars.find((p) => p.id === id)?.name.split("&")[0].trim())
      .filter(Boolean);
    if (names.length) parts.push(`Pillars: ${names.join(", ")}`);
  }
  if (filters.province) parts.push(`Province: ${filters.province}`);
  if (filters.financingType?.length) parts.push(`Financing: ${filters.financingType.join(", ")}`);
  if (filters.capitalBracket) parts.push(`Capital: ${CAPITAL_BRACKET_TEXT[filters.capitalBracket] ?? filters.capitalBracket}`);
  if (filters.minCapitalMillions) parts.push(`Min capital: ${formatMillions(filters.minCapitalMillions)}`);
  if (filters.maxCapitalMillions) parts.push(`Max capital: ${formatMillions(filters.maxCapitalMillions)}`);
  if (filters.updatedWithin) parts.push(UPDATED_WITHIN_TEXT[filters.updatedWithin] ?? filters.updatedWithin);
  if (filters.recentDataRoom) parts.push("recently updated data room");
  if (filters.search) parts.push(`Keyword: "${filters.search}"`);

  return { sectorIds, text: parts.length > 0 ? parts.join(" · ") : "All opportunities" };
}
