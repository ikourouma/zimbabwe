import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { auth } from "./server";
import type { AccountRole } from "./types";
import { DEFAULT_NOTIFICATION_PREFERENCES, type AccountStatus, type NotificationPreferences } from "@/lib/types";

export interface CurrentUserContext {
  userId: string;
  email: string;
  name: string;
  role: AccountRole;
  accountStatus: AccountStatus;
  organization: string | null;
  ministryId: string | null;
  /** ISO timestamp of the investor's clickwrap NDA acceptance, or null if not yet accepted —
   *  drives the Deal Room NdaGate (see components/deal-room/nda-gate.tsx). */
  ndaAcceptedAt: string | null;
  /** Server-persisted notification preferences, falling back to all-on defaults. */
  notificationPrefs: NotificationPreferences;
  /** R2 key of the uploaded avatar, or null (falls back to initials). */
  avatarKey: string | null;
  jobTitle: string | null;
  phone: string | null;
  // Institutional KYC fields, collected at Tier-2 NDA acceptance rather than self-registration
  // (see components/deal-room/nda-gate.tsx and the KYC-at-NDA gate policy).
  hqAddress: string | null;
  businessRegistrationId: string | null;
  websiteUrl: string | null;
  // Derived booleans matching useDemoPersona()'s shape 1:1, so swapping a component from the
  // demo hook to this real one (Phase 3 context-cutover) is a near no-op for consumers.
  isRegistered: boolean;
  isQualified: boolean;
  isGovernment: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

/**
 * Resolves the authenticated user's session plus their `profiles` row (role, org, ministry) in
 * one call. Returns `null` for unauthenticated visitors — callers treat that as the "public"
 * tier, exactly like `useDemoPersona()`'s `"public"` persona today.
 *
 * Call from Server Components (with `export const dynamic = "force-dynamic"`), Server Actions,
 * or Route Handlers — never from client components (use `authClient.useSession()` there instead).
 */
export async function getCurrentUser(): Promise<CurrentUserContext | null> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1);

  // A signed-up user with no profile row yet (e.g. mid-signup race) is treated as the lowest
  // real tier rather than throwing — `registered` is the default any new sign-up should land on.
  const role: AccountRole = profile?.role ?? "registered";
  const accountStatus = profile?.accountStatus ?? "active";

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    role,
    accountStatus,
    organization: profile?.organization ?? null,
    ministryId: profile?.ministryId ?? null,
    ndaAcceptedAt: profile?.ndaAcceptedAt?.toISOString() ?? null,
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(profile?.notificationPrefs ?? {}) },
    avatarKey: profile?.avatarKey ?? null,
    jobTitle: profile?.jobTitle ?? null,
    phone: profile?.phone ?? null,
    hqAddress: profile?.hqAddress ?? null,
    businessRegistrationId: profile?.businessRegistrationId ?? null,
    websiteUrl: profile?.websiteUrl ?? null,
    isRegistered: true, // any authenticated session is at least "registered"
    isQualified: role === "qualified" || role === "government" || role === "admin" || role === "super_admin",
    isGovernment: role === "government",
    isAdmin: role === "admin" || role === "super_admin",
    isSuperAdmin: role === "super_admin",
  };
}

/**
 * Guard for Server Components/Route Handlers behind a specific set of roles — the "Route
 * Handlers/Server Components using auth.getSession()" half of the server-side authorization
 * described in PRODUCTION_MIGRATION_PLAN.md Phase 2 (middleware.ts only proves "logged in",
 * this proves "logged in AND allowed here"). An inactive/suspended account is rejected
 * regardless of role.
 */
export async function requireRole(allowedRoles: AccountRole[]): Promise<CurrentUserContext> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("UNAUTHENTICATED", "Sign-in required.");
  if (user.accountStatus !== "active") {
    throw new AuthorizationError("ACCOUNT_INACTIVE", "This account is not active.");
  }
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError("FORBIDDEN", `Requires one of: ${allowedRoles.join(", ")}.`);
  }
  return user;
}

export class AuthorizationError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "ACCOUNT_INACTIVE" | "FORBIDDEN",
    message: string
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}
