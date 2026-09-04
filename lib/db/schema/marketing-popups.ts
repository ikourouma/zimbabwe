import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Public-site marketing popups (Platform Feedback Batch v4, Phase 9). Super Admin CRUD in
 * /super-admin/settings. Rendered as a dismissible modal on public marketing pages only — never
 * inside /admin, /super-admin, /deal-room, or /ministry. Frequency-capped once per browser
 * session on the client.
 */
export const marketingPopups = pgTable("marketing_popups", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  subtext: text("subtext"),
  imageUrl: text("image_url"),
  linkHref: text("link_href"),
  linkLabel: text("link_label"),
  priority: integer("priority").notNull().default(0),
  // "active" | "draft" | "archived"
  status: text("status").notNull().default("draft"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
