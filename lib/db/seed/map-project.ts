import type { InvestmentProject } from "@/lib/types";

function toDate(value: string | undefined): Date | null {
  return value ? new Date(value) : null;
}

/** Maps demo `InvestmentProject` rows to Drizzle `projects` insert shape (uuid assigned by DB). */
export function mapProjectToDbRow(project: InvestmentProject) {
  return {
    title: project.title,
    slug: project.slug,
    sectorId: project.sectorId,
    subsectorId: project.subsectorId ?? null,
    pipelineType: project.pipelineType ?? "zida_catalogue",
    primaryBeneficiaryMinistryId: project.primaryBeneficiaryMinistryId,
    implementingAgencyId: project.implementingAgencyId ?? null,
    projectOwner: project.projectOwner,
    location: project.location,
    province: project.province ?? null,
    district: project.district ?? null,
    capitalRequired: project.capitalRequired ?? null,
    financingType: project.financingType ?? null,
    projectReadiness: project.projectReadiness,
    projectStatus: project.projectStatus,
    visibilityLevel: project.visibilityLevel,
    irr: project.irr ?? null,
    npv: project.npv ?? null,
    roi: project.roi ?? null,
    paybackPeriod: project.paybackPeriod ?? null,
    projectedRevenue: project.projectedRevenue ?? null,
    opportunitySummary: project.opportunitySummary,
    description: project.description,
    scope: project.scope,
    developmentImpact: project.developmentImpact,
    sourceReference: project.sourceReference ?? null,
    dataVerificationStatus: project.dataVerificationStatus,
    reviewerNotes: project.reviewerNotes ?? null,
    createdBy: project.createdBy,
    submittedBy: project.submittedBy ?? null,
    reviewedBy: project.reviewedBy ?? null,
    approvedBy: project.approvedBy ?? null,
    publishedBy: project.publishedBy ?? null,
    createdAt: toDate(project.createdAt) ?? new Date(),
    updatedAt: toDate(project.updatedAt) ?? new Date(),
    submittedAt: toDate(project.submittedAt),
    reviewedAt: toDate(project.reviewedAt),
    approvedAt: toDate(project.approvedAt),
    publishedAt: toDate(project.publishedAt),
  };
}
