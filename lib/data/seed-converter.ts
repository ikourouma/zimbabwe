import type { SeedProject } from "@/lib/types";
import {
  getMinistryByName,
  getPillarByName,
  getSdgByLabel,
  getSubsectorByName,
  sectors,
} from "./taxonomies";

function getSectorId(sectorName: string): string {
  const sector = sectors.find((s) => s.name === sectorName);
  if (!sector) throw new Error(`Unknown sector: ${sectorName}`);
  return sector.id;
}

function mapMinistry(name: string): string {
  const ministry = getMinistryByName(name);
  if (!ministry) throw new Error(`Unknown ministry placeholder: ${name}`);
  return ministry.id;
}

const DEMO_CREATED = "ZIDA Admin (Demo)";
const DEMO_APPROVER = "ZIDA Reviewer (Demo)";
const DEMO_PUBLISHER = "Afronovation Super Admin";

export function convertSeedProject(seed: SeedProject, index: number) {
  const sectorId = getSectorId(seed.sector);
  const subsector = seed.subsector
    ? getSubsectorByName(sectorId, seed.subsector)
    : undefined;

  const baseDate = new Date("2025-09-01T00:00:00.000Z");
  baseDate.setDate(baseDate.getDate() + index);
  const createdAt = baseDate.toISOString();
  const updatedAt = createdAt;

  const isPublished = seed.projectStatus === "published";
  const isApproved = seed.projectStatus === "approved" || isPublished;

  return {
    id: seed.id,
    title: seed.title,
    slug: seed.slug,
    sectorId,
    subsectorId: subsector?.id,
    pipelineType: seed.pipelineType,
    // Dedupe: some seed projects still list both halves of a merged/split pillar pair
    // (e.g. old "Energy" + "Climate" tags), which now resolve to the same pillar id.
    strategicPillarIds: Array.from(
      new Set(
        seed.strategicPillars.map((p) => {
          const pillar = getPillarByName(p);
          if (!pillar) throw new Error(`Unknown pillar: ${p}`);
          return pillar.id;
        })
      )
    ),
    sdgIds: seed.sdgs.map((s) => {
      const sdg = getSdgByLabel(s);
      if (!sdg) throw new Error(`Unknown SDG: ${s}`);
      return sdg.id;
    }),
    primaryBeneficiaryMinistryId: mapMinistry(seed.beneficiaryMinistryPlaceholder),
    secondaryBeneficiaryMinistryIds: seed.secondaryBeneficiaries?.map(mapMinistry),
    projectOwner: seed.projectOwner,
    location: seed.location,
    province: seed.province,
    district: seed.district,
    capitalRequired: seed.capitalRequired,
    financingType: seed.financingType,
    projectReadiness: seed.readinessLevel ?? "Pending official validation",
    projectStatus: seed.projectStatus,
    visibilityLevel: seed.visibilityLevel,
    irr: seed.irr,
    npv: seed.npv,
    roi: seed.roi,
    paybackPeriod: seed.paybackPeriod,
    projectedRevenue: seed.projectedRevenue,
    opportunitySummary: seed.opportunitySummary,
    description: seed.description,
    scope: seed.scope,
    developmentImpact: seed.impact,
    documents: seed.documentPlaceholders,
    sourceReference: seed.sourceReference,
    dataVerificationStatus: seed.dataVerificationStatus,
    reviewerNotes: seed.reviewerNotes,
    createdBy: DEMO_CREATED,
    submittedBy: seed.projectStatus !== "draft" ? DEMO_CREATED : undefined,
    reviewedBy: ["under_review", "changes_requested", "approved", "published", "archived"].includes(seed.projectStatus)
      ? DEMO_APPROVER
      : undefined,
    approvedBy: isApproved ? DEMO_APPROVER : undefined,
    publishedBy: isPublished ? DEMO_PUBLISHER : undefined,
    createdAt,
    updatedAt,
    submittedAt: seed.projectStatus !== "draft" ? createdAt : undefined,
    reviewedAt: ["under_review", "changes_requested", "approved", "published", "archived"].includes(seed.projectStatus)
      ? createdAt
      : undefined,
    approvedAt: isApproved ? createdAt : undefined,
    publishedAt: isPublished ? createdAt : undefined,
  };
}

export function convertSeedProjects(seeds: SeedProject[]) {
  const converted = seeds.map((seed, i) => convertSeedProject(seed, i));

  const overrides: Record<string, Partial<ReturnType<typeof convertSeedProject>>> = {
    "zim-zida-009": { projectStatus: "approved", approvedBy: DEMO_APPROVER, approvedAt: converted[8].updatedAt },
    "zim-zida-025": { projectStatus: "approved", approvedBy: DEMO_APPROVER, approvedAt: converted[24].updatedAt },
    "zim-zida-007": { projectStatus: "under_review", reviewedBy: DEMO_APPROVER, reviewedAt: converted[6].updatedAt },
    "zim-zida-013": {
      projectStatus: "changes_requested",
      reviewerNotes: "Please validate capital requirement and update NPV figures with official financial model before resubmission.",
      reviewedBy: DEMO_APPROVER,
      reviewedAt: converted[12].updatedAt,
    },
    "zim-zida-030": {
      projectStatus: "draft",
      submittedBy: undefined,
      reviewedBy: undefined,
      approvedBy: undefined,
      publishedBy: undefined,
      submittedAt: undefined,
      reviewedAt: undefined,
      approvedAt: undefined,
      publishedAt: undefined,
    },
    "zim-zida-020": { projectStatus: "archived" },
  };

  return converted.map((p) => (overrides[p.id] ? { ...p, ...overrides[p.id] } : p));
}
