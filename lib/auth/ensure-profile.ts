import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLogs, profiles } from "@/lib/db/schema";
import type { AccountRole } from "./types";

interface InviteIntentMetadata {
  role?: AccountRole;
  organization?: string;
  ministryId?: string;
  jobTitle?: string;
  phone?: string;
}

/** Looks up the most recent `user.invite_requested` audit entry filed for this email (entityId is
 *  the invited email, lowercased — see POST /api/users/invite). Used only when a brand-new profile
 *  is being created, so an admin's invite intent (role/org/ministry/jobTitle/phone) actually takes
 *  effect the moment the invitee signs up, instead of silently defaulting to "registered". */
async function findInviteIntent(email: string): Promise<InviteIntentMetadata | null> {
  const [row] = await db
    .select({ metadata: auditLogs.metadata })
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "user_invite"), eq(auditLogs.entityId, email.trim().toLowerCase())))
    .orderBy(desc(auditLogs.createdAt))
    .limit(1);
  return (row?.metadata as InviteIntentMetadata | undefined) ?? null;
}

/** Creates or refreshes the app `profiles` row for a Neon Auth user id. On first-ever creation
 *  (no existing row), applies a matching invite-intent record if one exists for `email` — role,
 *  organization, ministry, job title, and phone all pre-populate from the invite instead of the
 *  "registered" default. Explicit `options` (e.g. from a self-serve registration flow) still win
 *  over invite-intent values. */
export async function ensureProfileForUser(
  userId: string,
  options?: { role?: AccountRole; organization?: string | null; email?: string | null }
) {
  const [existing] = await db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.userId, userId)).limit(1);

  const invite = !existing && options?.email ? await findInviteIntent(options.email) : null;

  const role = options?.role ?? invite?.role ?? "registered";
  const organization = options?.organization !== undefined ? options.organization : invite?.organization ?? null;

  await db
    .insert(profiles)
    .values({
      userId,
      role,
      accountStatus: "active",
      organization,
      ministryId: invite?.ministryId ?? null,
      jobTitle: invite?.jobTitle ?? null,
      phone: invite?.phone ?? null,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        accountStatus: "active",
        updatedAt: sql`now()`,
        ...(options?.role ? { role: options.role } : {}),
        ...(options?.organization !== undefined ? { organization: options.organization } : {}),
      },
    });

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return profile ?? null;
}
