import type { DataVerificationStatus, DemoPersona, InvestmentProject, ProjectFilters, VisibilityLevel } from "@/lib/types";
import { classifyFinancingType, getFinancingBuckets } from "@/lib/utils/financing-type";
import { parseCapitalTotalMillions } from "@/lib/utils/capital";

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

export function canAccessContent(
  persona: DemoPersona,
  requiredLevel: AccessLevel
): boolean {
  return LEVEL_RANK[getAccessLevel(persona)] >= LEVEL_RANK[requiredLevel];
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
  if (filters.pillarId) {
    result = result.filter((p) => p.strategicPillarIds.includes(filters.pillarId!));
  }
  if (filters.sdgId) {
    result = result.filter((p) => p.sdgIds.includes(filters.sdgId!));
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
  if (filters.financingType) {
    result = result.filter((p) => classifyFinancingType(p.financingType) === filters.financingType);
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
  if (filters.minCapitalMillions) {
    result = result.filter((p) => {
      const capital = parseCapitalTotalMillions(p.capitalRequired);
      return capital !== null && capital >= filters.minCapitalMillions!;
    });
  }

  return result;
}

export function getUniqueProvinces(projects: InvestmentProject[]): string[] {
  const provinces = new Set<string>();
  for (const p of projects) {
    if (p.province) provinces.add(p.province);
  }
  return Array.from(provinces).sort();
}

export { getFinancingBuckets };
