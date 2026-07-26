import { pgEnum } from "drizzle-orm/pg-core";

// Mirrors lib/types/index.ts's string-literal unions 1:1 so the eventual context-cutover
// (Phase 3) can reuse those existing TS types against rows read from these tables.

export const entityStatusEnum = pgEnum("entity_status", ["active", "inactive", "pending_validation"]);

export const pipelineTypeEnum = pgEnum("pipeline_type", ["zida_catalogue", "policy_initiative"]);

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "submitted_for_review",
  "under_review",
  "changes_requested",
  "approved",
  "published",
  "archived",
]);

export const visibilityLevelEnum = pgEnum("visibility_level", [
  "public",
  "registered",
  "qualified_investor",
  "admin_only",
]);

export const dataVerificationStatusEnum = pgEnum("data_verification_status", [
  "unverified",
  "pending_review",
  "verified",
]);

export const ministryTypeEnum = pgEnum("ministry_type", ["beneficiary", "implementing"]);

export const agencyTypeEnum = pgEnum("agency_type", ["agency", "regulator", "parastatal"]);

export const userRoleScopeEnum = pgEnum("user_role_scope", ["platform", "tenant", "institutional"]);

// Real authenticated roles. Deliberately excludes "public" (unauthenticated visitors have no
// profile row) — see the target role model in PRODUCTION_MIGRATION_PLAN.md.
export const accountRoleEnum = pgEnum("account_role", [
  "registered",
  "qualified",
  "government",
  "admin",
  "super_admin",
]);

// "deactivated" is the soft-archive terminal state applied by the Users & Roles row action
// (distinct from the temporary "suspended"); added additively via ALTER TYPE (see migration).
export const accountStatusEnum = pgEnum("account_status", ["active", "suspended", "pending", "deactivated"]);

export const leadInquiryTypeEnum = pgEnum("lead_inquiry_type", [
  "registration",
  "contact",
  "investment_interest",
  "document_request",
  "meeting_request",
  "strategic_partnership",
  // Concept-stage lead magnet: an investor requesting a valuation teaser on an opportunity whose
  // capital buildout is still being structured (see the Registry "Request Valuation Teaser" CTA).
  "valuation_teaser",
]);

export const engagementTypeEnum = pgEnum("engagement_type", [
  "investor",
  "government_dfi",
  "strategic_partner",
]);

export const inquiryStatusEnum = pgEnum("inquiry_status", ["pending", "approved", "declined"]);

// "draft" is the investor-owned pre-submission state (editable, private to owner + staff) added
// by the Engagement Draft-Lock plan — publishing transitions draft -> submitted, which is the
// immutable lock point that enters the existing staff review workflow.
export const investorEngagementStatusEnum = pgEnum("investor_engagement_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
]);

// Communication Hub message visibility (see lib/db/schema/messages.ts): "internal" = ZIDA/Admin/
// Government only (replaces the old idea of a separate "admin note" field — an internal note is
// just a message no investor can see); "investor_visible" = the engaged investor(s) + staff;
// "mou" = scoped to a specific engagement's MOU comment thread (see engagement_mous below).
export const messageVisibilityEnum = pgEnum("message_visibility", ["internal", "investor_visible", "mou"]);

// MOU lifecycle (production-shaped states now, real e-signature deferred — see
// lib/db/schema/mous.ts and the Deal Room Engagement and MOU Upgrade plan).
export const mouStatusEnum = pgEnum("mou_status", [
  "drafting",
  "in_review",
  "both_approved",
  "finalized",
  "ready_for_signature",
  "executed",
]);

// Staff-settable administrative tag (Institutional Compliance Dossier round) tracking whether an
// investor is following through after an MOU/engagement, ahead of building the full accreditation
// document upload + review pipeline — see BACKLOG.md.
export const followThroughStatusEnum = pgEnum("follow_through_status", [
  "on_track",
  "at_risk",
  "non_responsive",
  "completed",
]);
