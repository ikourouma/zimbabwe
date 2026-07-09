export type ProjectStatus =
  | "draft"
  | "submitted_for_review"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "archived";

export type VisibilityLevel =
  | "public"
  | "registered"
  | "qualified_investor"
  | "admin_only";

export type DataVerificationStatus =
  | "unverified"
  | "pending_review"
  | "verified";

export type EntityStatus = "active" | "inactive" | "pending_validation";

export type DemoPersona =
  | "public"
  | "registered"
  | "qualified"
  | "government"
  | "admin"
  | "super_admin";

export interface Sector {
  id: string;
  name: string;
  /** Short label for compact single-line UI (badges, chips). Falls back to `name` when unset. */
  shortName?: string;
  slug: string;
  description: string;
  status: EntityStatus;
}

export interface Subsector {
  id: string;
  sectorId: string;
  name: string;
  slug: string;
  status: EntityStatus;
}

export interface StrategicPillar {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** 1-2 sentence mandate paragraph shown in the pillar detail panel. */
  strategicMandate: string;
  /** 3 target-outcome bullets shown in the pillar detail panel. */
  targetOutcomes: string[];
  /** Illustrative mapping to real national policy/strategy documents — pending official validation. */
  policyAlignment: { primary: string; secondary?: string };
  status: EntityStatus;
}

export interface SDG {
  id: string;
  number: number;
  name: string;
  colorToken: string;
  description: string;
}

export interface Ministry {
  id: string;
  name: string;
  shortName: string;
  type: "beneficiary" | "implementing";
  /** Illustrative office/title only (e.g. "Director of Investment Promotion") — never a named
   *  individual. Surfaced only in the gated Deal Room, never on public pages. Seeded later. */
  representativeTitle?: string;
  status: EntityStatus;
}

export interface Agency {
  id: string;
  name: string;
  parentMinistryId?: string;
  type: "agency" | "regulator" | "parastatal";
  status: EntityStatus;
}

export interface ContactReason {
  id: string;
  label: string;
  routingCategory: string;
  status: EntityStatus;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  scope: "platform" | "tenant" | "institutional";
}

export interface InvestmentProject {
  id: string;
  title: string;
  slug: string;
  sectorId: string;
  subsectorId?: string;
  /** undefined/"zida_catalogue" = a real ZIDA 2025 deck project; "policy_initiative" = an illustrative
   *  pipeline concept derived from a named national policy/strategy document, not ZIDA-appraised. */
  pipelineType?: "zida_catalogue" | "policy_initiative";
  strategicPillarIds: string[];
  sdgIds: string[];
  primaryBeneficiaryMinistryId: string;
  secondaryBeneficiaryMinistryIds?: string[];
  implementingAgencyId?: string;
  regulatorIds?: string[];
  projectOwner: string;
  location: string;
  province?: string;
  district?: string;
  capitalRequired?: string;
  financingType?: string;
  projectReadiness: string;
  projectStatus: ProjectStatus;
  visibilityLevel: VisibilityLevel;
  irr?: string;
  npv?: string;
  roi?: string;
  paybackPeriod?: string;
  projectedRevenue?: string;
  opportunitySummary: string;
  description: string;
  scope: string[];
  developmentImpact: string[];
  documents: string[];
  sourceReference?: string;
  dataVerificationStatus: DataVerificationStatus;
  reviewerNotes?: string;
  createdBy: string;
  submittedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  publishedBy?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  publishedAt?: string;
}

/**
 * Represents an investor's engagement with a specific project inside the Deal Room.
 * Deliberately shaped to mirror a real-world `investor_proposals`/`investor_engagements`
 * table (see BACKLOG.md "Demo to SaaS Migration Map") so this becomes a direct table
 * mapping rather than a data-model rework once a real backend exists — it is intentionally
 * kept separate from `LeadInquiry`, which represents contact/registration form submissions.
 */
export type InvestorEngagementStatus = "submitted" | "under_review" | "approved" | "rejected";

export interface InvestorEngagement {
  id: string;
  projectId: string;
  investorName: string;
  investorOrganization?: string;
  status: InvestorEngagementStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadInquiry {
  id: string;
  type:
    | "registration"
    | "contact"
    | "investment_interest"
    | "document_request"
    | "meeting_request"
    | "strategic_partnership";
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  message?: string;
  contactReasonId?: string;
  projectId?: string;
  createdAt: string;
  /** Strategic Partnerships & Inquiries wizard fields — captured only for that flow. */
  engagementType?: "investor" | "government_dfi" | "strategic_partner";
  investorType?: string;
  sectorIds?: string[];
  ticketSizeRange?: string;
  partnershipType?: string;
  ministryRepresented?: string;
  natureOfEngagement?: string;
  /** Demo-only admin review state — a client-side record of intent for the demo narrative, not a
   *  real backend authorization. Undefined on existing/older stored records is treated as "pending". */
  status?: "pending" | "approved" | "declined";
}

export interface ProjectFilters {
  search?: string;
  sectorId?: string;
  pillarId?: string;
  sdgId?: string;
  ministryId?: string;
  province?: string;
  /** Holds a `FinancingBucket` key (see lib/utils/financing-type.ts), not the raw free-text sentence. */
  financingType?: string;
  readiness?: string;
  status?: ProjectStatus;
  pipelineType?: "zida_catalogue" | "policy_initiative";
  /** Minimum parsed capital figure, in millions of USD (see parseCapitalTotalMillions). */
  minCapitalMillions?: number;
}

export type SeedProject = {
  id: string;
  title: string;
  slug: string;
  sector: string;
  subsector?: string;
  pipelineType?: "zida_catalogue" | "policy_initiative";
  location: string;
  province?: string;
  district?: string;
  projectOwner: string;
  beneficiaryMinistryPlaceholder: string;
  secondaryBeneficiaries?: string[];
  strategicPillars: string[];
  sdgs: string[];
  capitalRequired?: string;
  financingType?: string;
  projectStatus: ProjectStatus;
  readinessLevel?: string;
  visibilityLevel: VisibilityLevel;
  irr?: string;
  npv?: string;
  roi?: string;
  paybackPeriod?: string;
  projectedRevenue?: string;
  opportunitySummary: string;
  description: string;
  scope: string[];
  impact: string[];
  documentPlaceholders: string[];
  sourceReference: string;
  dataVerificationStatus: DataVerificationStatus;
  reviewerNotes?: string;
};
