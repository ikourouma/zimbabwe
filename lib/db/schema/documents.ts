import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { visibilityLevelEnum } from "./enums";
import { projects } from "./projects";

// Replaces the demo's `documents: string[]` placeholder labels with real files. `storageKey` is
// the Cloudflare R2 object key (e.g. "projects/{project_id}/{document_id}-{filename}") — never a
// public URL, since every document is private and served only via a short-lived signed URL from
// lib/storage/'s adapter after a Route Handler checks the requester's role against
// `visibilityLevel`. See PRODUCTION_MIGRATION_PLAN.md Phase 4.
export const projectDocuments = pgTable("project_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  storageKey: text("storage_key").notNull(),
  // Original uploaded filename (for the download's Content-Disposition + UI display). Null for
  // legacy placeholder-title rows created before real uploads existed.
  fileName: text("file_name"),
  visibilityLevel: visibilityLevelEnum("visibility_level").notNull().default("qualified_investor"),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
