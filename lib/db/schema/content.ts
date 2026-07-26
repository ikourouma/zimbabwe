import { pgTable, text, integer, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

/**
 * Phase 1 marketing CMS (Fortune-100 Gap-Closure Round 2/3) — the highest-traffic content only;
 * Opportunity, Platform, Investor Journey, Legal, Zimbabwe Profile, and Glossary stay hardcoded
 * pending a future CMS phase. Sector descriptions reuse the existing `sectors.description`
 * column instead (see the Taxonomies → Sectors tab), so only FAQ + free-form blocks live here.
 */
export const faqEntries = pgTable("faq_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  // 'active' | 'archived' — same soft-disable pattern as taxonomies; archived entries are hidden
  // from the public /faq page but stay editable/restorable in the Settings manager.
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Free-form, keyed content blocks for the two remaining Phase 1 surfaces (home hero slides, About
 * page intro). `body` is a JSON blob whose shape is defined by convention per key (see
 * lib/types/index.ts `HomeHeroContent` / `AboutPageContent`) rather than a separate table per
 * surface — deliberately minimal per the Phase 1 scope (a textarea/structured-fields editor, not
 * a full WYSIWYG or page builder).
 */
export const siteContentBlocks = pgTable("site_content_blocks", {
  key: text("key").primaryKey(),
  body: jsonb("body").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
