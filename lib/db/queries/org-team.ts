import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { investorEngagements, orgInvites, profiles, projectTeamAssignments } from "@/lib/db/schema";
import type { AccountStatus, TeamAssignmentSummary } from "@/lib/types";
import { createAuthUserDirect, generateTempPassword } from "@/lib/auth/direct-signup";
import { buildCreatedByContext, findUserIdByEmail, updateUserProfile } from "@/lib/db/queries/users";
import { notifyUser } from "@/lib/email/notify";
import { ApiError } from "@/lib/api/route-helpers";
import type { OrgInvite, ProjectTeamMember } from "@/lib/types";

function toApp(row: typeof orgInvites.$inferSelect, invitedUserAccountStatus?: AccountStatus | null): OrgInvite {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    inviteEmail: row.inviteEmail,
    inviteName: row.inviteName,
    justification: row.justification,
    phone: row.phone,
    address: row.address,
    status: row.status,
    invitedUserId: row.invitedUserId,
    invitedUserAccountStatus: invitedUserAccountStatus ?? null,
    createdAt: row.createdAt.toISOString(),
    validatedAt: row.validatedAt?.toISOString() ?? null,
    validatedBy: row.validatedBy,
  };
}

/** The org owner's own team-member invites, newest first — powers the My Profile "My Team" panel
 *  and the /deal-room/teams (or /ministry/teams) roster. Left-joined with `profiles` on
 *  `invitedUserId` so the roster can tell an `active` invite whose person is currently `suspended`
 *  (Phase 3, Suspend/Reinstate) apart from a fully `active` one — both share `status: "active"` on
 *  the invite row itself; the distinction lives on the person's own account status. */
export async function fetchOrgInvitesByOwner(ownerUserId: string): Promise<OrgInvite[]> {
  const rows = await db
    .select({ invite: orgInvites, accountStatus: profiles.accountStatus })
    .from(orgInvites)
    .leftJoin(profiles, eq(profiles.userId, orgInvites.invitedUserId))
    .where(eq(orgInvites.ownerUserId, ownerUserId))
    .orderBy(desc(orgInvites.createdAt));
  return rows.map((r) => toApp(r.invite, r.accountStatus));
}

/** Platform-wide validation queue (Users & Roles console, both tiers) — every invite still
 *  awaiting a ZIDA decision, joined with the inviting owner's own name/org/ministry for reviewer
 *  context, plus the invitee's captured detail (justification/phone/address, Phase 2) and the
 *  role they'll be granted on approval — so a reviewer never decides blind. */
export async function fetchPendingOrgInvites(): Promise<OrgInvite[]> {
  const rows = await db.execute<{
    id: string;
    owner_user_id: string;
    invite_email: string;
    invite_name: string;
    justification: string | null;
    phone: string | null;
    address: string | null;
    status: OrgInvite["status"];
    invited_user_id: string | null;
    created_at: string;
    validated_at: string | null;
    validated_by: string | null;
    owner_name: string | null;
    owner_email: string;
    owner_organization: string | null;
    owner_role: "qualified" | "ministry_admin" | null;
    owner_ministry_name: string | null;
  }>(sql`
    SELECT
      oi.id, oi.owner_user_id, oi.invite_email, oi.invite_name, oi.justification, oi.phone, oi.address,
      oi.status, oi.invited_user_id, oi.created_at, oi.validated_at, oi.validated_by,
      u.name AS owner_name, u.email AS owner_email, p.organization AS owner_organization, p.role AS owner_role,
      m.name AS owner_ministry_name
    FROM org_invites oi
    JOIN neon_auth."user" u ON u.id::text = oi.owner_user_id
    LEFT JOIN profiles p ON p.user_id = oi.owner_user_id
    LEFT JOIN ministries m ON m.id = p.ministry_id
    WHERE oi.status = 'pending_validation'
    ORDER BY oi.created_at ASC
  `);
  return rows.rows.map((row) => ({
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name ?? row.owner_email,
    ownerOrganization: row.owner_organization,
    ownerMinistryName: row.owner_ministry_name,
    // Mirrors approveOrgInvite's own role-mirroring logic exactly — kept here purely for
    // reviewer-facing display, never re-derived at approval time (that still reads the owner's
    // live profile row directly).
    resultingRole: row.owner_role === "ministry_admin" ? "ministry_admin" : "qualified",
    inviteEmail: row.invite_email,
    inviteName: row.invite_name,
    justification: row.justification,
    phone: row.phone,
    address: row.address,
    status: row.status,
    invitedUserId: row.invited_user_id,
    createdAt: new Date(row.created_at).toISOString(),
    validatedAt: row.validated_at ? new Date(row.validated_at).toISOString() : null,
    validatedBy: row.validated_by,
  }));
}

/** Optional invitee detail captured on the owner's own invite form (Phase 2) — surfaced to the
 *  ZIDA reviewer before Approve/Reject. All fields are optional; omitting them entirely preserves
 *  the pre-Phase-2 bare invite behavior. */
export interface OrgInviteDetails {
  justification?: string;
  phone?: string;
  address?: string;
}

/** Creates a new team-member invite, guarding against a duplicate still-live (pending or active)
 *  invite from the same owner to the same email — an owner re-inviting a revoked/rejected email is
 *  allowed (fresh row), since the prior attempt is a closed chapter, not an active duplicate. */
export async function createOrgInvite(
  ownerUserId: string,
  inviteEmail: string,
  inviteName: string,
  details?: OrgInviteDetails
): Promise<OrgInvite> {
  const email = inviteEmail.trim().toLowerCase();
  const [existing] = await db
    .select({ id: orgInvites.id })
    .from(orgInvites)
    .where(
      and(
        eq(orgInvites.ownerUserId, ownerUserId),
        sql`lower(${orgInvites.inviteEmail}) = ${email}`,
        sql`${orgInvites.status} IN ('pending_validation', 'active')`
      )
    )
    .limit(1);
  if (existing) {
    throw new ApiError("You already have a pending or active invite for this email.", 400);
  }

  const [inserted] = await db
    .insert(orgInvites)
    .values({
      ownerUserId,
      inviteEmail: email,
      inviteName: inviteName.trim(),
      justification: details?.justification?.trim() || null,
      phone: details?.phone?.trim() || null,
      address: details?.address?.trim() || null,
      status: "pending_validation",
    })
    .returning();
  return toApp(inserted);
}

/**
 * What each of an owner's *active* team members is currently assigned to — powers the Teams page
 * roster's "Currently working on" column (Team Ministry Traceability Batch, Phase 4, items 3/4).
 * Proposal (co-editor) assignments come from `project_team_assignments`; engagement (Delegate)
 * assignments come from `investor_engagements.assignedUserId` (Phase 5) — filtered by the
 * engagement's own `userId` (its actual owner), not `assignedBy`, since a Delegate can be assigned
 * by staff on the owner's behalf (see the assign route's staff-assist path) and should still show
 * up under the real owner's roster either way.
 */
export async function fetchTeamAssignmentsSummaryByOwner(ownerUserId: string): Promise<Record<string, TeamAssignmentSummary>> {
  const [proposalRows, engagementRows] = await Promise.all([
    db.execute<{ user_id: string; project_id: string; project_title: string }>(sql`
      SELECT pta.user_id, pta.project_id, p.title AS project_title
      FROM project_team_assignments pta
      JOIN projects p ON p.id = pta.project_id
      WHERE pta.assigned_by = ${ownerUserId}
      ORDER BY p.title ASC
    `),
    db.execute<{ assigned_user_id: string; engagement_id: string; project_title: string }>(sql`
      SELECT ie.assigned_user_id, ie.id AS engagement_id, p.title AS project_title
      FROM investor_engagements ie
      JOIN projects p ON p.id = ie.project_id
      WHERE ie.user_id = ${ownerUserId} AND ie.assigned_user_id IS NOT NULL AND ie.deleted_at IS NULL
      ORDER BY p.title ASC
    `),
  ]);
  const summary: Record<string, TeamAssignmentSummary> = {};
  for (const row of proposalRows.rows) {
    const entry = summary[row.user_id] ?? { proposals: [], engagements: [] };
    entry.proposals.push({ id: row.project_id, title: row.project_title });
    summary[row.user_id] = entry;
  }
  for (const row of engagementRows.rows) {
    const entry = summary[row.assigned_user_id] ?? { proposals: [], engagements: [] };
    entry.engagements.push({ id: row.engagement_id, title: row.project_title });
    summary[row.assigned_user_id] = entry;
  }
  return summary;
}

/** Owner cancels a still-pending invite, or revokes an already-`active` teammate's access.
 *  Cancelling a pending invite is always a simple no-consequence flip. Revoking an *active*
 *  teammate is the Phase 8 "safe reassignment handoff": if that person still holds any co-editor
 *  (proposal) or Delegate (engagement) assignments, this throws a 409 UNLESS `fallbackToOwner` is
 *  explicitly passed — the caller (DELETE route) is expected to have already shown the owner the
 *  affected list (from GET /api/org-team/assignments, which the client already has loaded) and
 *  gotten explicit confirmation before setting that flag. On fallback, every affected proposal's
 *  co-editor grant is removed (project reverts to owner-only) and every affected engagement's
 *  Delegate is cleared (falling `primaryContactUserId` back to the owner too, mirroring the
 *  unassign route's own handoff logic) — never a silent dangling reference. */
export async function revokeOrgInvite(
  id: string,
  ownerUserId: string,
  options?: { fallbackToOwner?: boolean }
): Promise<OrgInvite> {
  const [current] = await db.select().from(orgInvites).where(eq(orgInvites.id, id)).limit(1);
  if (!current) throw new ApiError("Invite not found.", 404);
  if (current.ownerUserId !== ownerUserId) throw new ApiError("You can only manage your own team invites.", 403);
  if (current.status === "revoked") throw new ApiError("This invite has already been revoked.", 400);

  if (current.status === "pending_validation") {
    const [updated] = await db.update(orgInvites).set({ status: "revoked" }).where(eq(orgInvites.id, id)).returning();
    return toApp(updated);
  }

  // status === "active" from here on.
  const invitedUserId = current.invitedUserId;
  if (invitedUserId) {
    const [proposalRows, engagementRows] = await Promise.all([
      db
        .select({ id: projectTeamAssignments.projectId })
        .from(projectTeamAssignments)
        .where(and(eq(projectTeamAssignments.userId, invitedUserId), eq(projectTeamAssignments.assignedBy, ownerUserId))),
      db
        .select({ id: investorEngagements.id, primaryContactUserId: investorEngagements.primaryContactUserId })
        .from(investorEngagements)
        .where(
          and(
            eq(investorEngagements.assignedUserId, invitedUserId),
            eq(investorEngagements.userId, ownerUserId),
            isNull(investorEngagements.deletedAt)
          )
        ),
    ]);

    const affectedCount = proposalRows.length + engagementRows.length;
    if (affectedCount > 0) {
      if (!options?.fallbackToOwner) {
        throw new ApiError(
          `This teammate still holds ${affectedCount} active assignment${affectedCount === 1 ? "" : "s"} (${proposalRows.length} proposal co-editor grant${proposalRows.length === 1 ? "" : "s"}, ${engagementRows.length} engagement Delegate assignment${engagementRows.length === 1 ? "" : "s"}). Reassign them individually first, or confirm falling them all back to you.`,
          409
        );
      }
      await Promise.all([
        proposalRows.length > 0
          ? db
              .delete(projectTeamAssignments)
              .where(and(eq(projectTeamAssignments.userId, invitedUserId), eq(projectTeamAssignments.assignedBy, ownerUserId)))
          : Promise.resolve(),
        engagementRows.length > 0
          ? db
              .update(investorEngagements)
              .set({ assignedUserId: null, assignedBy: null, assignedAt: null, primaryContactUserId: null, updatedAt: new Date() })
              .where(and(eq(investorEngagements.assignedUserId, invitedUserId), eq(investorEngagements.userId, ownerUserId)))
          : Promise.resolve(),
      ]);
    }
  }

  const [updated] = await db.update(orgInvites).set({ status: "revoked" }).where(eq(orgInvites.id, id)).returning();

  if (invitedUserId) {
    void notifyUser({
      userId: invitedUserId,
      prefKey: "teamActivity",
      subject: "Your team access has been revoked",
      bodyHtml: `<p>Your access as a team member has been revoked by the account owner. Any proposals or engagements you were assigned to now revert to them directly.</p>`,
    });
  }

  return toApp(updated);
}

/** Temporarily blocks an *active* teammate's platform access without touching the roster or
 *  falling any of their work back to the owner — unlike `revokeOrgInvite`/Archive. Sets
 *  `profiles.accountStatus = "suspended"` on the invitee's own account, which `requireRole()`
 *  already enforces platform-wide (ACCOUNT_INACTIVE) on every request. The org invite itself stays
 *  `status: "active"` — the roster still lists them and their assignments are untouched, ready to
 *  resume the moment they're reinstated. */
export async function suspendTeamMember(id: string, ownerUserId: string): Promise<OrgInvite> {
  const [current] = await db.select().from(orgInvites).where(eq(orgInvites.id, id)).limit(1);
  if (!current) throw new ApiError("Invite not found.", 404);
  if (current.ownerUserId !== ownerUserId) throw new ApiError("You can only manage your own team invites.", 403);
  if (current.status !== "active" || !current.invitedUserId) {
    throw new ApiError("Only an active teammate can be suspended.", 400);
  }
  await updateUserProfile(current.invitedUserId, { accountStatus: "suspended" });
  return toApp(current, "suspended");
}

/** Brings a teammate back — whichever of the two "removed" states they're in:
 *  - Still `active` on the roster but personally `suspended` -> flips their `accountStatus` back
 *    to `active` (undoes `suspendTeamMember`).
 *  - `revoked`/Archived on the roster -> un-archives the invite itself (`status: "active"` again)
 *    and defensively clears any lingering `suspended` account status. Their prior proposal
 *    co-editor/Delegate assignments were already cleared by `revokeOrgInvite` at archive time and
 *    are not restored automatically — the owner re-assigns as needed, same as a brand-new teammate. */
export async function reinstateTeamMember(id: string, ownerUserId: string): Promise<OrgInvite> {
  const [current] = await db.select().from(orgInvites).where(eq(orgInvites.id, id)).limit(1);
  if (!current) throw new ApiError("Invite not found.", 404);
  if (current.ownerUserId !== ownerUserId) throw new ApiError("You can only manage your own team invites.", 403);
  if (current.status === "pending_validation") {
    throw new ApiError("This invite is still awaiting ZIDA review.", 400);
  }

  if (current.status === "active") {
    if (current.invitedUserId) await updateUserProfile(current.invitedUserId, { accountStatus: "active" });
    return toApp(current, "active");
  }

  // status === "revoked" (Archived) — un-archive.
  const [updated] = await db.update(orgInvites).set({ status: "active" }).where(eq(orgInvites.id, id)).returning();
  if (updated.invitedUserId) await updateUserProfile(updated.invitedUserId, { accountStatus: "active" });
  return toApp(updated, "active");
}

/**
 * Staff approval — the Four-Eyes validation step no owner can bypass on their own invite. Links an
 * existing account if the invite email already has one (mirrors the "approve inquiry" pattern in
 * app/api/inquiries/[id]/route.ts); otherwise provisions a brand-new one directly (same
 * `createAuthUserDirect` path as super-admin "Create User"), since — unlike a marketing-form
 * inquiry — the owner has already vouched for this named person, so waiting on a separate self-serve
 * signup first would just add friction.
 *
 * The invitee's role/scope mirrors the *inviting owner's own* role (Phase 6 generalization): a
 * `qualified` owner's invitees become `qualified` + inherit `organization`; a `ministry_admin`
 * owner's invitees become `ministry_admin` + inherit the same `ministryId` — peers on the same
 * ministry desk, not a lesser sub-role, exactly mirroring how a qualified investor's invitees join
 * as fellow `qualified` teammates on the same org.
 */
export async function approveOrgInvite(
  id: string,
  validatorUserId: string
): Promise<{ invite: OrgInvite; accountCreated: boolean; tempPassword?: string }> {
  const [current] = await db.select().from(orgInvites).where(eq(orgInvites.id, id)).limit(1);
  if (!current) throw new ApiError("Invite not found.", 404);
  if (current.status !== "pending_validation") throw new ApiError("This invite has already been decided.", 400);

  const ownerProfileRows = await db.execute<{
    role: "qualified" | "ministry_admin";
    organization: string | null;
    ministry_id: string | null;
    name: string | null;
    email: string;
  }>(
    sql`SELECT p.role, p.organization, p.ministry_id, u.name, u.email
        FROM profiles p JOIN neon_auth."user" u ON u.id::text = p.user_id
        WHERE p.user_id = ${current.ownerUserId} LIMIT 1`
  );
  const ownerProfile = ownerProfileRows.rows[0];
  const isMinistryOwner = ownerProfile?.role === "ministry_admin";

  let invitedUserId = await findUserIdByEmail(current.inviteEmail);
  let accountCreated = false;
  let tempPassword: string | undefined;

  if (!invitedUserId) {
    tempPassword = generateTempPassword();
    const created = await createAuthUserDirect(current.inviteEmail, tempPassword, current.inviteName);
    invitedUserId = created.userId;
    accountCreated = true;
  }

  // Chain-of-custody (Team Ministry Traceability Batch, Phase 7): attributed to the *inviting*
  // owner, not the validating staffer — `validatedBy` on the invite record already covers who
  // approved it. Snapshot captures the owner's own org/ministry at approval time.
  const createdByContext = await buildCreatedByContext({
    name: ownerProfile?.name ?? ownerProfile?.email ?? "Unknown",
    role: ownerProfile?.role ?? "qualified",
    organization: ownerProfile?.organization ?? null,
    ministryId: ownerProfile?.ministry_id ?? null,
  });

  await updateUserProfile(invitedUserId, {
    role: isMinistryOwner ? "ministry_admin" : "qualified",
    organization: isMinistryOwner ? undefined : ownerProfile?.organization ?? undefined,
    ministryId: isMinistryOwner ? ownerProfile?.ministry_id ?? undefined : undefined,
    // Only applied on first insert (a brand-new invitee with no existing profile row) — see the
    // onConflict `set` in updateUserProfile, which deliberately excludes these two fields so a
    // *second* invite/approval for an already-existing account can never overwrite the original
    // chain-of-custody record.
    createdByUserId: current.ownerUserId,
    createdByContext,
  });

  const [updated] = await db
    .update(orgInvites)
    .set({ status: "active", invitedUserId, validatedAt: new Date(), validatedBy: validatorUserId })
    .where(eq(orgInvites.id, id))
    .returning();

  // Notification hook (Phase 8, item 1): the new Team Member finds out their account is live
  // without needing to poll the invite status themselves.
  void notifyUser({
    userId: invitedUserId,
    prefKey: "teamActivity",
    subject: "Your ZIDA team account is now active",
    bodyHtml: `<p>Hi ${current.inviteName},</p>
      <p>ZIDA has validated your invite from <strong>${ownerProfile?.name ?? "your organization"}</strong> — your account is now active${isMinistryOwner ? " on their ministry desk" : " in their organization"}.</p>
      <p>Sign in to get started.</p>`,
  });

  return { invite: toApp(updated), accountCreated, tempPassword };
}

/** Staff rejection — leaves any existing account (if the invitee already had one) completely
 *  untouched; only the invite record itself is closed out. */
export async function rejectOrgInvite(id: string, validatorUserId: string): Promise<OrgInvite> {
  const [current] = await db.select().from(orgInvites).where(eq(orgInvites.id, id)).limit(1);
  if (!current) throw new ApiError("Invite not found.", 404);
  if (current.status !== "pending_validation") throw new ApiError("This invite has already been decided.", 400);

  const [updated] = await db
    .update(orgInvites)
    .set({ status: "revoked", validatedAt: new Date(), validatedBy: validatorUserId })
    .where(eq(orgInvites.id, id))
    .returning();
  return toApp(updated);
}

/** Every teammate currently assigned to a project, joined with display name/email — powers the
 *  proposal detail view's "Team" section for both the owner (managing it) and the assignees
 *  themselves (seeing who else has access). */
export async function fetchProjectTeamAssignments(projectId: string): Promise<ProjectTeamMember[]> {
  const rows = await db.execute<{ user_id: string; name: string | null; email: string; assigned_by: string; assigned_at: string }>(
    sql`
      SELECT pta.user_id, u.name, u.email, pta.assigned_by, pta.assigned_at
      FROM project_team_assignments pta
      JOIN neon_auth."user" u ON u.id::text = pta.user_id
      WHERE pta.project_id = ${projectId}
      ORDER BY pta.assigned_at ASC
    `
  );
  return rows.rows.map((r) => ({
    userId: r.user_id,
    name: r.name ?? r.email,
    email: r.email,
    assignedBy: r.assigned_by,
    assignedAt: new Date(r.assigned_at).toISOString(),
  }));
}

/** Just the assigned userIds for a project — the cheap, join-free read used by fetchAllProjects'
 *  per-row relation loading and the visibility gates (no name/email needed there). */
export async function fetchProjectTeamUserIds(projectId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: projectTeamAssignments.userId })
    .from(projectTeamAssignments)
    .where(eq(projectTeamAssignments.projectId, projectId));
  return rows.map((r) => r.userId);
}

/** True once `userId` has an active co-editor assignment on `projectId` — the extension point the
 *  Phase 5 plan calls for on the PATCH/GET `/api/projects/[id]` "creator" ownership gate, so it
 *  passes for an assigned teammate exactly as it already does for `createdBy === userId`. */
export async function isProjectTeamMember(projectId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: projectTeamAssignments.id })
    .from(projectTeamAssignments)
    .where(and(eq(projectTeamAssignments.projectId, projectId), eq(projectTeamAssignments.userId, userId)))
    .limit(1);
  return Boolean(row);
}

/** True once `userId` is one of `ownerUserId`'s own validated (`active`) team members — the shared
 *  guard behind every "assign one of my teammates to X" mutation (proposal co-editor, engagement
 *  Delegate) so an owner can never grant access to someone else's teammate. */
export async function isActiveTeamMemberOf(ownerUserId: string, userId: string): Promise<boolean> {
  const [validInvite] = await db
    .select({ id: orgInvites.id })
    .from(orgInvites)
    .where(and(eq(orgInvites.ownerUserId, ownerUserId), eq(orgInvites.invitedUserId, userId), eq(orgInvites.status, "active")))
    .limit(1);
  return Boolean(validInvite);
}

/** Assigns a validated teammate to a proposal — only ever called after confirming the caller is
 *  either the proposal's own owner or staff (see app/api/projects/[id]/team/route.ts); `userId`
 *  must itself be one of `assignedBy`'s own validated (`active`) invitees, so an owner can never
 *  grant access to someone else's teammate. */
export async function assignTeamMemberToProject(projectId: string, userId: string, assignedBy: string): Promise<void> {
  if (!(await isActiveTeamMemberOf(assignedBy, userId))) {
    throw new ApiError("This person is not one of your validated team members.", 400);
  }

  await db.insert(projectTeamAssignments).values({ projectId, userId, assignedBy }).onConflictDoNothing();
}

export async function removeTeamAssignment(projectId: string, userId: string): Promise<void> {
  await db
    .delete(projectTeamAssignments)
    .where(and(eq(projectTeamAssignments.projectId, projectId), eq(projectTeamAssignments.userId, userId)));
}
