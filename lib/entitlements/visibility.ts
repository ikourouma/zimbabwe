import type { DataVerificationStatus, DemoPersona, InvestmentProject, ProjectFilters, UpdatedWithin, VisibilityLevel } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";
import { classifyFinancingType, getFinancingBuckets } from "@/lib/utils/financing-type";
import { parseCapitalTotalMillions, matchesCapitalBracket } from "@/lib/utils/capital";

export type AccessLevel = "public" | "registered" | "qualified" | "admin";

const PERSONA_ACCESS: Record<DemoPersona, AccessLevel> = {
  public: "public",
  registered: "registered",
  qualified: "qualified",
  government: "qualified",
  admin: "admin",
  super_admin: "admin",
};

const LEVEL_RANK: Record<AccessLevel, number> = {
  public: 0,
  registered: 1,
  qualified: 2,
  admin: 3,
};

const VISIBILITY_RANK: Record<VisibilityLevel, AccessLevel> = {
  public: "public",
  registered: "registered",
  qualified_investor: "qualified",
  admin_only: "admin",
};

export function getAccessLevel(persona: DemoPersona): AccessLevel {
  return PERSONA_ACCESS[persona];
}

/** Maps a real account role (or null for anonymous) to its content access level — the server-side
 *  counterpart to `getAccessLevel(persona)`, used by the /api/projects GET routes to decide what to
 *  expose. */
export function accessLevelForRole(role: AccountRole | null): AccessLevel {
  if (role === "admin" || role === "super_admin") return "admin";
  if (role === "qualified" || role === "government") return "qualified";
  if (role === "registered") return "registered";
  return "public";
}

/**
 * Strips investor-grade confidential fields from a project for callers below the "qualified" tier,
 * so the public/registered `GET /api/projects` responses never ship data-room-only figures over the
 * wire (previously they were returned unauthenticated). Qualified investors, government, admins, and
 * super admins receive the full record unchanged, so every authenticated dashboard keeps working.
 *
 * NOTE: `capitalRequired` (headline cost structure) is deliberately preserved for all tiers — it is
 * a public discovery signal shown on registry cards and drives the public capital-bracket filter;
 * its sitewide exposure is governed separately by the `costStructureHidden` kill switch. The masked
 * set here is the return-metric/data-room content that is qualified-only by policy.
 */
export function sanitizeProjectForAccess(project: InvestmentProject, accessLevel: AccessLevel): InvestmentProject {
  if (LEVEL_RANK[accessLevel] >= LEVEL_RANK.qualified) return project;
  return {
    ...project,
    irr: undefined,
    npv: undefined,
    roi: undefined,
    paybackPeriod: undefined,
    projectedRevenue: undefined,
    documents: [],
  };
}

export function canAccessContent(
  persona: DemoPersona,
  requiredLevel: AccessLevel
): boolean {
  return LEVEL_RANK[getAccessLevel(persona)] >= LEVEL_RANK[requiredLevel];
}

/** Server-side (real-role) counterpart to `canAccessContent` — used to gate real document
 *  downloads (e.g. GET /api/projects/[id]/documents/[docId]/download) by a `VisibilityLevel`
 *  column value rather than a persona. */
export function canAccessVisibilityLevel(accessLevel: AccessLevel, requiredLevel: VisibilityLevel): boolean {
  return LEVEL_RANK[accessLevel] >= LEVEL_RANK[VISIBILITY_RANK[requiredLevel]];
}

export function canViewProject(
  persona: DemoPersona,
  project: InvestmentProject
): boolean {
  if (persona === "admin" || persona === "super_admin") return true;
  if (project.projectStatus !== "published") return false;
  const required = VISIBILITY_RANK[project.visibilityLevel];
  return canAccessContent(persona, required);
}

export function getRequiredLevelForField(field: string): AccessLevel {
  const publicFields = [
    "title",
    "sector",
    "location",
    "opportunitySummary",
    "description",
    "ministries",
    "projectOwner",
    "province",
    "district",
    "dataVerificationStatus",
    "scope",
    "developmentImpact",
    "projectReadiness",
    "financingType",
  ];
  const registeredFields: string[] = [];
  // Financial figures require admin-approved "qualified" investor status, not just registration —
  // a project's own dollar amounts (cost breakdown, returns) stay reserved for vetted investors,
  // matching real DFI/PE data-room practice, while everything else above is public-disclosure-safe.
  const qualifiedFields = ["documents", "meeting", "investorPack", "irr", "npv", "roi", "paybackPeriod", "projectedRevenue", "capitalRequired"];

  if (publicFields.includes(field)) return "public";
  if (registeredFields.includes(field)) return "registered";
  if (qualifiedFields.includes(field)) return "qualified";
  return "admin";
}

/** Human labels for the always-public data-provenance status shown on project detail pages —
 *  per the institutional-disclosure principle (WBG/IFC pages always disclose verification state). */
export const DATA_VERIFICATION_LABELS: Record<DataVerificationStatus, string> = {
  unverified: "Unverified",
  pending_review: "Pending Official Validation",
  verified: "Verified",
};

export function filterProjects(
  projects: InvestmentProject[],
  filters: ProjectFilters,
  persona: DemoPersona = "public"
): InvestmentProject[] {
  let result = projects;

  if (persona === "public" || persona === "registered" || persona === "qualified" || persona === "government") {
    result = result.filter((p) => p.projectStatus === "published");
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.projectOwner.toLowerCase().includes(q) ||
        p.opportunitySummary.toLowerCase().includes(q)
    );
  }

  if (filters.sectorId) {
    result = result.filter((p) => p.sectorId === filters.sectorId);
  }
  if (filters.pillarId?.length) {
    result = result.filter((p) => filters.pillarId!.some((id) => p.strategicPillarIds.includes(id)));
  }
  if (filters.sdgId?.length) {
    result = result.filter((p) => filters.sdgId!.some((id) => p.sdgIds.includes(id)));
  }
  if (filters.ministryId) {
    result = result.filter(
      (p) =>
        p.primaryBeneficiaryMinistryId === filters.ministryId ||
        p.secondaryBeneficiaryMinistryIds?.includes(filters.ministryId!)
    );
  }
  if (filters.province) {
    result = result.filter((p) => p.province?.toLowerCase().includes(filters.province!.toLowerCase()));
  }
  if (filters.financingType?.length) {
    result = result.filter((p) => filters.financingType!.includes(classifyFinancingType(p.financingType)));
  }
  if (filters.readiness) {
    result = result.filter((p) =>
      p.projectReadiness.toLowerCase().includes(filters.readiness!.toLowerCase())
    );
  }
  if (filters.status) {
    result = result.filter((p) => p.projectStatus === filters.status);
  }
  if (filters.pipelineType) {
    result = result.filter((p) =>
      filters.pipelineType === "policy_initiative"
        ? p.pipelineType === "policy_initiative"
        : !p.pipelineType || p.pipelineType === "zida_catalogue"
    );
  }
  if (filters.capitalBracket) {
    result = result.filter((p) => matchesCapitalBracket(p.capitalRequired, filters.capitalBracket!));
  }
  if (filters.minCapitalMillions) {
    result = result.filter((p) => {
      const capital = parseCapitalTotalMillions(p.capitalRequired);
      return capital !== null && capital >= filters.minCapitalMillions!;
    });
  }
  if (filters.maxCapitalMillions) {
    result = result.filter((p) => {
      const capital = parseCapitalTotalMillions(p.capitalRequired);
      return capital !== null && capital <= filters.maxCapitalMillions!;
    });
  }
  if (filters.updatedWithin) {
    const cutoff = getUpdatedWithinCutoff(filters.updatedWithin);
    result = result.filter((p) => {
      const updated = Date.parse(p.updatedAt);
      return !Number.isNaN(updated) && updated >= cutoff;
    });
  }
  if (filters.recentDataRoom) {
    const cutoff = getUpdatedWithinCutoff("30d");
    result = result.filter((p) => {
      if (!p.documents || p.documents.length === 0) return false;
      const updated = Date.parse(p.updatedAt);
      return !Number.isNaN(updated) && updated >= cutoff;
    });
  }

  return result;
}

/** Resolves an `updatedWithin` preset to an epoch-ms cutoff. `7d`/`30d` are rolling windows;
 *  `quarter` is the start of the current calendar quarter (computed dynamically, not hardcoded). */
function getUpdatedWithinCutoff(within: UpdatedWithin, now: Date = new Date()): number {
  if (within === "quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return new Date(now.getFullYear(), quarterStartMonth, 1).getTime();
  }
  const days = within === "7d" ? 7 : 30;
  return now.getTime() - days * 24 * 60 * 60 * 1000;
}

export function getUniqueProvinces(projects: InvestmentProject[]): string[] {
  const provinces = new Set<string>();
  for (const p of projects) {
    if (p.province) provinces.add(p.province);
  }
  return Array.from(provinces).sort();
}

export { getFinancingBuckets };
