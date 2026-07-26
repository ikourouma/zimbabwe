import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Singleton row (id is always "singleton") — replaces context/site-settings-context.tsx's
// localStorage-backed settings. Also holds the super-admin-managed flash banner (see
// super_admin_flash_banner_8d46a539.plan.md) so both sitewide kill-switches live in one table.
export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("singleton"),
  costStructureHidden: boolean("cost_structure_hidden").notNull().default(false),
  flashBannerEnabled: boolean("flash_banner_enabled").notNull().default(false),
  flashBannerMessage: text("flash_banner_message"),
  flashBannerCtaLabel: text("flash_banner_cta_label"),
  flashBannerCtaHref: text("flash_banner_cta_href"),
  // "stack" (default — every active banner shown at once, existing behavior) | "rotate" (only one
  // slot shown at a time, auto-advancing through all active banners) — lets Super Admin choose how
  // multiple simultaneous announcements are displayed sitewide.
  bannerDisplayMode: text("banner_display_mode").notNull().default("stack"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
