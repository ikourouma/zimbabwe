import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import type { AccountStatus, AdminUserRecord, UserDossier } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";
import { isFreeMailDomain } from "@/lib/utils/email-domain";

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
    business_registration_id: string | null;
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
      p.business_registration_id
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
    hasCompletedKyc: Boolean(row.business_registration_id),
  }));
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
    nda_accepted_at: string | null;
    nda_version: string | null;
    nda_accepted_ip: string | null;
    nda_accepted_title: string | null;
  }>(sql`
    SELECT
      u.id, u.email, u.name, u."createdAt" AS created_at,
      p.role, p.account_status, p.organization, p.ministry_id, p.job_title, p.phone, p.account_seq,
      p.hq_address, p.business_registration_id, p.website_url,
      p.nda_accepted_at, p.nda_version, p.nda_accepted_ip, p.nda_accepted_title
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
    ndaAcceptedAt: row.nda_accepted_at ? new Date(row.nda_accepted_at).toISOString() : null,
    hasCompletedKyc: Boolean(row.business_registration_id),
    ndaVersion: row.nda_version,
    ndaAcceptedIp: row.nda_accepted_ip,
    ndaAcceptedTitle: row.nda_accepted_title,
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
    business_registration_id: string | null;
  }>(sql`
    SELECT u.id, u.email, u.name, u."createdAt" AS created_at, p.role, p.account_status, p.organization, p.ministry_id, p.job_title, p.phone, p.account_seq,
      p.nda_accepted_at, p.business_registration_id
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
    hasCompletedKyc: Boolean(row.business_registration_id),
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
