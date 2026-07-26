import { pgTable, text, timestamp, uuid, jsonb, type AnyPgColumn } from "drizzle-orm/pg-core";
import { accountRoleEnum, messageVisibilityEnum } from "./enums";
import { projects } from "./projects";
import { investorEngagements } from "./engagements";
import type { MessageActionPayload, MessageKind, MessageScope } from "@/lib/types";

// The Deal Room "Communication Hub" (see the Deal Room Engagement and MOU Upgrade plan) — one
// flat, role-scoped thread model per project instead of separate "ZIDA note" / "investor
// question" / "MOU comment" systems. `visibility` alone decides who can read a row; there is no
// separate ACL table.
export const projectMessages = pgTable("project_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Nullable: a project-less "General Concierge" thread (scope='concierge') lets a registered/
  // qualified user reach the ZIDA team before any project/engagement exists (the cold-start case).
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  // 'project' (default) = a thread on a specific project; 'concierge' = the project-less general
  // channel, grouped per investor via threadOwnerUserId.
  scope: text("scope").$type<MessageScope>().notNull().default("project"),
  // Owner of a concierge thread (the investor). Staff replies into that thread carry the same owner
  // so the whole conversation groups together and access can be re-checked without a project join.
  threadOwnerUserId: text("thread_owner_user_id"),
  // Nullable: a general "ask ZIDA a question" thread on the project itself has no engagement yet;
  // once an investor has a live engagement, messages tied to it (incl. all "mou"-visibility rows)
  // carry this so GET /api/projects/[id]/messages can scope per-engagement for investors.
  engagementId: uuid("engagement_id").references(() => investorEngagements.id, { onDelete: "cascade" }),
  // Threaded replies: a reply points at the message it answers (same project/engagement, enforced
  // in the API). Self-reference typed via AnyPgColumn to satisfy the circular table reference.
  parentMessageId: uuid("parent_message_id").references((): AnyPgColumn => projectMessages.id, {
    onDelete: "cascade",
  }),
  authorUserId: text("author_user_id").notNull(),
  authorName: text("author_name").notNull(),
  authorRole: accountRoleEnum("author_role").notNull(),
  visibility: messageVisibilityEnum("visibility").notNull().default("investor_visible"),
  // Optional case-manager routing: an investor may address a message to a named ZIDA team member.
  // Visibility stays investor_visible; this just directs + notifies (recipientName is denormalized
  // so the chip renders without a users join).
  recipientUserId: text("recipient_user_id"),
  recipientName: text("recipient_name"),
  // Interactive Action Cards: kind='action' rows carry a structured payload (e.g. a correction
  // proposal with Approve/Counter/Decline state) rendered as a card instead of plain text.
  kind: text("kind").$type<MessageKind>().notNull().default("message"),
  payload: jsonb("payload").$type<MessageActionPayload>(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
