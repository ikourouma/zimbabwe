import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { projects } from "./projects";

// A signed-in user's per-project bookmark (Investor Dashboard Expansion plan) — distinct from
// `savedSearches`, which snapshots a *filter set*, not an individual project. Like
// `savedSearches.userId`/`profiles.userId`, `userId` is a soft link to the neon_auth-managed user
// (no hard FK; that schema is service-managed and outside this Drizzle schema). `projectId` IS a
// hard FK since `projects` lives in this same schema — cascades on project delete so a removed
// project can't leave orphaned watchlist rows.
export const projectWatchlist = pgTable(
  "project_watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("project_watchlist_user_project_unique").on(table.userId, table.projectId)]
);
