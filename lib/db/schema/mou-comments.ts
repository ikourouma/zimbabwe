import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { engagementMous } from "./mous";

// Per-field discussion threads on an MOU (Phase 7 — MOU content upgrade). Deliberately scoped to a
// single content field (`fieldKey`, e.g. "parties"/"termBullets"/"specialConditions") rather than a
// free-floating comment, so a reviewer's note stays pinned to exactly the clause it's about instead
// of getting lost in the engagement's general Communication Hub thread. Resolving a comment doesn't
// delete it — it just stops counting toward the "unresolved" badge shown next to that field.
export const mouFieldComments = pgTable("mou_field_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  mouId: uuid("mou_id")
    .notNull()
    .references(() => engagementMous.id, { onDelete: "cascade" }),
  fieldKey: text("field_key").notNull(),
  authorUserId: text("author_user_id").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
