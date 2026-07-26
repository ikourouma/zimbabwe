import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { projectMessages } from "./messages";

// File attachments on Communication Hub messages. Like project_documents, `storageKey` is the
// private Cloudflare R2 object key (never a public URL) — files are streamed to R2 on upload and
// served only via a short-lived signed URL from GET /api/attachments/[id] after that route
// re-checks the caller can see the parent message. See lib/storage/r2.ts.
export const messageAttachments = pgTable("message_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => projectMessages.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
