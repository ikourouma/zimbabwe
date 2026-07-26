import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { followThroughStatusEnum, investorEngagementStatusEnum } from "./enums";
import { projects } from "./projects";

// Mirrors InvestorEngagement (lib/types/index.ts). Deliberately separate from
// strategic_inquiries — this table is the actual Deal Room access gate (status = 'approved' is
// what a Route Handler checks before granting Deal Room access), closing the loop the Lesotho
// reference platform left incomplete (see PRODUCTION_MIGRATION_PLAN.md's Lesotho-audit gaps).
export const investorEngagements = pgTable("investor_engagements", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  investorName: text("investor_name").notNull(),
  investorOrganization: text("investor_organization"),
  // Nullable Neon Auth user id — set when a signed-in investor self-initiates the engagement
  // (see app/deal-room/engagements), enabling a future "My Engagements" investor view. Not a
  // hard FK for the same reason as profiles.userId (neon_auth is a separate, service-managed
  // schema). Free-text investorName/investorOrganization stay for engagements logged on an
  // investor's behalf (e.g. by a government/admin user) without an account.
  userId: text("user_id"),
  status: investorEngagementStatusEnum("status").notNull().default("submitted"),
  notes: text("notes"),
  // Draft-Lock plan fields: an indicative ticket size, the authorized signatory's title, and the
  // certification/lock timestamps captured at publish (draft -> submitted). certifiedAt/publishedAt
  // are stamped server-side the moment the investor certifies + publishes; after that the record
  // is immutable to the investor (corrections go through an addendum, never inline edits).
  ticketSize: text("ticket_size"),
  signatoryTitle: text("signatory_title"),
  certifiedAt: timestamp("certified_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  // Self-service organizational state (Fortune-100 Gap-Closure Round 2): archiving is purely
  // cosmetic/reversible at any status and never affects the compliance workflow. Soft-delete
  // removes the record from every view but preserves the row for audit — see the DELETE handler's
  // governance rule (blocked once status = 'approved'; see deleteRequest* below for that path).
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  // Governed delete-request workflow for an *approved* engagement — a qualified investor can no
  // longer soft-delete directly once approved (it's the credibility record ZIDA/government rely
  // on), so this captures the justification while Admin/Super Admin adjudicate via an Action Card
  // (see POST .../delete-request and the message action route).
  deleteRequestedAt: timestamp("delete_requested_at", { withTimezone: true }),
  deleteRequestReason: text("delete_request_reason"),
  deleteRequestStatus: text("delete_request_status"),
  // Staff-settable lever for "investor signed the MOU but doesn't follow up" (Institutional
  // Compliance Dossier round) — admin/super_admin only, audited, surfaced in both the Engagement
  // Detail drawer and the Users & Roles dossier's Portfolio tab. Null until staff first set it.
  followThroughStatus: followThroughStatusEnum("follow_through_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
