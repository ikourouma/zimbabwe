import type { AccountRole } from "@/lib/auth/types";

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

/** A real, R2-backed project artifact. No raw storage key is ever sent to the client — download
 *  goes through GET /api/projects/[id]/documents/[docId]/download. */
export interface ProjectDocumentRecord {
  id: string;
  title: string;
  visibilityLevel: VisibilityLevel;
  fileName: string;
  createdAt: string;
}

export type EntityStatus = "active" | "inactive" | "pending_validation";

export type DemoPersona =
  | "public"
  | "registered"
  | "qualified"
  | "government"
  | "admin"
  | "super_admin";

/** Platform-admin-authored MOU starting-draft defaults attached to a Sector or Ministry taxonomy
 *  row — consumed by getOrCreateMouForEngagement (lib/db/queries/mous.ts) to seed a new MOU's
 *  `content` instead of an empty object. Never auto-finalizes anything; ZIDA staff still edit and
 *  submit-for-review through the normal MOU lifecycle. */
export interface MouTemplateDefaults {
  termBullets?: string[];
  specialConditions?: string;
}

export interface Sector {
  id: string;
  name: string;
  /** Short label for compact single-line UI (badges, chips). Falls back to `name` when unset. */
  shortName?: string;
  slug: string;
  description: string;
  defaultMouTerms?: MouTemplateDefaults | null;
  status: EntityStatus;
  /** DB-backed, nested by fetchTaxonomies() — includes every status (active + pending_validation
   *  suggestions awaiting super_admin review); callers that need the public/selectable set should
   *  filter to `status === "active"` themselves (see the Propose-a-Project wizard's subsector
   *  picker and the Taxonomies "Subsectors" tab). */
  subsectors?: Subsector[];
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

export type AnnouncementAudience = "all" | "registered" | "qualified" | "government" | "admin" | "super_admin";
export type AnnouncementStyle = "info" | "success" | "warning" | "critical";
export type AnnouncementStatus = "active" | "draft" | "archived";

export type MarketingPopupStatus = "active" | "draft" | "archived";

export interface MarketingPopup {
  id: string;
  title: string;
  body: string;
  subtext: string | null;
  imageUrl: string | null;
  linkHref: string | null;
  linkLabel: string | null;
  priority: number;
  status: MarketingPopupStatus;
  startsAt: string;
  endsAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audienceRole: AnnouncementAudience;
  style: AnnouncementStyle;
  priority: number;
  startsAt: string;
  endsAt: string | null;
  dismissable: boolean;
  ctaLabel: string | null;
  ctaHref: string | null;
  status: AnnouncementStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ministry {
  id: string;
  name: string;
  shortName: string;
  type: "beneficiary" | "implementing";
  /** Illustrative office/title only (e.g. "Director of Investment Promotion") — never a named
   *  individual. Surfaced only in the gated Deal Room, never on public pages. Seeded later. */
  representativeTitle?: string;
  defaultMouTerms?: MouTemplateDefaults | null;
  /** Default ZIDA Case Manager (admin/super_admin userId) for this ministry's projects — see
   *  resolveProjectCaseManager. Settable via PATCH /api/ministries/[id]/case-manager. */
  assignedStaffUserId?: string | null;
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
  /** Write-only: when a proposer picks "Other (not listed)" in the Propose-a-Project wizard, this
   *  carries the free-text name so the server can create a `pending_validation` subsector row and
   *  resolve it to a real `subsectorId` before the project itself is saved — never persisted or
   *  returned on the project record (see the subsector-other handling in the projects routes). */
  subsectorOther?: string;
  /** undefined/"zida_catalogue" = a real ZIDA 2025 deck project; "policy_initiative" = an illustrative
   *  pipeline concept derived from a named national policy/strategy document, not ZIDA-appraised. */
  pipelineType?: "zida_catalogue" | "policy_initiative";
  strategicPillarIds: string[];
  sdgIds: string[];
  primaryBeneficiaryMinistryId: string;
  secondaryBeneficiaryMinistryIds?: string[];
  implementingAgencyId?: string;
  regulatorIds?: string[];
  /** Per-project override of the assigned ZIDA Case Manager, taking precedence over the
   *  ministry's own `assignedStaffUserId` default — see resolveProjectCaseManager. Admin/super_admin
   *  only (see CREATOR_STRIPPED_FIELDS in PATCH /api/projects/[id]). Explicit `null` (vs.
   *  `undefined`) on a PATCH body means "clear the override, fall back to the ministry default". */
  assignedStaffUserId?: string | null;
  /** "Assigned Reviewing Officer" (Platform Feedback Batch v4, Phase 6) — a lightweight per-project
   *  assignment of one individual `government` reviewer, distinct from `assignedStaffUserId` (the
   *  admin/super_admin-only Case Manager who "drives" the process). Settable by either the
   *  project's own `ministry_admin` or `admin`/`super_admin` (see PATCH /api/projects/[id]).
   *  Powers the `government` role's "My Assigned Projects" filter pill on the Pipeline — one
   *  officer can be assigned across many projects, so it's "one officer per project", not
   *  "one project per officer". Explicit `null` clears the assignment. */
  assignedReviewingOfficerUserId?: string | null;
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
  investmentSource?: string;
  capitalStructure?: string;
  shareholderContribution?: string;
  sectorExperienceYears?: string;
  priorProjectsCompleted?: string;
  annualTurnover?: string;
  financingConfirmation?: string;
  financingPartners?: string;
  opportunitySummary: string;
  description: string;
  scope: string[];
  developmentImpact: string[];
  /** Employment impact (Government Executive Report Overhaul) — real numeric counts, blank on
   *  every current ZIDA-deck project. The Government Executive Report hides its Employment
   *  Impact section entirely until at least one project has a real figure. */
  jobsDirect?: number;
  jobsIndirect?: number;
  /** Legacy title-only labels (back-compat with any read-only display that hasn't moved to
   *  `documentRecords` yet — see ProjectDocumentRecord for the real R2-backed files). */
  documents: string[];
  /** Real uploaded artifacts (R2-backed) — never exposes the raw storage key; download goes
   *  through GET /api/projects/[id]/documents/[docId]/download, which re-checks the caller's
   *  entitlement against `visibilityLevel` (and NDA acceptance for qualified_investor-tier docs). */
  documentRecords?: ProjectDocumentRecord[];
  sourceReference?: string;
  dataVerificationStatus: DataVerificationStatus;
  reviewerNotes?: string;
  createdBy: string;
  /** True only for proposals a qualified investor originated via "Propose a Project" — see
   *  lib/db/schema/projects.ts for the ownership-gate rationale. Absent/false for every
   *  staff-created project. */
  investorSubmitted?: boolean;
  /** Validated org teammates (Deal Room Feedback Batch v2, Phase 5) the proposal's owner has opted
   *  into full co-editor rights on this specific proposal — read-only, derived from
   *  `project_team_assignments`; managed exclusively via `/api/projects/[id]/team`, never through
   *  the generic project PATCH (same "own dedicated endpoint" convention as `documentRecords`). */
  teamAssignedUserIds?: string[];
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
export type InvestorEngagementStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected";

export interface InvestorEngagement {
  id: string;
  projectId: string;
  investorName: string;
  investorOrganization?: string;
  /** Set when a signed-in investor self-initiates the engagement (see the Deal Room "Request
   *  Engagement" flow) — undefined for engagements logged on an investor's behalf without an
   *  account (backward-compatible with the free-text-only seed data). */
  userId?: string;
  status: InvestorEngagementStatus;
  notes?: string;
  /** Indicative ticket size (free text, e.g. "USD 10-15M") captured in the engagement wizard. */
  ticketSize?: string;
  /** Authorized signatory's role/title, attested at publish (draft -> submitted). */
  signatoryTitle?: string;
  /** Set server-side when the investor certifies + publishes; presence => the record is locked
   *  (immutable to the investor). */
  certifiedAt?: string;
  publishedAt?: string;
  /** Self-service organizational state — reversible, purely cosmetic, never affects the compliance
   *  workflow (see lib/governance/engagement-workflow.ts). */
  archivedAt?: string;
  /** Soft-delete — present once removed by the owning investor (pre-approval) or via the governed
   *  delete-request approval (post-approval). Rows with this set are excluded from every list. */
  deletedAt?: string;
  /** Governed delete-request workflow (approved engagements only) — set while a deletion request is
   *  pending Admin/Super Admin adjudication. */
  deleteRequestedAt?: string;
  deleteRequestReason?: string;
  deleteRequestStatus?: "pending" | "approved" | "declined";
  /** Staff-settable administrative tag (Institutional Compliance Dossier round) — tracks whether
   *  an investor is following through post-MOU, independent of the formal compliance workflow.
   *  admin/super_admin only; undefined until staff first set it. */
  followThroughStatus?: FollowThroughStatus;
  /** Delegate model (Team Ministry Traceability Batch, Phase 5) — a validated Team Member with
   *  equal authority to the org admin on this one engagement. Never exclusive: `userId` (the org
   *  admin) always retains full authority too, whether or not a delegate is assigned. */
  assignedUserId?: string | null;
  assignedBy?: string | null;
  assignedAt?: string | null;
  /** Primary-contact clarity (Phase 8, item 2) — advisory only, never an access gate. Falls back to
   *  `userId` (the owner) when null, either because no Delegate has ever been assigned or because
   *  it hasn't been explicitly switched. Switchable by either the owner or the Delegate. */
  primaryContactUserId?: string | null;
  /** Denormalized onto the list response (Platform Feedback Batch v3, Phase 8) — a LEFT JOIN onto
   *  `engagement_mous` in GET /api/engagements, purely so the MOU registry (and any other engagement
   *  list) can show/filter by MOU lifecycle stage without an extra per-row fetch. `null` if no MOU
   *  has been created for this engagement yet (see getOrCreateMouForEngagement). */
  mouStatus?: MouStatus | null;
  createdAt: string;
  updatedAt: string;
}

export type FollowThroughStatus = "on_track" | "at_risk" | "non_responsive" | "completed";

/**
 * Production-shaped MOU lifecycle state (see lib/db/schema/mous.ts and the Deal Room Engagement
 * and MOU Upgrade plan): drafting -> in_review -> both_approved -> finalized ->
 * ready_for_signature -> executed. Real e-signature capture is deliberately deferred — "executed"
 * only ever records signer metadata (see MouSignatureMetadata below), never a live signature.
 */
export type MouStatus = "drafting" | "in_review" | "both_approved" | "finalized" | "ready_for_signature" | "executed";

/** Structured MOU terms — deliberately a form, not a rich-text/redline editor. Correction
 *  requests happen via the Communication Hub thread scoped to the engagement instead.
 *  `purpose`/`scope`/`nonBindingStatement`/`governingLaw` (Phase 7 — MOU content upgrade) round
 *  out the "concise base template" sections a standalone MOU document needs beyond the deal-specific
 *  terms — all four are pre-filled with standard boilerplate by buildSeedContent() so ZIDA only
 *  ever edits, never starts from a blank field. */
export interface MouContent {
  parties?: string;
  projectReference?: string;
  purpose?: string;
  scope?: string;
  indicativeCapital?: string;
  termBullets?: string[];
  nonBindingStatement?: string;
  governingLaw?: string;
  effectiveDate?: string;
  specialConditions?: string;
}

/** Formatting-only preferences — stay editable through "ready_for_signature" even after content
 *  is locked, driving a print-friendly window.print() render (see the MOU tab). */
export interface MouFormatting {
  letterhead?: boolean;
  pageBreakPreference?: "single_page" | "per_section";
  footerText?: string;
}

/** Recorded once, at "executed" — signer name/role/date/method or location, never a live
 *  capture. The deliberate extension point where a real e-signature vendor plugs in later. */
export interface MouSignatureMetadata {
  investorSignedBy?: string;
  investorSignedRole?: string;
  investorSignedDate?: string;
  zidaSignedBy?: string;
  zidaSignedRole?: string;
  zidaSignedDate?: string;
  methodOrLocation?: string;
}

/** One MOU per approved InvestorEngagement (see GET/POST /api/engagements/[id]/mou). */
export interface EngagementMou {
  id: string;
  engagementId: string;
  status: MouStatus;
  content: MouContent;
  /** Immutable copy of `content` taken the moment status crosses into "finalized". */
  contentSnapshot?: MouContent | null;
  formatting: MouFormatting;
  formattingLocked: boolean;
  investorApprovedAt?: string | null;
  investorApprovedBy?: string | null;
  zidaApprovedAt?: string | null;
  zidaApprovedBy?: string | null;
  finalizedAt?: string | null;
  finalizedBy?: string | null;
  readyForSignatureAt?: string | null;
  readyForSignatureBy?: string | null;
  executedAt?: string | null;
  executedBy?: string | null;
  signatureMetadata?: MouSignatureMetadata | null;
  createdAt: string;
  updatedAt: string;
}

/** A single reviewer note pinned to one MOU content field (Phase 7 — see
 *  lib/db/schema/mou-comments.ts). Resolving doesn't delete the comment, it just clears from the
 *  "unresolved" badge next to that field. */
export interface MouFieldComment {
  id: string;
  mouId: string;
  fieldKey: string;
  authorUserId: string;
  authorName: string;
  body: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
}

/** Actions accepted by POST /api/engagements/[id]/mou/actions — see lib/governance/mou-workflow.ts
 *  for the transition graph and role gates each one enforces. */
export type MouAction =
  | "submit_for_review"
  | "request_changes"
  | "approve"
  | "finalize"
  | "mark_ready_for_signature"
  | "record_execution"
  | "reopen";

/** Who can read a Communication Hub message (see lib/db/schema/messages.ts): "internal" =
 *  ZIDA/Admin/Government only; "investor_visible" = the engaged investor(s) plus staff;
 *  "mou" = scoped to one engagement's MOU comment thread. */
export type MessageVisibility = "internal" | "investor_visible" | "mou";

/** Thread scope: a normal project/engagement thread, or the project-less "General Concierge" channel. */
export type MessageScope = "project" | "concierge";

/** Message rendering kind: a normal text message, or an interactive Action Card. */
export type MessageKind = "message" | "action";

/** The editable engagement fields a correction Action Card may propose changing. */
export type CorrectionField = "investorOrganization" | "ticketSize" | "signatoryTitle";

/** Structured data behind an interactive Action Card (kind='action'). Models four workflows:
 *  - "correction": an investor's requested change to a locked engagement, which staff can Approve
 *    (optionally applying a proposed field value), Counter, or Decline.
 *  - "schedule_call": a proposed call/meeting the counterparty can Accept or Decline.
 *  - "delete_request": an investor's justified request to delete an *approved* engagement (the
 *    credibility record). Admin/Super Admin can Approve (soft-deletes), Decline, or Request a
 *    Briefing (proposes a call) before deciding; Government sees the same card for transparency
 *    but has no action buttons (view-only, no decision authority).
 *  - "project_amendment_request": a requested field change to an approved/published project.
 *    Filed by either (a) the investor-owner on their own Propose-a-Project submission (Investor
 *    Dashboard Expansion plan, Phase 5) — the post-submit-lock equivalent of "correction" but for
 *    `projects` instead of `investor_engagements`, single-stage, admin/super_admin-only decision;
 *    or (b) a `government` reviewer on their own ministry's project (Platform Feedback Batch v4,
 *    Phase 8) — a **two-stage** chain: the requester's own `ministry_admin` decides first
 *    (`status: "open"` -> approve escalates to `"escalated"`, decline is terminal), then
 *    admin/super_admin makes the final call (`"escalated"` -> `"resolved"`/`"declined"`). Falls
 *    back to routing straight to `"escalated"` at filing time if the requester's ministry has no
 *    active `ministry_admin`. Super Admin may override and decide an `"open"` government-filed
 *    card directly, skipping the ministry stage, per the confirmed escalation-oversight model. The
 *    target project is `card.projectId` (every ProjectMessage already carries one); Approve
 *    applies `proposedChanges` directly onto the live project row, only at the terminal stage.
 *  - "ministry_association_request" (Platform Feedback Batch v4, Phase 6): a `ministry_admin` or
 *    `government` reviewer viewing a *different* ministry's project asks for their own ministry to
 *    be added as a secondary beneficiary — admin/super_admin-only decision; Approve inserts
 *    `requestingMinistryId` into that project's `projectSecondaryMinistries` join rows. */
export interface MessageActionPayload {
  type: "correction" | "schedule_call" | "delete_request" | "project_amendment_request" | "ministry_association_request";
  engagementId?: string;
  reason?: string;
  /** Optional concrete change proposal; when present, Approve applies it to the engagement. */
  field?: CorrectionField;
  fieldLabel?: string;
  currentValue?: string | null;
  proposedValue?: string | null;
  /** schedule_call: the proposed date/time (ISO) and optional mode/location note. */
  proposedTime?: string;
  callMode?: string;
  /** project_amendment_request: the field(s) the investor-owner wants changed on their own live
   *  project, keyed by InvestmentProject field name — display-only until Approve applies them. */
  proposedChanges?: Partial<InvestmentProject>;
  /** ministry_association_request: the requesting ministry — denormalized name so the Action Card
   *  never needs a client-side taxonomy lookup to render. Reused by a `government`-filed
   *  project_amendment_request (Phase 8) to denormalize the *requester's* own ministry — that's
   *  who the "escalated" stage-1 decision routes to, independent of the target project's own
   *  primary/secondary beneficiary ministries. */
  requestingMinistryId?: string;
  requestingMinistryName?: string;
  /** "escalated" (Phase 8): a government-filed amendment request's own ministry_admin has
   *  approved it — now awaiting admin/super_admin's final decision. Every other card type only
   *  ever uses the original four statuses. */
  status: "open" | "escalated" | "resolved" | "declined" | "briefing_requested";
  /** Phase 8: stamped when a ministry_admin approves a government-filed amendment request's
   *  first stage (moving it from "open" to "escalated") — the queue/thread's "ministry-approved,
   *  awaiting ZIDA" trail, distinct from `resolvedByName`/`resolvedAt` which only ever stamp the
   *  final terminal decision. */
  firstStageApprovedByName?: string;
  firstStageApprovedAt?: string;
  resolvedByName?: string;
  resolvedAt?: string;
}

/** One Communication Hub thread entry (see app/api/projects/[id]/messages/route.ts). A message
 *  with no `engagementId` is a general project-level thread (e.g. "ask ZIDA a question" before
 *  any engagement exists); one with an `engagementId` is scoped to that investor's deal thread. */
/** A file attached to a Communication Hub message. `id` is the download handle
 *  (GET /api/attachments/[id]); the R2 storage key is never exposed to the client. */
export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
}

export interface ProjectMessage {
  id: string;
  /** Empty string for a project-less concierge message (see `scope`). */
  projectId: string;
  engagementId?: string | null;
  /** 'project' (default) or 'concierge' (the general channel). */
  scope?: MessageScope;
  /** Owner (investor) of a concierge thread; used to group + access-check general threads. */
  threadOwnerUserId?: string | null;
  /** Set when this message is a threaded reply to another message in the same thread. */
  parentMessageId?: string | null;
  authorUserId: string;
  authorName: string;
  authorRole: AccountRole;
  visibility: MessageVisibility;
  /** Optional case-manager routing — the ZIDA team member this message is directed to. */
  recipientUserId?: string | null;
  recipientName?: string | null;
  /** 'message' (default) or 'action' (interactive Action Card, see `payload`). */
  kind?: MessageKind;
  payload?: MessageActionPayload | null;
  /** Optional subject line — free text from MessageThread's composer, or a curated reason from
   *  the Communication Hub's new-thread composer (Platform Feedback Batch v4, Phase 2). */
  subject?: string | null;
  body: string;
  attachments?: MessageAttachment[];
  createdAt: string;
}

/** `ProjectMessage` enriched with the parent project's title/slug for a cross-project inbox view
 *  — the shape `GET /api/messages` returns (see lib/db/queries/messages.ts), used by the
 *  Communication Hub page to link each thread back to its project. */
export interface ProjectMessageWithProject extends ProjectMessage {
  projectTitle: string;
  projectSlug: string;
}

/** Per-user notification preferences (Account & Security suite), persisted on profiles.notificationPrefs. */
export interface NotificationPreferences {
  engagementUpdates: boolean;
  newMessages: boolean;
  mouActivity: boolean;
  /** Team & assignment changes (Team Ministry Traceability Batch, Phase 8) — org-invite approved,
   *  co-editor/Delegate assigned or unassigned, Case Manager assigned. Kept as its own toggle
   *  rather than folded into `engagementUpdates` since it fires for non-engagement events too
   *  (invite approval, proposal co-editor changes). */
  teamActivity: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  engagementUpdates: true,
  newMessages: true,
  mouActivity: true,
  teamActivity: true,
};

/**
 * Immutable point-in-time snapshot of the actor who created/invited an account (Team Ministry
 * Traceability Batch, Phase 7) — captured once onto `profiles.createdByContext` at creation time
 * and never rewritten, so the audit trail still reads correctly even after the actor's own
 * role/org/ministry changes or the actor account is later removed. `ministryName` is denormalized
 * here for the same reason: the ministry itself could be renamed later.
 */
export interface CreatedByContext {
  actorName: string;
  actorRole: import("@/lib/auth/types").AccountRole;
  organization: string | null;
  ministryId: string | null;
  ministryName: string | null;
}

export interface LeadInquiry {
  id: string;
  type:
    | "registration"
    | "contact"
    | "investment_interest"
    | "document_request"
    | "meeting_request"
    | "strategic_partnership"
    | "valuation_teaser";
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  message?: string;
  contactReasonId?: string;
  projectId?: string;
  createdAt: string;
  updatedAt?: string;
  /** Strategic Partnerships & Inquiries wizard fields — captured only for that flow. */
  engagementType?: "investor" | "government_dfi" | "strategic_partner";
  investorType?: string;
  sectorIds?: string[];
  ticketSizeRange?: string;
  partnershipType?: string;
  ministryRepresented?: string;
  natureOfEngagement?: string;
  /** Soft-linked submitter account id (Investor Qualification Vetting plan) — set when the
   *  wizard is filled out signed-in, so the draft-autosave/resume flow and the admin "Open
   *  Dossier" link can key off a real id instead of a fragile email match. */
  userId?: string;
  /** Institutional KYC fields, now captured up-front in the wizard (investor-only, required)
   *  instead of only after qualification at the NDA gate — mirrors profiles' equivalent fields. */
  hqAddress?: string;
  businessRegistrationId?: string;
  websiteUrl?: string;
  /** Staff-authored message shown back to the applicant on decline or "changes requested". */
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  /** Admin review state. "draft" = applicant-owned, editable, pre-submission (wizard autosave).
   *  "changes_requested" = sent back to the applicant for revision, not declined. Undefined on
   *  existing/older stored records is treated as "pending". */
  status?: "draft" | "pending" | "changes_requested" | "approved" | "declined";
  /** Server-resolved (GET /api/inquiries only) — the applicant's Neon Auth account id, preferring
   *  the soft-linked `userId` and falling back to an email match. Powers the admin "Open Dossier"
   *  link; absent when no matching account exists yet. */
  matchedUserId?: string;
}

/** Institutional capital brackets for the registry quick-chips. `assessment_pending` matches
 *  concept-stage opportunities whose capital buildout is not yet valued (unparseable/absent
 *  `capitalRequired`) — the lead-magnet segment. */
export type CapitalBracket =
  | "micro"
  | "growth"
  | "middle"
  | "infrastructure"
  | "assessment_pending";

/** "Last updated" freshness presets for the deal-velocity filter cluster. */
export type UpdatedWithin = "7d" | "30d" | "quarter";

export interface ProjectFilters {
  search?: string;
  sectorId?: string;
  /** Multi-select: a project matches if it carries ANY of the selected strategic-pillar ids (OR logic). */
  pillarId?: string[];
  /** Multi-select: a project matches if it advances ANY of the selected SDG ids (OR logic). */
  sdgId?: string[];
  ministryId?: string;
  province?: string;
  /** Multi-select: holds `FinancingBucket` keys (see lib/utils/financing-type.ts), not raw free-text. OR logic. */
  financingType?: string[];
  readiness?: string;
  status?: ProjectStatus;
  pipelineType?: "zida_catalogue" | "policy_initiative";
  /** Minimum parsed capital figure, in millions of USD (see parseCapitalTotalMillions). */
  minCapitalMillions?: number;
  /** Maximum parsed capital figure, in millions of USD. */
  maxCapitalMillions?: number;
  /** Capital bracket quick-chip; mutually exclusive with the custom min/max range. */
  capitalBracket?: CapitalBracket;
  /** "Last updated" freshness window, evaluated against `project.updatedAt`. */
  updatedWithin?: UpdatedWithin;
  /** Only projects with a data room (documents) that were updated in the last 30 days. */
  recentDataRoom?: boolean;
}

/** A registry filter set the user has saved (server-persisted for signed-in users). Powers the
 *  "Save Search & Alerts" feature; `alertEnabled` is stored now, email delivery is deferred. */
export interface SavedSearch {
  id: string;
  name: string;
  filters: ProjectFilters;
  alertEnabled: boolean;
  createdAt: string;
}

/** A signed-in user's per-project bookmark (Investor Dashboard Expansion plan) — distinct from
 *  `SavedSearch`, which snapshots a filter set rather than an individual project. */
export interface WatchlistEntry {
  id: string;
  projectId: string;
  createdAt: string;
}

/** Safe, no-PII aggregate marketplace stats (see lib/db/queries/platform-stats.ts) — open to any
 *  authenticated role, powers the Investor Dashboard Overview's platform panel. */
export interface PlatformStats {
  publishedProjectCount: number;
  totalCapitalRepresentedMillions: number;
  projectsBySector: { sectorId: string; sectorName: string; count: number }[];
  qualifiedInvestorCount: number;
}

/** The caller's own accurate (uncapped) activity counters — powers the Investor Dashboard's "My
 *  Analytics" snapshot card. */
export interface MyAnalyticsSnapshot {
  savedProjects: number;
  engagements: number;
  documentsDownloaded: number;
  documentsPreviewed: number;
  messagesSent: number;
}

/** Mirrors `audit_logs` — every governance mutation (project/inquiry/engagement/taxonomy/
 *  settings) writes one of these (see lib/db/queries/audit.ts). Powers the Super Admin Audit
 *  Log page and the dashboard activity feeds. */
export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  // Optional — only populated by fetchAuditLogs() (the platform-wide /super-admin/audit feed,
  // where the Sovereign Telemetry & Audit Filter Bar's Actor Role Scope filter needs it). The
  // other, narrower audit queries (project history, per-entity history, per-actor history) leave
  // this undefined since none of their callers filter by role.
  actorRole?: AccountRole | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** Account lifecycle status (profiles.account_status). "deactivated" is the soft-archive terminal
 *  state applied from the Users & Roles console; "suspended" is a reversible hold. */
export type AccountStatus = "active" | "suspended" | "pending" | "deactivated";

/** `org_invites.status` (Deal Room Feedback Batch v2, Phase 5). `pending_validation` = awaiting
 *  ZIDA staff review; `active` = validated, real account provisioned/linked; `revoked` = either the
 *  owner cancelled it pre-validation or staff rejected it. */
export type OrgInviteStatus = "pending_validation" | "active" | "revoked";

/** A qualified investor's own team-member invite, as surfaced on their My Profile "My Team" panel
 *  (owner-scoped) and, for staff, the platform-wide validation queue (see lib/db/queries/org-team.ts). */
export interface OrgInvite {
  id: string;
  ownerUserId: string;
  /** Present on the staff validation queue only — the inviting investor's own display name/org,
   *  so a reviewer has context without opening a second record. Absent on the owner's own list
   *  (redundant there — it's always "you"). */
  ownerName?: string;
  ownerOrganization?: string | null;
  /** Ministry-desk equivalent of `ownerOrganization` — set only when the inviting owner is a
   *  `ministry_admin` (Platform Feedback Batch v3, Phase 2). Staff validation queue context only. */
  ownerMinistryName?: string | null;
  /** The role this invitee will be granted on approval — derived server-side from the owner's own
   *  role (see approveOrgInvite's role-mirroring), surfaced on the staff validation queue so a
   *  reviewer knows what they're approving before they decide. Staff validation queue context only. */
  resultingRole?: AccountRole;
  inviteEmail: string;
  inviteName: string;
  /** Optional context captured on the owner's own invite form (Phase 2) — surfaced to the ZIDA
   *  reviewer before Approve/Reject so decisions are never made blind on just a name/email. */
  justification?: string | null;
  phone?: string | null;
  address?: string | null;
  status: OrgInviteStatus;
  invitedUserId?: string | null;
  /** The invited user's own `profiles.accountStatus` (Phase 3, Team member lifecycle) — an
   *  `active` org invite can still have its person temporarily `suspended` (blocks their platform
   *  access via requireRole's ACCOUNT_INACTIVE check, without removing them from the roster or
   *  falling their assignments back to the owner, unlike Archive/`revoked`). Undefined when there's
   *  no linked account yet (still `pending_validation`). */
  invitedUserAccountStatus?: AccountStatus | null;
  createdAt: string;
  validatedAt?: string | null;
  validatedBy?: string | null;
}

/** One validated teammate assigned to a specific proposal (Phase 5) — the shape returned by
 *  GET /api/projects/[id]/team, joined with the assignee's display name/email for the picker UI. */
export interface ProjectTeamMember {
  userId: string;
  name: string;
  email: string;
  assignedBy: string;
  assignedAt: string;
}

/** "Currently working on" summary for one active team member — powers the /deal-room/teams and
 *  /ministry/teams roster's per-row assignment column (Team Ministry Traceability Batch, Phase 4).
 *  `engagements` is populated once Phase 5's delegate model ships. */
export interface TeamAssignmentSummary {
  proposals: { id: string; title: string }[];
  engagements: { id: string; title: string }[];
}

/** A `profiles` row joined with its Neon Auth user record — the shape the Super Admin
 *  "Users & Roles" console operates on (see app/api/users/route.ts). */
export interface AdminUserRecord {
  userId: string;
  email: string;
  name: string;
  role: import("@/lib/auth/types").AccountRole;
  accountStatus: AccountStatus;
  organization: string | null;
  ministryId: string | null;
  jobTitle: string | null;
  phone: string | null;
  createdAt: string;
  /** DB-guaranteed-unique traceability sequence (see lib/db/schema/profiles.ts). Format for
   *  display with formatAccountRef() from lib/utils/account-ref.ts — never store it pre-formatted. */
  accountSeq: number;
  /** Real Sovereign Confidentiality Framework signal — null until the user accepts the Deal Room
   *  NDA clickwrap (see profiles.ndaAcceptedAt). Backs the Users & Roles NDA Attestation filter. */
  ndaAcceptedAt: string | null;
  /** True once the KYC-at-NDA capture (profiles.businessRegistrationId) has been completed. Only
   *  a boolean is exposed in this bulk directory row — the raw registration id itself is PII kept
   *  to the single-user UserDossier fetch. Backs the Institutional Accreditation filter. */
  hasCompletedKyc: boolean;
  /** Chain-of-custody (Team Ministry Traceability Batch, Phase 7) — null for self-service signups
   *  and any profile that predates this column. Backs the "Chain of custody" line in
   *  user-detail-drawer.tsx's Institutional tab. */
  createdByUserId: string | null;
  createdByContext: CreatedByContext | null;
}

/** One engagement row as summarized inside a user's Institutional Compliance Dossier (Portfolio &
 *  Activity tab) — joins the investor's own engagement to its project title and MOU lifecycle
 *  status, so staff can see deal-stage + follow-through at a glance without opening each record. */
export interface UserDossierEngagement {
  id: string;
  projectId: string;
  projectTitle: string | null;
  status: InvestorEngagementStatus;
  ticketSize: string | null;
  mouStatus: MouStatus | null;
  followThroughStatus: FollowThroughStatus | null;
  createdAt: string;
}

/** One document download event, surfaced in the dossier's Portfolio & Activity tab as a lightweight
 *  telemetry list (from the actor-scoped audit query — see fetchAuditLogsByActor). */
export interface UserDossierDownload {
  id: string;
  documentTitle: string | null;
  projectId: string | null;
  downloadedAt: string;
}

/**
 * The full single-user payload behind GET /api/users/[id] — everything the Institutional
 * Compliance Dossier drawer needs in one round trip: the base directory fields (AdminUserRecord),
 * institutional KYC + NDA acceptance trail (already collected at the KYC-at-NDA gate but
 * previously only exposed to the user themself via /api/me), a real (non-fabricated)
 * domain-verification signal, and this user's own engagement/document activity.
 */
export interface UserDossier extends AdminUserRecord {
  hqAddress: string | null;
  businessRegistrationId: string | null;
  websiteUrl: string | null;
  executiveRepresentativeName: string | null;
  executiveRepresentativeTitle: string | null;
  ndaVersion: string | null;
  ndaAcceptedIp: string | null;
  ndaAcceptedTitle: string | null;
  /** True when the account's email domain is not a well-known consumer webmail provider — reuses
   *  isFreeMailDomain() (lib/utils/email-domain.ts), never a fabricated DNS/MX check. */
  isDomainVerified: boolean;
  engagements: UserDossierEngagement[];
  documentDownloads: {
    count: number;
    items: UserDossierDownload[];
  };
  /** Lightweight, real (never-faked) VDR-preview telemetry — same audit-row shape as
   *  documentDownloads, filtered to the distinct `document.previewed` action fired by
   *  `?mode=preview` on the download route. No watermarking pipeline yet (see BACKLOG.md). */
  documentPreviews: {
    count: number;
    items: UserDossierDownload[];
  };
}

/** Phase 1 marketing CMS — `faq_entries` row (see lib/db/schema/content.ts). */
export interface FaqEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

/** One home hero carousel slide, editable via Super Admin → Settings → Page Content. Mirrors the
 *  i18n `gatewaySlides` shape (see lib/i18n/messages/en.ts) so the carousel's rendering logic is
 *  unchanged whether it reads from the CMS override or the i18n default. */
export interface HomeHeroSlide {
  id: string;
  overline: string;
  headline: string;
  highlight?: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

/** Body shape for the `site_content_blocks` row keyed `"home-hero"`. */
export interface HomeHeroContent {
  slides: HomeHeroSlide[];
}

/** Body shape for the `site_content_blocks` row keyed `"about-page"` — a minimal Phase 1 editor
 *  (plain paragraphs, blank-line separated) overriding the About page's intro blockquote. */
export interface AboutPageContent {
  intro: string;
}

/** Generic `site_content_blocks` row as returned by GET /api/content-blocks/[key]. */
export interface SiteContentBlock<T = unknown> {
  key: string;
  body: T;
  updatedAt: string;
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
