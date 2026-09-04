import type { AccessLevel } from "@/lib/entitlements/visibility";

export const ENTITLEMENT_GROUP_IDS = [
  "basics",
  "financialsE1",
  "financialsE2",
  "financialsE3",
  "narrative",
  "documents",
  "verification",
] as const;

export type EntitlementGroupId = (typeof ENTITLEMENT_GROUP_IDS)[number];

export type FieldVisibilityMatrix = Record<EntitlementGroupId, AccessLevel>;

export const ENTITLEMENT_GROUPS: Record<
  EntitlementGroupId,
  { label: string; fields: string[]; defaultLevel: AccessLevel }
> = {
  basics: {
    label: "Basics & Identity",
    fields: ["title", "sector", "location", "ministries", "projectOwner", "province", "district", "projectReadiness"],
    defaultLevel: "public",
  },
  financialsE1: {
    label: "Financials E1 (capital, financing, jobs, impact)",
    fields: ["capitalRequired", "financingType", "developmentImpact", "jobsDirect", "jobsIndirect"],
    defaultLevel: "public",
  },
  financialsE2: {
    label: "Financials E2 (IRR, NPV, capital structure)",
    fields: ["irr", "npv", "roi", "paybackPeriod", "projectedRevenue", "investmentSource", "capitalStructure", "shareholderContribution"],
    defaultLevel: "qualified",
  },
  financialsE3: {
    label: "Financials E3 (company capability)",
    fields: ["sectorExperienceYears", "priorProjectsCompleted", "annualTurnover", "financingConfirmation", "financingPartners"],
    defaultLevel: "qualified",
  },
  narrative: {
    label: "Narrative & Taxonomy",
    fields: ["opportunitySummary", "description", "scope"],
    defaultLevel: "public",
  },
  documents: {
    label: "Documents & Investor Pack",
    fields: ["documents", "meeting", "investorPack"],
    defaultLevel: "qualified",
  },
  verification: {
    label: "Data Verification Status",
    fields: ["dataVerificationStatus"],
    defaultLevel: "public",
  },
};

export const DEFAULT_FIELD_VISIBILITY: FieldVisibilityMatrix = {
  basics: "public",
  financialsE1: "public",
  financialsE2: "qualified",
  financialsE3: "qualified",
  narrative: "public",
  documents: "qualified",
  verification: "public",
};

export function mergeFieldVisibility(raw: unknown): FieldVisibilityMatrix {
  const merged: FieldVisibilityMatrix = { ...DEFAULT_FIELD_VISIBILITY };
  if (!raw || typeof raw !== "object") return merged;
  const record = raw as Record<string, unknown>;
  for (const id of ENTITLEMENT_GROUP_IDS) {
    const value = record[id];
    if (value === "public" || value === "registered" || value === "qualified" || value === "admin") {
      merged[id] = value;
    }
  }
  return merged;
}

export function groupForField(field: string): EntitlementGroupId | null {
  for (const id of ENTITLEMENT_GROUP_IDS) {
    if (ENTITLEMENT_GROUPS[id].fields.includes(field)) return id;
  }
  return null;
}
