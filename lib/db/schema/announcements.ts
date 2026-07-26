import { pgTable, text, timestamp, uuid, boolean, integer } from "drizzle-orm/pg-core";

/**
 * Multi-banner, scheduled, audience-targeted announcements (Super Admin Enterprise Upgrade, Phase 5).
 * Supersedes the single `flashBanner*` fields on site_settings, which are retained for back-compat.
 * `audienceRole` targets by viewer role ("all" = everyone); `startsAt`/`endsAt` define the active
 * window (endsAt null = open-ended); higher `priority` sorts first. No hard FKs to neon_auth.
 */
export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  // "all" | "registered" | "qualified" | "government" | "admin" | "super_admin"
  audienceRole: text("audience_role").notNull().default("all"),
  // "info" | "success" | "warning" | "critical"
  style: text("style").notNull().default("info"),
  priority: integer("priority").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  dismissable: boolean("dismissable").notNull().default(true),
  ctaLabel: text("cta_label"),
  ctaHref: text("cta_href"),
  // "active" | "draft" | "archived"
  status: text("status").notNull().default("active"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
