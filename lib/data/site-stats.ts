import { zimbabweProjects } from "@/lib/data/zimbabwe-projects";
import {
  sectors as seedSectors,
  strategicPillars as seedPillars,
  provinces as seedProvinces,
  ministries as seedMinistries,
  sdgs,
  subsectors,
} from "@/lib/data/taxonomies";
import { parseCapitalTotalMillions, formatMillions } from "@/lib/utils/capital";
import type { InvestmentProject, Ministry, Sector, StrategicPillar } from "@/lib/types";

interface ComputeSiteStatsInput {
  projects: InvestmentProject[];
  sectors: Sector[];
  pillars: StrategicPillar[];
  provinces: string[];
  ministries?: Ministry[];
}

/** Pure, reactive-friendly stats computation — takes live data as parameters instead of
 *  reading static seeds directly, so it works identically from a server call or a client
 *  hook backed by ProjectStoreContext / TaxonomyStoreContext. */
export function computeSiteStats({ projects, sectors, pillars, provinces, ministries = seedMinistries }: ComputeSiteStatsInput) {
  const published = projects.filter((p) => p.projectStatus === "published");

  return {
    totalProjects: projects.length,
    publishedProjects: published.length,
    sectorCount: sectors.length,
    pillarCount: pillars.length,
    sdgCount: sdgs.length,
    ministryCount: ministries.length,
    subsectorCount: subsectors.length,
    provinceCount: provinces.length,
    provinces: [...provinces].sort(),
    sourceYear: "2025",
    verificationNote: "From ZIDA 2025 deck — pending official validation",
  };
}

/** Zero-arg wrapper over static seed data, for server-side/non-reactive callers that don't
 *  have access to the live stores (e.g. other content pages, sitemap generation). */
export function getSiteStats() {
  return computeSiteStats({
    projects: zimbabweProjects,
    sectors: seedSectors,
    pillars: seedPillars,
    provinces: seedProvinces,
    ministries: seedMinistries,
  });
}

/** Reactive-friendly: pass the live `projects` array from useProjectStore() so admin edits in
 *  /admin-demo flow through in real time; defaults to the static seed for non-reactive callers. */
export function getSectorStats(sectorId: string, projects: InvestmentProject[] = zimbabweProjects) {
  const sectorProjects = projects.filter((p) => p.sectorId === sectorId);
  const published = sectorProjects.filter((p) => p.projectStatus === "published");
  const sectorSubsectors = new Set(sectorProjects.map((p) => p.subsectorId).filter(Boolean));
  const provinces = new Set(sectorProjects.map((p) => p.province).filter(Boolean));

  // Only published projects back a displayable estimate — an unreviewed/draft figure isn't a
  // real, live investable opportunity yet, so it must never inflate an aggregate range shown
  // to investors (see getPillarStats/getMinistryStats/getSdgStats for the same rule).
  const capitals = published
    .map((p) => parseCapitalTotalMillions(p.capitalRequired))
    .filter((n): n is number => n !== null);

  return {
    total: sectorProjects.length,
    published: published.length,
    subsectorCount: sectorSubsectors.size,
    provinceCount: provinces.size,
    exampleTitles: published.slice(0, 3).map((p) => p.title),
    capitalRange: formatCapitalRange(capitals),
  };
}

/** Same shape as getSectorStats but scoped to one subsector — backs the linked-project count
 *  shown in the Taxonomies "Subsectors" tab and its delete-guard (item 4/Phase 4). */
export function getSubsectorStats(subsectorId: string, projects: InvestmentProject[] = zimbabweProjects) {
  const subsectorProjects = projects.filter((p) => p.subsectorId === subsectorId);
  const published = subsectorProjects.filter((p) => p.projectStatus === "published");
  return { total: subsectorProjects.length, published: published.length };
}

/** Reactive-friendly: pass the live `projects` array from useProjectStore() so admin edits in
 *  /admin-demo flow through in real time; defaults to the static seed for non-reactive callers. */
export function getPillarStats(pillarId: string, projects: InvestmentProject[] = zimbabweProjects) {
  const pillarProjects = projects.filter((p) =>
    p.strategicPillarIds.includes(pillarId)
  );
  const published = pillarProjects.filter((p) => p.projectStatus === "published");
  // Published-only: see the comment in getSectorStats.
  const capitals = published
    .map((p) => parseCapitalTotalMillions(p.capitalRequired))
    .filter((n): n is number => n !== null);

  return {
    total: pillarProjects.length,
    published: published.length,
    capitalRange: formatCapitalRange(capitals),
  };
}

/** "Active" once at least half of a pillar's tagged projects are published; otherwise "Planning". */
export function getPillarPhase(
  pillarId: string,
  projects: InvestmentProject[] = zimbabweProjects
): "Active" | "Planning" {
  const pillarProjects = projects.filter((p) => p.strategicPillarIds.includes(pillarId));
  if (pillarProjects.length === 0) return "Planning";
  const publishedRatio =
    pillarProjects.filter((p) => p.projectStatus === "published").length / pillarProjects.length;
  return publishedRatio >= 0.5 ? "Active" : "Planning";
}

/** Unique beneficiary-ministry short names (primary + secondary) across a pillar's tagged projects. */
export function getPillarLeadMinistries(
  pillarId: string,
  projects: InvestmentProject[] = zimbabweProjects,
  ministries: Ministry[] = seedMinistries
): string[] {
  const pillarProjects = projects.filter((p) => p.strategicPillarIds.includes(pillarId));
  const ministryIds = new Set<string>();
  pillarProjects.forEach((p) => {
    ministryIds.add(p.primaryBeneficiaryMinistryId);
    p.secondaryBeneficiaryMinistryIds?.forEach((id) => ministryIds.add(id));
  });
  const shortNames = new Set<string>();
  ministryIds.forEach((id) => {
    const ministry = ministries.find((m) => m.id === id);
    if (ministry) shortNames.add(ministry.shortName);
  });
  return Array.from(shortNames).sort();
}

/** Count of "policy_initiative" (illustrative, TA-required) projects tagged to a pillar — kept
 *  separate from the headline Priority Projects count for transparency, not folded into it. */
export function getPillarIllustrativeCount(
  pillarId: string,
  projects: InvestmentProject[] = zimbabweProjects
): number {
  return projects.filter(
    (p) => p.strategicPillarIds.includes(pillarId) && p.pipelineType === "policy_initiative"
  ).length;
}

/** Projects aligned to a ministry — as primary OR secondary beneficiary — mirroring getPillarStats. */
export function getMinistryStats(ministryId: string, projects: InvestmentProject[] = zimbabweProjects) {
  const ministryProjects = projects.filter(
    (p) =>
      p.primaryBeneficiaryMinistryId === ministryId ||
      p.secondaryBeneficiaryMinistryIds?.includes(ministryId)
  );
  const published = ministryProjects.filter((p) => p.projectStatus === "published");
  // Published-only: see the comment in getSectorStats.
  const capitals = published
    .map((p) => parseCapitalTotalMillions(p.capitalRequired))
    .filter((n): n is number => n !== null);

  return {
    total: ministryProjects.length,
    published: published.length,
    capitalRange: formatCapitalRange(capitals),
  };
}

/** Projects tagged to a given SDG — mirroring getPillarStats. */
export function getSdgStats(sdgId: string, projects: InvestmentProject[] = zimbabweProjects) {
  const sdgProjects = projects.filter((p) => p.sdgIds.includes(sdgId));
  const published = sdgProjects.filter((p) => p.projectStatus === "published");
  // Published-only: see the comment in getSectorStats.
  const capitals = published
    .map((p) => parseCapitalTotalMillions(p.capitalRequired))
    .filter((n): n is number => n !== null);

  return {
    total: sdgProjects.length,
    published: published.length,
    capitalRange: formatCapitalRange(capitals),
  };
}

/** Values are in millions of USD; delegates to `formatMillions` so ranges spanning into the
 *  billions render as e.g. "$1.17B" instead of a misleadingly bare "$1168M". */
function formatCapitalRange(values: number[]): string | null {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return formatMillions(min);
  return `${formatMillions(min)} – ${formatMillions(max)}`;
}

export function getLargestCapitalProject(projects: InvestmentProject[]) {
  let best: InvestmentProject | null = null;
  let bestVal = -1;
  for (const p of projects) {
    const val = parseCapitalTotalMillions(p.capitalRequired);
    if (val !== null && val > bestVal) {
      bestVal = val;
      best = p;
    }
  }
  return best;
}
