import { integer, jsonb, text, timestamp, pgTable } from "drizzle-orm/pg-core";
import { agencyTypeEnum, entityStatusEnum, ministryTypeEnum, userRoleScopeEnum } from "./enums";

// Taxonomy tables keep their existing human-readable string IDs (e.g. "sec-health",
// "pillar-01") as primary keys instead of switching to uuid — this makes the seed migration a
// straight port of lib/data/taxonomies.ts's existing arrays, not a redesign, and every
// InvestmentProject.sectorId-style field in the current demo data already points at these
// exact strings.

export const sectors = pgTable("sectors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  // Platform-admin-authored default MOU term bullets/special conditions for this sector, pulled
  // in by getOrCreateMouForEngagement (lib/db/queries/mous.ts) the moment a project in this
  // sector's engagement is first approved — a starting draft for ZIDA staff to edit, never
  // auto-finalized. Shape: { termBullets?: string[]; specialConditions?: string }.
  defaultMouTerms: jsonb("default_mou_terms"),
  status: entityStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subsectors = pgTable("subsectors", {
  id: text("id").primaryKey(),
  sectorId: text("sector_id")
    .notNull()
    .references(() => sectors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  status: entityStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const strategicPillars = pgTable("strategic_pillars", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  strategicMandate: text("strategic_mandate").notNull(),
  targetOutcomes: text("target_outcomes").array().notNull(),
  policyAlignmentPrimary: text("policy_alignment_primary").notNull(),
  policyAlignmentSecondary: text("policy_alignment_secondary"),
  status: entityStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sdgs = pgTable("sdgs", {
  id: text("id").primaryKey(),
  number: integer("number").notNull(),
  name: text("name").notNull(),
  colorToken: text("color_token").notNull(),
  description: text("description").notNull(),
});

/**
 * Ministry names only — never a named minister/individual, on any page, public or gated (see
 * KNOWLEDGE_BASE.md's minister-name-sensitivity decision). `representativeTitle` is an
 * illustrative office/title (e.g. "Director of Investment Promotion"), shown only in the Deal
 * Room, seeded later once available.
 */
export const ministries = pgTable("ministries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  type: ministryTypeEnum("type").notNull(),
  representativeTitle: text("representative_title"),
  // Same shape/purpose as sectors.defaultMouTerms above — ministry-level defaults are merged
  // ahead of sector-level defaults when both are present (ministry terms take precedence as the
  // more specific source).
  defaultMouTerms: jsonb("default_mou_terms"),
  // Team Ministry Traceability Batch, Phase 2 (item 6) — the default ZIDA Case Manager
  // (admin/super_admin) responsible for this ministry's projects. Soft link to neon_auth.user.id
  // (same non-hard-FK convention as profiles.userId elsewhere) — never null-constrained since not
  // every ministry has a desk officer assigned yet. Individual projects can override this via
  // projects.assignedStaffUserId; see resolveProjectCaseManager in lib/entitlements/ministry-scope.ts.
  // Deliberately editable by `admin` too (not gated behind the super_admin-only Taxonomies CRUD
  // this table otherwise lives under) — see the dedicated PATCH /api/ministries/[id]/case-manager
  // route, which is the one entitlement-parity carve-out from that boundary.
  assignedStaffUserId: text("assigned_staff_user_id"),
  status: entityStatusEnum("status").notNull().default("pending_validation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agencies = pgTable("agencies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentMinistryId: text("parent_ministry_id").references(() => ministries.id, { onDelete: "set null" }),
  type: agencyTypeEnum("type").notNull(),
  status: entityStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactReasons = pgTable("contact_reasons", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  routingCategory: text("routing_category").notNull(),
  status: entityStatusEnum("status").notNull().default("active"),
});

/**
 * Descriptive role metadata surfaced in the super-admin "Roles" reference table (permissions,
 * scope) — separate from `account_role_enum`, which is the actual role enforced by
 * middleware/Route Handlers on `profiles.role`. Kept as its own table so the descriptive
 * permission list stays super-admin editable without a schema migration.
 */
export const userRoles = pgTable("user_roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  permissions: text("permissions").array().notNull(),
  scope: userRoleScopeEnum("scope").notNull(),
});

/**
 * Canonical province registry (super-admin managed). Independent of the free-text `province`
 * column on `projects` — see BACKLOG.md's "Full province data migration" entry for why that
 * cleanup is deliberately deferred (requires ZIDA/domain-expert input, not a schema change).
 */
export const provinces = pgTable("provinces", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});
