import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ministries, profiles } from "@/lib/db/schema";
import type { AccountStatus, AdminUserRecord, CreatedByContext, UserDossier } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";
import { isFreeMailDomain } from "@/lib/utils/email-domain";

/**
 * Chain-of-custody snapshot builder (Team Ministry Traceability Batch, Phase 7) — the single
 * place both creation paths (`POST /api/users/create` and `approveOrgInvite`) go through to
 * produce a `profiles.createdByContext` value, so the shape can never drift between the two. Takes
 * a plain actor descriptor (not the full session `CurrentUserContext`, which the invite-approval
 * path doesn't have — it only has raw profile columns for the *owner*, not the validating staffer)
 * and resolves `ministryName` fresh at creation time since it's denormalized for durability.
 */
export async function buildCreatedByContext(actor: {
  name: string;
  role: AccountRole;
  organization: string | null;
  ministryId: string | null;
}): Promise<CreatedByContext> {
  let ministryName: string | null = null;
  if (actor.ministryId) {
    const [ministry] = await db.select({ name: ministries.name }).from(ministries).where(eq(ministries.id, actor.ministryId)).limit(1);
    ministryName = ministry?.name ?? null;
  }
  return {
    actorName: actor.name,
    actorRole: actor.role,
    organization: actor.organization,
    ministryId: actor.ministryId,
    ministryName,
  };
}

/** Joins every Neon Auth user with its (possibly missing) `profiles` row. A user with no
 *  profile row yet defaults to the "registered" tier, mirroring lib/auth/session.ts's
 *  getCurrentUser() fallback. Powers the Super Admin "Users & Roles" console
 *  (app/api/users/route.ts) — the live replacement for the old static reference table. */
export async function fetchAllUsers(): Promise<AdminUserRecord[]> {
  const rows = await db.execute<{
    id: string;
    email: string;
    name: string | null;
    created_at: string;
    role: AccountRole | null;
    account_status: AccountStatus | null;
    organization: string | null;
    ministry_id: string | null;
    job_title: string | null;
    phone: string | null;
    account_seq: number | null;
    nda_accepted_at: string | null;
    hq_address: string | null;
    business_registration_id: string | null;
    website_url: string | null;
    created_by_user_id: string | null;
    created_by_context: CreatedByContext | null;
  }>(sql`
    SELECT
      u.id,
      u.email,
      u.name,
      u."createdAt" AS created_at,
      p.role,
      p.account_status,
      p.organization,
      p.ministry_id,
      p.job_title,
      p.phone,
      p.account_seq,
      p.nda_accepted_at,
      p.hq_address,
      p.business_registration_id,
      p.website_url,
      p.created_by_user_id,
      p.created_by_context
    FROM neon_auth."user" u
    LEFT JOIN profiles p ON p.user_id = u.id::text
    ORDER BY u."createdAt" DESC
  `);

  return rows.rows.map((row) => ({
    userId: row.id,
    email: row.email,
    name: row.name ?? row.email,
    role: row.role ?? "registered",
    accountStatus: row.account_status ?? "active",
    organization: row.organization,
    ministryId: row.ministry_id,
    jobTitle: row.job_title,
    phone: row.phone,
    createdAt: new Date(row.created_at).toISOString(),
    // A user with no profile row yet has never been assigned a sequence — 0 is a safe sentinel
    // (accountSeq is 1-indexed in Postgres) that formatAccountRef() renders as "ZIDA-000000".
    accountSeq: row.account_seq ?? 0,
    ndaAcceptedAt: row.nda_accepted_at ? new Date(row.nda_accepted_at).toISOString() : null,
    hasCompletedKyc: isKycComplete(row),
    createdByUserId: row.created_by_user_id,
    createdByContext: row.created_by_context,
  }));
}

/** Ministry-scoped user directory (Platform Feedback Batch v3, Phase 1) — the `/ministry/users`
 *  console-admin-at-ministry-level page's data source. Deliberately narrower than fetchAllUsers():
 *  only `government`-role accounts bound to this one `ministryId`, since that's the entire ceiling
 *  a ministry_admin's own "Create User" capability can ever produce (see assignableRoles()). */
export async function fetchUsersByMinistry(ministryId: string): Promise<AdminUserRecord[]> {
  const rows = await db.execute<{
    id: string;
    email: string;
    name: string | null;
    created_at: string;
    role: AccountRole | null;
    account_status: AccountStatus | null;
    organization: string | null;
    ministry_id: string | null;
    job_title: string | null;
    phone: string | null;
    account_seq: number | null;
    nda_accepted_at: string | null;
    hq_address: string | null;
    business_registration_id: string | null;
    website_url: string | null;
    created_by_user_id: string | null;
    created_by_context: CreatedByContext | null;
  }>(sql`
    SELECT
      u.id, u.email, u.name, u."createdAt" AS created_at,
      p.role, p.account_status, p.organization, p.ministry_id, p.job_title, p.phone, p.account_seq,
      p.nda_accepted_at, p.hq_address, p.business_registration_id, p.website_url,
      p.created_by_user_id, p.created_by_context
    FROM neon_auth."user" u
    JOIN profiles p ON p.user_id = u.id::text
    WHERE p.role = 'government' AND p.ministry_id = ${ministryId}
    ORDER BY u."createdAt" DESC
  `);

  return rows.rows.map((row) => ({
    userId: row.id,
    email: row.email,
    name: row.name ?? row.email,
    role: row.role ?? "registered",
    accountStatus: row.account_status ?? "active",
    organization: row.organization,
    ministryId: row.ministry_id,
    jobTitle: row.job_title,
    phone: row.phone,
    createdAt: new Date(row.created_at).toISOString(),
    accountSeq: row.account_seq ?? 0,
    ndaAcceptedAt: row.nda_accepted_at ? new Date(row.nda_accepted_at).toISOString() : null,
    hasCompletedKyc: isKycComplete(row),
    createdByUserId: row.created_by_user_id,
    createdByContext: row.created_by_context,
  }));
}

/** All five institutional KYC fields (organization, phone, HQ address, business registration id,
 *  corporate website) must be present — broadened from the old businessRegistrationId-only check
 *  (Investor Qualification Vetting plan) now that KYC is meant to be captured as one complete
 *  set in the Strategic Partnerships wizard, not trickled in field-by-field. */
function isKycComplete(row: {
  organization: string | null;
  phone: string | null;
  hq_address: string | null;
  business_registration_id: string | null;
  website_url: string | null;
}): boolean {
  return Boolean(row.organization && row.phone && row.hq_address && row.business_registration_id && row.website_url);
}

/** Full single-user dossier payload for GET /api/users/[id] — the Institutional Compliance
 *  Dossier drawer's base fields (KYC + NDA trail), previously only exposed to the user themself
 *  via /api/me. Returns null if no matching Neon Auth user exists. */
export async function fetchUserDetail(userId: string): Promise<UserDossier | null> {
  const rows = await db.execute<{
    id: string;
    email: string;
    name: string | null;
    created_at: string;
    role: AccountRole | null;
    account_status: AccountStatus | null;
    organization: string | null;
    ministry_id: string | null;
    job_title: string | null;
    phone: string | null;
    account_seq: number | null;
    hq_address: string | null;
    business_registration_id: string | null;
    website_url: string | null;
    executive_representative_name: string | null;
    executive_representative_title: string | null;
    nda_accepted_at: string | null;
    nda_version: string | null;
    nda_accepted_ip: string | null;
    nda_accepted_title: string | null;
    created_by_user_id: string | null;
    created_by_context: CreatedByContext | null;
  }>(sql`
    SELECT
      u.id, u.email, u.name, u."createdAt" AS created_at,
      p.role, p.account_status, p.organization, p.ministry_id, p.job_title, p.phone, p.account_seq,
      p.hq_address, p.business_registration_id, p.website_url,
      p.executive_representative_name, p.executive_representative_title,
      p.nda_accepted_at, p.nda_version, p.nda_accepted_ip, p.nda_accepted_title,
      p.created_by_user_id, p.created_by_context
    FROM neon_auth."user" u
    LEFT JOIN profiles p ON p.user_id = u.id::text
    WHERE u.id = ${userId}
    LIMIT 1
  `);

  const row = rows.rows[0];
  if (!row) return null;

  return {
    userId: row.id,
    email: row.email,
    name: row.name ?? row.email,
    role: row.role ?? "registered",
    accountStatus: row.account_status ?? "active",
    organization: row.organization,
    ministryId: row.ministry_id,
    jobTitle: row.job_title,
    phone: row.phone,
    createdAt: new Date(row.created_at).toISOString(),
    accountSeq: row.account_seq ?? 0,
    hqAddress: row.hq_address,
    businessRegistrationId: row.business_registration_id,
    websiteUrl: row.website_url,
    executiveRepresentativeName: row.executive_representative_name,
    executiveRepresentativeTitle: row.executive_representative_title,
    ndaAcceptedAt: row.nda_accepted_at ? new Date(row.nda_accepted_at).toISOString() : null,
    hasCompletedKyc: isKycComplete({
      organization: row.organization,
      phone: row.phone,
      hq_address: row.hq_address,
      business_registration_id: row.business_registration_id,
      website_url: row.website_url,
    }),
    ndaVersion: row.nda_version,
    ndaAcceptedIp: row.nda_accepted_ip,
    ndaAcceptedTitle: row.nda_accepted_title,
    createdByUserId: row.created_by_user_id,
    createdByContext: row.created_by_context,
    isDomainVerified: !isFreeMailDomain(row.email),
    engagements: [],
    documentDownloads: { count: 0, items: [] },
    documentPreviews: { count: 0, items: [] },
  };
}

/** Aggregate account counts by role, no PII — lets Government read the same real totals the
 *  Government Executive Report's "Institutional Participant Summary" needs without granting
 *  blanket access to the full name/email-bearing GET /api/users list. Mirrors fetchAllUsers'
 *  LEFT JOIN + "registered" default so the totals always match. */
export async function fetchUserRoleCounts(): Promise<{ counts: Partial<Record<AccountRole, number>>; total: number }> {
  const rows = await db.execute<{ role: AccountRole; count: number }>(sql`
    SELECT COALESCE(p.role, 'registered') AS role, count(*)::int AS count
    FROM neon_auth."user" u
    LEFT JOIN profiles p ON p.user_id = u.id::text
    GROUP BY COALESCE(p.role, 'registered')
  `);

  const counts: Partial<Record<AccountRole, number>> = {};
  let total = 0;
  for (const row of rows.rows) {
    counts[row.role] = row.count;
    total += row.count;
  }
  return { counts, total };
}

/** Government officials linked to each ministry, keyed by `ministryId` — powers the Taxonomies
 *  workspace's "N Government Officials" count (deliberately a count, never named individuals; see
 *  the no-named-officials policy on the `ministries` table). */
export async function fetchMinistryOfficialCounts(): Promise<Record<string, number>> {
  const rows = await db.execute<{ ministry_id: string; count: number }>(sql`
    SELECT ministry_id, count(*)::int AS count
    FROM profiles
    WHERE ministry_id IS NOT NULL AND role = 'government'
    GROUP BY ministry_id
  `);

  const counts: Record<string, number> = {};
  for (const row of rows.rows) counts[row.ministry_id] = row.count;
  return counts;
}

/** Current role of a single account (or null if the user doesn't exist) — used by the mutation
 *  routes to enforce the manage-target ceiling before applying a change. */
export async function fetchUserRole(userId: string): Promise<AccountRole | null> {
  const rows = await db.execute<{ role: AccountRole | null; exists: boolean }>(sql`
    SELECT p.role, TRUE AS exists
    FROM neon_auth."user" u
    LEFT JOIN profiles p ON p.user_id = u.id::text
    WHERE u.id = ${userId}
    LIMIT 1
  `);
  const row = rows.rows[0];
  if (!row) return null;
  return row.role ?? "registered";
}

interface UpdateUserInput {
  role?: AccountRole;
  accountStatus?: AccountStatus;
  /** `null` clears the field; `undefined` leaves it untouched. */
  organization?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  ministryId?: string | null;
  hqAddress?: string | null;
  businessRegistrationId?: string | null;
  websiteUrl?: string | null;
  executiveRepresentativeName?: string | null;
  executiveRepresentativeTitle?: string | null;
  /** Chain-of-custody (Phase 7) — only ever passed by a creation-path caller (never by a later role
   *  edit), and deliberately excluded from the onConflict `set` below so it can never be silently
   *  overwritten even if this upsert is somehow called twice for the same user. */
  createdByUserId?: string | null;
  createdByContext?: CreatedByContext | null;
}

/** Upserts the `profiles` row for a user that may not have one yet (e.g. a fresh sign-up whose
 *  ensure-profile call hasn't landed) — same "registered" default as getCurrentUser(). */
export async function updateUserProfile(userId: string, updates: UpdateUserInput): Promise<AdminUserRecord | null> {
  await db
    .insert(profiles)
    .values({
      userId,
      role: updates.role ?? "registered",
      accountStatus: updates.accountStatus ?? "active",
      organization: updates.organization ?? null,
      jobTitle: updates.jobTitle ?? null,
      phone: updates.phone ?? null,
      ministryId: updates.ministryId ?? null,
      hqAddress: updates.hqAddress ?? null,
      businessRegistrationId: updates.businessRegistrationId ?? null,
      websiteUrl: updates.websiteUrl ?? null,
      executiveRepresentativeName: updates.executiveRepresentativeName ?? null,
      executiveRepresentativeTitle: updates.executiveRepresentativeTitle ?? null,
      createdByUserId: updates.createdByUserId ?? null,
      createdByContext: updates.createdByContext ?? null,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        ...(updates.role ? { role: updates.role } : {}),
        ...(updates.accountStatus ? { accountStatus: updates.accountStatus } : {}),
        ...(updates.organization !== undefined ? { organization: updates.organization } : {}),
        ...(updates.jobTitle !== undefined ? { jobTitle: updates.jobTitle } : {}),
        ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
        ...(updates.ministryId !== undefined ? { ministryId: updates.ministryId } : {}),
        ...(updates.hqAddress !== undefined ? { hqAddress: updates.hqAddress } : {}),
        ...(updates.businessRegistrationId !== undefined
          ? { businessRegistrationId: updates.businessRegistrationId }
          : {}),
        ...(updates.websiteUrl !== undefined ? { websiteUrl: updates.websiteUrl } : {}),
        ...(updates.executiveRepresentativeName !== undefined
          ? { executiveRepresentativeName: updates.executiveRepresentativeName }
          : {}),
        ...(updates.executiveRepresentativeTitle !== undefined
          ? { executiveRepresentativeTitle: updates.executiveRepresentativeTitle }
          : {}),
        updatedAt: sql`now()`,
      },
    });

  const rows = await db.execute<{
    id: string;
    email: string;
    name: string | null;
    created_at: string;
    role: AccountRole;
    account_status: AccountStatus;
    organization: string | null;
    ministry_id: string | null;
    job_title: string | null;
    phone: string | null;
    account_seq: number;
    nda_accepted_at: string | null;
    hq_address: string | null;
    business_registration_id: string | null;
    website_url: string | null;
    created_by_user_id: string | null;
    created_by_context: CreatedByContext | null;
  }>(sql`
    SELECT u.id, u.email, u.name, u."createdAt" AS created_at, p.role, p.account_status, p.organization, p.ministry_id, p.job_title, p.phone, p.account_seq,
      p.nda_accepted_at, p.hq_address, p.business_registration_id, p.website_url, p.created_by_user_id, p.created_by_context
    FROM neon_auth."user" u
    JOIN profiles p ON p.user_id = u.id::text
    WHERE u.id = ${userId}
    LIMIT 1
  `);

  const row = rows.rows[0];
  if (!row) return null;
  return {
    userId: row.id,
    email: row.email,
    name: row.name ?? row.email,
    role: row.role,
    accountStatus: row.account_status,
    organization: row.organization,
    ministryId: row.ministry_id,
    jobTitle: row.job_title,
    phone: row.phone,
    createdAt: new Date(row.created_at).toISOString(),
    accountSeq: row.account_seq,
    ndaAcceptedAt: row.nda_accepted_at ? new Date(row.nda_accepted_at).toISOString() : null,
    hasCompletedKyc: isKycComplete({
      organization: row.organization,
      phone: row.phone,
      hq_address: row.hq_address,
      business_registration_id: row.business_registration_id,
      website_url: row.website_url,
    }),
    createdByUserId: row.created_by_user_id,
    createdByContext: row.created_by_context,
  };
}

/** Looks up a user's Neon Auth id by email — used to close the "approve inquiry as qualified
 *  investor" loop (app/api/inquiries/[id]/route.ts), since inquiries only carry a free-text
 *  email, not a userId. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const result = await db.execute<{ id: string }>(
    sql`SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1`
  );
  return result.rows[0]?.id ?? null;
}

/** Bulk email -> Neon Auth id lookup (case-insensitive), keyed by lowercased email — powers the
 *  Inquiries "Open Dossier" link's best-effort account match for rows with no soft-linked
 *  `userId` yet (older submissions, or anonymous applicants who registered later). One query
 *  instead of N, since the inquiries queue is admin-only and small. */
export async function findUserIdsByEmails(emails: string[]): Promise<Record<string, string>> {
  if (emails.length === 0) return {};
  const lowered = [...new Set(emails.map((e) => e.toLowerCase()))];
  const rows = await db.execute<{ id: string; email: string }>(
    sql`SELECT id, email FROM neon_auth."user" WHERE lower(email) = ANY(${lowered})`
  );
  const map: Record<string, string> = {};
  for (const row of rows.rows) map[row.email.toLowerCase()] = row.id;
  return map;
}

export interface DealTeamMember {
  userId: string;
  name: string;
  role: AccountRole;
}

/** Active ZIDA staff (admin/super_admin/government) as a lightweight directory — powers the
 *  Communication Hub "route to a named case manager" picker (GET /api/deal-team) and lets the
 *  message POST resolve/validate a recipient. */
export async function fetchDealTeam(): Promise<DealTeamMember[]> {
  const rows = await db.execute<{ id: string; email: string; name: string | null; role: AccountRole }>(sql`
    SELECT u.id, u.email, u.name, p.role
    FROM neon_auth."user" u
    JOIN profiles p ON p.user_id = u.id::text
    WHERE p.role IN ('admin', 'super_admin', 'government')
      AND p.account_status = 'active'
    ORDER BY u.name NULLS LAST, u.email
  `);
  return rows.rows.map((row) => ({
    userId: row.id,
    name: row.name ?? row.email,
    role: row.role,
  }));
}

/** Active `admin`/`super_admin` accounts only (no `government`) — the eligible-assignee pool for
 *  ZIDA Case Manager assignment (Team Ministry Traceability Batch, Phase 2/8, item 6). Narrower
 *  than fetchDealTeam by design: a Case Manager owns/drives project stages, which `government`
 *  reviewers don't do (see roleToWorkflowRole). */
export async function fetchCaseManagerCandidates(): Promise<DealTeamMember[]> {
  const rows = await db.execute<{ id: string; email: string; name: string | null; role: AccountRole }>(sql`
    SELECT u.id, u.email, u.name, p.role
    FROM neon_auth."user" u
    JOIN profiles p ON p.user_id = u.id::text
    WHERE p.role IN ('admin', 'super_admin')
      AND p.account_status = 'active'
    ORDER BY u.name NULLS LAST, u.email
  `);
  return rows.rows.map((row) => ({
    userId: row.id,
    name: row.name ?? row.email,
    role: row.role,
  }));
}

export interface MessageableUser {
  userId: string;
  name: string;
  role: AccountRole;
  organization: string | null;
}

/** Active non-staff users (qualified investors, government liaisons, registered) that ZIDA staff
 *  can start a Communication Hub thread with — powers the staff-side compose recipient picker and
 *  fan-out broadcast (GET /api/deal-team/investors). Emails are intentionally omitted (no PII). */
export async function fetchMessageableInvestors(): Promise<MessageableUser[]> {
  const rows = await db.execute<{ id: string; email: string; name: string | null; role: AccountRole; organization: string | null }>(sql`
    SELECT u.id, u.email, u.name, p.role, p.organization
    FROM neon_auth."user" u
    JOIN profiles p ON p.user_id = u.id::text
    WHERE p.role IN ('qualified', 'government', 'registered')
      AND p.account_status = 'active'
    ORDER BY u.name NULLS LAST, u.email
  `);
  return rows.rows.map((row) => ({
    userId: row.id,
    name: row.name ?? row.email,
    role: row.role,
    organization: row.organization,
  }));
}

/** Distinct signed-in investors with an `investor_engagements` row on one project — the ministry
 *  Communication Hub's "Investors" recipient group (Ministry Message Recipient Targeting plan):
 *  a ministry_admin can route a project message to a specific investor engaged on that same
 *  project, not just to a ZIDA case manager. Deliberately project-scoped, not ministry-wide, so
 *  the recipient list always matches who the message will actually be about. */
export async function fetchInvestorsEngagedOnProject(projectId: string): Promise<MessageableUser[]> {
  const rows = await db.execute<{ id: string; email: string; name: string | null; role: AccountRole; organization: string | null }>(sql`
    SELECT DISTINCT u.id, u.email, u.name, p.role, p.organization
    FROM investor_engagements ie
    JOIN neon_auth."user" u ON u.id::text = ie.user_id
    LEFT JOIN profiles p ON p.user_id = u.id::text
    WHERE ie.project_id = ${projectId}
      AND ie.user_id IS NOT NULL
      AND ie.deleted_at IS NULL
    ORDER BY u.name NULLS LAST, u.email
  `);
  return rows.rows.map((row) => ({
    userId: row.id,
    name: row.name ?? row.email,
    role: row.role,
    organization: row.organization,
  }));
}

/** Resolves a single staff member for recipient validation (used by the message POST when an
 *  investor routes a message to a named case manager). Returns null if the id is not active staff. */
/** Government-role users tied to a specific ministry (`profiles.ministryId`) — used to name the
 *  designated government official(s) on a project's approved-engagement deletion request, so the
 *  transparency notification reads as a deliberate governance step (see the delete-request Action
 *  Card copy) rather than an incidental side effect of the broad `isStaff` visibility rule. */
export async function fetchGovernmentOfficialsForMinistry(ministryId: string): Promise<DealTeamMember[]> {
  const rows = await db.execute<{ id: string; email: string; name: string | null; role: AccountRole }>(sql`
    SELECT u.id, u.email, u.name, p.role
    FROM neon_auth."user" u
    JOIN profiles p ON p.user_id = u.id::text
    WHERE p.role = 'government'
      AND p.account_status = 'active'
      AND p.ministry_id = ${ministryId}
    ORDER BY u.name NULLS LAST, u.email
  `);
  return rows.rows.map((row) => ({ userId: row.id, name: row.name ?? row.email, role: row.role }));
}

/** Active `ministry_admin` accounts tied to a specific ministry — the Full Persona Communication
 *  Parity plan's "government <-> their ministry_admin desk" recipient/thread-owner resolution:
 *  a government official's ministry can have more than one ministry_admin seat (see the Team
 *  Ministry Traceability Batch's multi-admin-per-ministry pilot), so this returns all of them. */
export async function fetchMinistryAdminsForMinistry(ministryId: string): Promise<DealTeamMember[]> {
  const rows = await db.execute<{ id: string; email: string; name: string | null; role: AccountRole }>(sql`
    SELECT u.id, u.email, u.name, p.role
    FROM neon_auth."user" u
    JOIN profiles p ON p.user_id = u.id::text
    WHERE p.role = 'ministry_admin'
      AND p.account_status = 'active'
      AND p.ministry_id = ${ministryId}
    ORDER BY u.name NULLS LAST, u.email
  `);
  return rows.rows.map((row) => ({ userId: row.id, name: row.name ?? row.email, role: row.role }));
}

export async function fetchDealTeamMember(userId: string): Promise<DealTeamMember | null> {
  const rows = await db.execute<{ id: string; email: string; name: string | null; role: AccountRole }>(sql`
    SELECT u.id, u.email, u.name, p.role
    FROM neon_auth."user" u
    JOIN profiles p ON p.user_id = u.id::text
    WHERE u.id = ${userId}
      AND p.role IN ('admin', 'super_admin', 'government')
      AND p.account_status = 'active'
    LIMIT 1
  `);
  const row = rows.rows[0];
  if (!row) return null;
  return { userId: row.id, name: row.name ?? row.email, role: row.role };
}
