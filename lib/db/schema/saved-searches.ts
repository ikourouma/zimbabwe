import { pgTable, text, timestamp, uuid, boolean, jsonb } from "drizzle-orm/pg-core";
import type { ProjectFilters } from "@/lib/types";

// A registry filter set a signed-in user has saved (Registry Filter Upgrade + Lead Capture plan).
// `filters` stores the full ProjectFilters snapshot as JSON so a saved search re-applies exactly.
// Like `profiles.userId`, `userId` is a soft link to the neon_auth-managed user (no hard FK, since
// that schema is service-managed and outside this Drizzle schema). `alertEnabled` is persisted now
// but email delivery is deferred (Resend is Phase 5) — see the API route's deferral note.
export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  filters: jsonb("filters").$type<ProjectFilters>().notNull(),
  alertEnabled: boolean("alert_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
