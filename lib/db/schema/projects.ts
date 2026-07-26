import { integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
  dataVerificationStatusEnum,
  pipelineTypeEnum,
  projectStatusEnum,
  visibilityLevelEnum,
} from "./enums";
import { agencies, ministries, sdgs, sectors, strategicPillars, subsectors } from "./taxonomies";

// Mirrors InvestmentProject (lib/types/index.ts, ~40 fields) — new entity tables (as opposed to
// the pre-existing-string-id taxonomy tables) use uuid primary keys, per PRODUCTION_MIGRATION_PLAN.md.
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  sectorId: text("sector_id")
    .notNull()
    .references(() => sectors.id, { onDelete: "restrict" }),
  subsectorId: text("subsector_id").references(() => subsectors.id, { onDelete: "set null" }),
  pipelineType: pipelineTypeEnum("pipeline_type").notNull().default("zida_catalogue"),
  primaryBeneficiaryMinistryId: text("primary_beneficiary_ministry_id")
    .notNull()
    .references(() => ministries.id, { onDelete: "restrict" }),
  implementingAgencyId: text("implementing_agency_id").references(() => agencies.id, {
    onDelete: "set null",
  }),
  projectOwner: text("project_owner").notNull(),
  location: text("location").notNull(),
  // Free-text pending a canonical provinceId FK — see BACKLOG.md "Full province data migration".
  province: text("province"),
  district: text("district"),
  capitalRequired: text("capital_required"),
  financingType: text("financing_type"),
  projectReadiness: text("project_readiness").notNull(),
  projectStatus: projectStatusEnum("project_status").notNull().default("draft"),
  visibilityLevel: visibilityLevelEnum("visibility_level").notNull().default("public"),
  irr: text("irr"),
  npv: text("npv"),
  roi: text("roi"),
  paybackPeriod: text("payback_period"),
  projectedRevenue: text("projected_revenue"),
  opportunitySummary: text("opportunity_summary").notNull(),
  description: text("description").notNull(),
  scope: text("scope").array().notNull().default([]),
  developmentImpact: text("development_impact").array().notNull().default([]),
  // Employment impact (Government Executive Report Overhaul) — real numeric counts, deliberately
  // NOT free text like capitalRequired, so aggregation never needs a prose parser. Nullable/blank
  // for every seeded ZIDA-deck project today; the report hides its Employment Impact section
  // entirely until at least one project has a real figure (see government-executive-report.tsx).
  jobsDirect: integer("jobs_direct"),
  jobsIndirect: integer("jobs_indirect"),
  sourceReference: text("source_reference"),
  dataVerificationStatus: dataVerificationStatusEnum("data_verification_status")
    .notNull()
    .default("unverified"),
  reviewerNotes: text("reviewer_notes"),
  // References neon_auth.user.id — not a hard FK, since that table lives in a schema managed by
  // Neon's Managed Better Auth rather than this Drizzle schema.
  createdBy: text("created_by").notNull(),
  submittedBy: text("submitted_by"),
  reviewedBy: text("reviewed_by"),
  approvedBy: text("approved_by"),
  publishedBy: text("published_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const projectPillars = pgTable(
  "project_pillars",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    pillarId: text("pillar_id")
      .notNull()
      .references(() => strategicPillars.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.pillarId] })]
);

export const projectSdgs = pgTable(
  "project_sdgs",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sdgId: text("sdg_id")
      .notNull()
      .references(() => sdgs.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.sdgId] })]
);

// Secondary beneficiary ministries only — a project's *primary* beneficiary stays a required
// column on `projects` itself (see the ministry primary/secondary/tertiary transparency
// principle in KNOWLEDGE_BASE.md).
export const projectSecondaryMinistries = pgTable(
  "project_secondary_ministries",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ministryId: text("ministry_id")
      .notNull()
      .references(() => ministries.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.ministryId] })]
);

export const projectRegulators = pgTable(
  "project_regulators",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    agencyId: text("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.agencyId] })]
);
