import { pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * Org team-member invite/validation lifecycle (Deal Room Feedback Batch v2, Phase 5 — items 8 & 11,
 * investor side; reused unmodified by Phase 6 for the ministry_admin persona). A qualified investor
 * (`ownerUserId`) invites a named teammate by email; the invite sits `pending_validation` until a
 * ZIDA admin/super_admin reviews it (`approveOrgInvite`/`rejectOrgInvite` in
 * lib/db/queries/org-team.ts) — approval either links an existing account or provisions a new one
 * directly (same `createAuthUserDirect` path as the super-admin "Create User" feature), then sets
 * `status: "active"`. The owner never gets to self-approve their own invite — this validation step
 * is the "Four-Eyes" control preventing an investor from unilaterally minting qualified accounts.
 * `revoked` covers both an owner-initiated cancellation of a still-pending invite and a staff reject.
 */
export const orgInviteStatusEnum = pgEnum("org_invite_status", ["pending_validation", "active", "revoked"]);

export const orgInvites = pgTable("org_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Soft link to neon_auth.user.id — same non-hard-FK convention as profiles.userId/
  // projectWatchlist.userId (neon_auth is a separate, service-managed schema outside this
  // Drizzle schema).
  ownerUserId: text("owner_user_id").notNull(),
  inviteEmail: text("invite_email").notNull(),
  inviteName: text("invite_name").notNull(),
  status: orgInviteStatusEnum("status").notNull().default("pending_validation"),
  // Set once validated — the invitee's real neon_auth.user.id, whether linked (account already
  // existed) or newly provisioned on approval.
  invitedUserId: text("invited_user_id"),
  // Captured on the owner's own invite form (Platform Feedback Batch v3, Phase 2) — surfaced to the
  // ZIDA reviewer in TeamInviteValidationQueue's detail dialog *before* Approve/Reject, since none of
  // these existed previously and reviewers were deciding blind on nothing but a name/email/inviter.
  // All optional: an owner can still submit a bare invite, same as before this batch.
  justification: text("justification"),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  validatedBy: text("validated_by"),
});

/**
 * Per-project co-editor grant for a validated org teammate (Phase 5) — deliberately NOT blanket
 * org-wide access to every proposal the owner has ever filed; the owner opts a teammate into
 * specific project(s) of interest one at a time via the picker on that proposal's detail view.
 * Edits made under an assignment are attributed to the assignee's own identity (their real
 * `userId`), not the org owner's — see the `PATCH /api/projects/[id]` "creator" workflow-role gate.
 */
export const projectTeamAssignments = pgTable(
  "project_team_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    assignedBy: text("assigned_by").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("project_team_assignments_unique").on(t.projectId, t.userId)]
);
