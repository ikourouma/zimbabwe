import type { InferSelectModel } from "drizzle-orm";
import type { InvestmentProject } from "@/lib/types";
import type { projectDocuments, projects } from "@/lib/db/schema";

type ProjectRow = InferSelectModel<typeof projects>;
type DocumentRow = InferSelectModel<typeof projectDocuments>;

export interface ProjectRelations {
  strategicPillarIds: string[];
  sdgIds: string[];
  secondaryBeneficiaryMinistryIds: string[];
  regulatorIds: string[];
  provinceIds: string[];
  documents: DocumentRow[];
  teamAssignedUserIds: string[];
}

function toIso(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

// Drizzle's pg-core `numeric()` column reads back as a string (avoiding float precision loss on
// the round trip), so every structured financial field needs converting at the app boundary —
// same rationale as `toIso`/`toDate` below for timestamps.
function toNum(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toNumStr(value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value);
}

export function mapDbProjectToApp(row: ProjectRow, relations: ProjectRelations): InvestmentProject {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    sectorId: row.sectorId,
    subsectorId: row.subsectorId ?? undefined,
    pipelineType: row.pipelineType,
    strategicPillarIds: relations.strategicPillarIds,
    sdgIds: relations.sdgIds,
    primaryBeneficiaryMinistryId: row.primaryBeneficiaryMinistryId,
    secondaryBeneficiaryMinistryIds: relations.secondaryBeneficiaryMinistryIds.length
      ? relations.secondaryBeneficiaryMinistryIds
      : undefined,
    implementingAgencyId: row.implementingAgencyId ?? undefined,
    regulatorIds: relations.regulatorIds.length ? relations.regulatorIds : undefined,
    assignedStaffUserId: row.assignedStaffUserId ?? undefined,
    assignedReviewingOfficerUserId: row.assignedReviewingOfficerUserId ?? undefined,
    projectOwner: row.projectOwner,
    location: row.location,
    province: row.province ?? undefined,
    district: row.district ?? undefined,
    provinceIds: relations.provinceIds.length ? relations.provinceIds : undefined,
    capitalRequired: row.capitalRequired ?? undefined,
    capitalTotalUsd: toNum(row.capitalTotalUsd),
    capitalEquityUsd: toNum(row.capitalEquityUsd),
    capitalDebtUsd: toNum(row.capitalDebtUsd),
    financingType: row.financingType ?? undefined,
    projectReadiness: row.projectReadiness,
    projectStatus: row.projectStatus,
    visibilityLevel: row.visibilityLevel,
    irr: row.irr ?? undefined,
    npv: row.npv ?? undefined,
    roi: row.roi ?? undefined,
    paybackPeriod: row.paybackPeriod ?? undefined,
    projectedRevenue: row.projectedRevenue ?? undefined,
    irrPct: toNum(row.irrPct),
    npvUsd: toNum(row.npvUsd),
    roiPct: toNum(row.roiPct),
    paybackMonths: row.paybackMonths ?? undefined,
    projectedRevenueUsd: toNum(row.projectedRevenueUsd),
    projectedRevenueYears: row.projectedRevenueYears ?? undefined,
    financialDataCaveat: row.financialDataCaveat ?? undefined,
    investmentSource: row.investmentSource ?? undefined,
    capitalStructure: row.capitalStructure ?? undefined,
    shareholderContribution: row.shareholderContribution ?? undefined,
    sectorExperienceYears: row.sectorExperienceYears ?? undefined,
    priorProjectsCompleted: row.priorProjectsCompleted ?? undefined,
    annualTurnover: row.annualTurnover ?? undefined,
    financingConfirmation: row.financingConfirmation ?? undefined,
    financingPartners: row.financingPartners ?? undefined,
    opportunitySummary: row.opportunitySummary,
    description: row.description,
    scope: row.scope,
    developmentImpact: row.developmentImpact,
    jobsDirect: row.jobsDirect ?? undefined,
    jobsIndirect: row.jobsIndirect ?? undefined,
    documents: relations.documents.map((d) => d.title),
    documentRecords: relations.documents.map((d) => ({
      id: d.id,
      title: d.title,
      visibilityLevel: d.visibilityLevel,
      fileName: d.fileName ?? d.title,
      createdAt: d.createdAt.toISOString(),
    })),
    sourceReference: row.sourceReference ?? undefined,
    recordStandard: row.recordStandard ?? undefined,
    dataVerificationStatus: row.dataVerificationStatus,
    reviewerNotes: row.reviewerNotes ?? undefined,
    createdBy: row.createdBy,
    investorSubmitted: row.investorSubmitted,
    teamAssignedUserIds: relations.teamAssignedUserIds.length ? relations.teamAssignedUserIds : undefined,
    submittedBy: row.submittedBy ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    approvedBy: row.approvedBy ?? undefined,
    publishedBy: row.publishedBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    submittedAt: toIso(row.submittedAt),
    reviewedAt: toIso(row.reviewedAt),
    approvedAt: toIso(row.approvedAt),
    publishedAt: toIso(row.publishedAt),
  };
}

function toDate(value: string | undefined): Date | null {
  return value ? new Date(value) : null;
}

/** Maps app-layer project fields to a Drizzle `projects` insert/update shape. */
export function mapAppProjectToDbRow(project: Partial<InvestmentProject>) {
  return {
    title: project.title,
    slug: project.slug,
    sectorId: project.sectorId,
    subsectorId: project.subsectorId ?? null,
    pipelineType: project.pipelineType ?? "zida_catalogue",
    primaryBeneficiaryMinistryId: project.primaryBeneficiaryMinistryId,
    implementingAgencyId: project.implementingAgencyId ?? null,
    assignedStaffUserId: project.assignedStaffUserId ?? null,
    assignedReviewingOfficerUserId: project.assignedReviewingOfficerUserId ?? null,
    projectOwner: project.projectOwner,
    location: project.location,
    province: project.province ?? null,
    district: project.district ?? null,
    capitalRequired: project.capitalRequired ?? null,
    capitalTotalUsd: toNumStr(project.capitalTotalUsd),
    capitalEquityUsd: toNumStr(project.capitalEquityUsd),
    capitalDebtUsd: toNumStr(project.capitalDebtUsd),
    financingType: project.financingType ?? null,
    projectReadiness: project.projectReadiness,
    projectStatus: project.projectStatus,
    visibilityLevel: project.visibilityLevel,
    irr: project.irr ?? null,
    npv: project.npv ?? null,
    roi: project.roi ?? null,
    paybackPeriod: project.paybackPeriod ?? null,
    projectedRevenue: project.projectedRevenue ?? null,
    irrPct: toNumStr(project.irrPct),
    npvUsd: toNumStr(project.npvUsd),
    roiPct: toNumStr(project.roiPct),
    paybackMonths: project.paybackMonths ?? null,
    projectedRevenueUsd: toNumStr(project.projectedRevenueUsd),
    projectedRevenueYears: project.projectedRevenueYears ?? null,
    financialDataCaveat: project.financialDataCaveat ?? null,
    investmentSource: project.investmentSource ?? null,
    capitalStructure: project.capitalStructure ?? null,
    shareholderContribution: project.shareholderContribution ?? null,
    sectorExperienceYears: project.sectorExperienceYears ?? null,
    priorProjectsCompleted: project.priorProjectsCompleted ?? null,
    annualTurnover: project.annualTurnover ?? null,
    financingConfirmation: project.financingConfirmation ?? null,
    financingPartners: project.financingPartners ?? null,
    opportunitySummary: project.opportunitySummary,
    description: project.description,
    scope: project.scope,
    developmentImpact: project.developmentImpact,
    jobsDirect: project.jobsDirect ?? null,
    jobsIndirect: project.jobsIndirect ?? null,
    sourceReference: project.sourceReference ?? null,
    recordStandard: project.recordStandard ?? null,
    dataVerificationStatus: project.dataVerificationStatus,
    reviewerNotes: project.reviewerNotes ?? null,
    createdBy: project.createdBy,
    investorSubmitted: project.investorSubmitted ?? false,
    submittedBy: project.submittedBy ?? null,
    reviewedBy: project.reviewedBy ?? null,
    approvedBy: project.approvedBy ?? null,
    publishedBy: project.publishedBy ?? null,
    createdAt: project.createdAt ? new Date(project.createdAt) : undefined,
    updatedAt: project.updatedAt ? new Date(project.updatedAt) : undefined,
    submittedAt: toDate(project.submittedAt),
    reviewedAt: toDate(project.reviewedAt),
    approvedAt: toDate(project.approvedAt),
    publishedAt: toDate(project.publishedAt),
  };
}
