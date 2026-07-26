import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { mouStatusEnum } from "./enums";
import { investorEngagements } from "./engagements";

// One MOU per approved investor_engagements row (see the Deal Room Engagement and MOU Upgrade
// plan's lifecycle: drafting -> in_review -> both_approved -> finalized -> ready_for_signature ->
// executed). Deliberately a structured form, not a rich-text/redline editor — correction requests
// happen via the Communication Hub thread scoped to this engagement (project_messages rows with
// visibility = "mou"), not a separate annotation system. Real e-signature capture is an explicit,
// deferred extension point: `executed` only ever records signer metadata, never a live signature.
export const engagementMous = pgTable("engagement_mous", {
  id: uuid("id").primaryKey().defaultRandom(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => investorEngagements.id, { onDelete: "cascade" })
    .unique(),
  status: mouStatusEnum("status").notNull().default("drafting"),
  // Structured content — parties, project reference, indicative capital/ticket, term bullets,
  // effective date, special conditions. Free-shaped jsonb rather than a wide column set so new
  // term fields don't require a migration; the API route is the single source of truth for shape.
  content: jsonb("content").notNull().default({}),
  // Becomes an immutable snapshot the moment status crosses into "finalized" — every edit after
  // that point can only touch `formatting`, never this. Enforced in the API route, not the DB.
  contentSnapshot: jsonb("content_snapshot"),
  // Formatting-only preferences (letterhead toggle, page-break preference, footer text) that stay
  // editable through "ready_for_signature" — drives a print-friendly window.print() render, not a
  // new PDF pipeline. Matches "formatted as needed without changing approved content."
  formatting: jsonb("formatting").notNull().default({}),
  // Dual-approval gate ahead of "finalized" (both the investor and an authorized ZIDA/Admin/
  // Government user must approve draft content before Finalize unlocks) — the standard CLM
  // checkpoint so ZIDA can never unilaterally declare something final the investor never signed
  // off on in-platform.
  investorApprovedAt: timestamp("investor_approved_at", { withTimezone: true }),
  investorApprovedBy: text("investor_approved_by"),
  zidaApprovedAt: timestamp("zida_approved_at", { withTimezone: true }),
  zidaApprovedBy: text("zida_approved_by"),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  finalizedBy: text("finalized_by"),
  readyForSignatureAt: timestamp("ready_for_signature_at", { withTimezone: true }),
  readyForSignatureBy: text("ready_for_signature_by"),
  // Signature metadata only (no e-sign vendor integration yet) — "signed in due time and location
  // approved by both parties" per the client's explicit instruction to build this extension point
  // now without a live capture flow.
  executedAt: timestamp("executed_at", { withTimezone: true }),
  executedBy: text("executed_by"),
  signatureMetadata: jsonb("signature_metadata"),
  formattingLocked: boolean("formatting_locked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
