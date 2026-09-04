import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const accreditationKindEnum = pgEnum("accreditation_kind", ["commitment_letter", "investment_guarantee"]);
export const accreditationStatusEnum = pgEnum("accreditation_status", ["pending", "approved", "declined"]);

export const accreditationDocuments = pgTable("accreditation_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  kind: accreditationKindEnum("kind").notNull(),
  storageKey: text("storage_key").notNull(),
  fileName: text("file_name").notNull(),
  status: accreditationStatusEnum("status").notNull().default("pending"),
  reviewNotes: text("review_notes"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
