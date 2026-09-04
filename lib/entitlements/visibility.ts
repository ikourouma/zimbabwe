import type { DataVerificationStatus, DemoPersona, InvestmentProject, ProjectFilters, UpdatedWithin, VisibilityLevel } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";
import { classifyFinancingType, getFinancingBuckets } from "@/lib/utils/financing-type";
import { parseCapitalTotalMillions, matchesCapitalBracket } from "@/lib/utils/capital";
import { DEFAULT_FIELD_VISIBILITY, ENTITLEMENT_GROUPS, groupForField, type EntitlementGroupId, type FieldVisibilityMatrix } from "@/lib/entitlements/matrix";

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
  // ministry_admin gets full investor-grade financial visibility (same tier as government) on
  // whatever projects it can see — the *which projects* narrowing to their own ministry happens
  // separately in lib/entitlements/ministry-scope.ts, not here.
  if (role === "qualified" || role === "government" || role === "ministry_admin") return "qualified";
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
export function sanitizeProjectForAccess(
  project: InvestmentProject,
  accessLevel: AccessLevel,
  matrix: FieldVisibilityMatrix = DEFAULT_FIELD_VISIBILITY,
  costStructureHidden = false
): InvestmentProject {
  const next: InvestmentProject = { ...project };
  const hide = (field: keyof InvestmentProject) => {
    (next as unknown as Record<string, unknown>)[field] = Array.isArray(next[field]) ? [] : undefined;
  };
  for (const group of Object.values(ENTITLEMENT_GROUPS)) {
    const required = matrix[groupForField(group.fields[0]) ?? "basics"];
    if (LEVEL_RANK[accessLevel] >= LEVEL_RANK[required]) continue;
    for (const field of group.fields) {
      if (field in next) hide(field as keyof InvestmentProject);
    }
  }
  if (costStructureHidden && LEVEL_RANK[accessLevel] < LEVEL_RANK.admin) {
    next.capitalRequired = undefined;
  }
  if (LEVEL_RANK[accessLevel] < LEVEL_RANK[matrix.documents]) {
    next.documents = [];
    next.documentRecords = [];
  }
  return next;
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

/** Client/server shared gate for a stored entitlement group. `costStructureHidden` additionally
 *  hides E1 capital from everyone below admin, matching `sanitizeProjectForAccess`. */
export function canAccessEntitlementGroup(
  accessLevel: AccessLevel,
  group: EntitlementGroupId,
  matrix: FieldVisibilityMatrix = DEFAULT_FIELD_VISIBILITY,
  costStructureHidden = false
): boolean {
  if (group === "financialsE1" && costStructureHidden && LEVEL_RANK[accessLevel] < LEVEL_RANK.admin) {
    return false;
  }
  return LEVEL_RANK[accessLevel] >= LEVEL_RANK[matrix[group]];
}

/** True for `qualified`, `government`/`ministry_admin` (both mapped to "qualified" by
 *  `accessLevelForRole`), `admin`, and `super_admin` — i.e. everyone at or above the investor-
 *  verification tier. Use this (not the configurable `financialsE1` matrix row) for UI that
 *  renders parsed/itemized capital figures — e.g. `CapitalBreakdown`'s per-component dollar
 *  amounts and `EstInvestmentRange`'s aggregate range — which are qualified-only by fixed product
 *  policy, unlike the single public `capitalRequired` headline string that `financialsE1` governs. */
export function isQualifiedTier(accessLevel: AccessLevel): boolean {
  return LEVEL_RANK[accessLevel] >= LEVEL_RANK.qualified;
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

export function getRequiredLevelForField(field: string, matrix: FieldVisibilityMatrix = DEFAULT_FIELD_VISIBILITY): AccessLevel {
  const group = groupForField(field);
  if (group) return matrix[group];
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
