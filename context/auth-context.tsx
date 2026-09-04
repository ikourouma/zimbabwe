"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { authClient } from "@/lib/auth/client";
import { DEFAULT_NOTIFICATION_PREFERENCES, type AccountStatus, type DemoPersona, type NotificationPreferences } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";

interface MeResponse {
  authenticated: boolean;
  persona: DemoPersona;
  userId?: string;
  role?: AccountRole;
  accountStatus?: AccountStatus;
  email?: string;
  name?: string;
  organization?: string | null;
  ministryId?: string | null;
  ndaAcceptedAt?: string | null;
  notificationPrefs?: NotificationPreferences;
  avatarKey?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  hqAddress?: string | null;
  businessRegistrationId?: string | null;
  websiteUrl?: string | null;
  executiveRepresentativeName?: string | null;
  executiveRepresentativeTitle?: string | null;
  businessRegistrationDocKey?: string | null;
  isRegistered: boolean;
  isQualified: boolean;
  isGovernment: boolean;
  isMinistryAdmin: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

interface AuthContextValue {
  persona: DemoPersona;
  /** Neon Auth user id — used client-side to detect ownership (e.g. can I edit this draft
   *  engagement?). Server routes always re-verify ownership; this is UI affordance only. */
  userId: string | null;
  role: AccountRole | null;
  accountStatus: AccountStatus;
  isRegistered: boolean;
  isQualified: boolean;
  isGovernment: boolean;
  isMinistryAdmin: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  email: string | null;
  name: string | null;
  organization: string | null;
  /** Set for `government` and `ministry_admin` accounts tied to a specific beneficiary ministry —
   *  used to scope "my activity" views (see PersonalActivityReport) and, for `ministry_admin`, the
   *  entire /ministry console's data visibility (see lib/entitlements/ministry-scope.ts). Null for
   *  every other role. */
  ministryId: string | null;
  /** null = investor has not yet accepted the Deal Room NDA (or not applicable). */
  ndaAcceptedAt: string | null;
  /** Server-persisted notification preferences (Account & Security suite). */
  notificationPrefs: NotificationPreferences;
  /** R2 avatar key, or null when the user has no uploaded avatar (falls back to initials). */
  avatarKey: string | null;
  phone: string | null;
  jobTitle: string | null;
  /** Institutional KYC fields, collected at Tier-2 NDA acceptance — see nda-gate.tsx. */
  hqAddress: string | null;
  businessRegistrationId: string | null;
  websiteUrl: string | null;
  /** The authorized company representative on file — editable on the My Profile page, used to
   *  prepopulate "Propose a Project"'s read-only owner/representative fields. */
  executiveRepresentativeName: string | null;
  executiveRepresentativeTitle: string | null;
  businessRegistrationDocKey: string | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_DEFAULT: AuthContextValue = {
  persona: "public",
  userId: null,
  role: null,
  accountStatus: "active",
  isRegistered: false,
  isQualified: false,
  isGovernment: false,
  isMinistryAdmin: false,
  isAdmin: false,
  isSuperAdmin: false,
  isLoading: true,
  isAuthenticated: false,
  email: null,
  name: null,
  organization: null,
  ministryId: null,
  ndaAcceptedAt: null,
  notificationPrefs: DEFAULT_NOTIFICATION_PREFERENCES,
  avatarKey: null,
  phone: null,
  jobTitle: null,
  hqAddress: null,
  businessRegistrationId: null,
  websiteUrl: null,
  executiveRepresentativeName: null,
  executiveRepresentativeTitle: null,
  businessRegistrationDocKey: null,
  refresh: async () => {},
};

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/me");
  if (!res.ok) throw new Error("Failed to load session");
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<Omit<AuthContextValue, "refresh" | "isLoading"> | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setProfile({
        persona: me.persona,
        userId: me.userId ?? null,
        role: me.role ?? null,
        accountStatus: me.accountStatus ?? "active",
        isRegistered: me.isRegistered,
        isQualified: me.isQualified,
        isGovernment: me.isGovernment,
        isMinistryAdmin: me.isMinistryAdmin,
        isAdmin: me.isAdmin,
        isSuperAdmin: me.isSuperAdmin,
        isAuthenticated: me.authenticated,
        email: me.email ?? null,
        name: me.name ?? null,
        organization: me.organization ?? null,
        ministryId: me.ministryId ?? null,
        ndaAcceptedAt: me.ndaAcceptedAt ?? null,
        notificationPrefs: me.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFERENCES,
        avatarKey: me.avatarKey ?? null,
        phone: me.phone ?? null,
        jobTitle: me.jobTitle ?? null,
        hqAddress: me.hqAddress ?? null,
        businessRegistrationId: me.businessRegistrationId ?? null,
        websiteUrl: me.websiteUrl ?? null,
        executiveRepresentativeName: me.executiveRepresentativeName ?? null,
        executiveRepresentativeTitle: me.executiveRepresentativeTitle ?? null,
        businessRegistrationDocKey: me.businessRegistrationDocKey ?? null,
      });
    } catch {
      setProfile({
        persona: "public",
        userId: null,
        role: null,
        accountStatus: "active",
        isRegistered: false,
        isQualified: false,
        isGovernment: false,
        isMinistryAdmin: false,
        isAdmin: false,
        isSuperAdmin: false,
        isAuthenticated: false,
        email: null,
        name: null,
        organization: null,
        ministryId: null,
        ndaAcceptedAt: null,
        notificationPrefs: DEFAULT_NOTIFICATION_PREFERENCES,
        avatarKey: null,
        phone: null,
        jobTitle: null,
        hqAddress: null,
        businessRegistrationId: null,
        websiteUrl: null,
        executiveRepresentativeName: null,
        executiveRepresentativeTitle: null,
        businessRegistrationDocKey: null,
      });
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setProfile({
        persona: "public",
        userId: null,
        role: null,
        accountStatus: "active",
        isRegistered: false,
        isQualified: false,
        isGovernment: false,
        isMinistryAdmin: false,
        isAdmin: false,
        isSuperAdmin: false,
        isAuthenticated: false,
        email: null,
        name: null,
        organization: null,
        ministryId: null,
        ndaAcceptedAt: null,
        notificationPrefs: DEFAULT_NOTIFICATION_PREFERENCES,
        avatarKey: null,
        phone: null,
        jobTitle: null,
        hqAddress: null,
        businessRegistrationId: null,
        websiteUrl: null,
        executiveRepresentativeName: null,
        executiveRepresentativeTitle: null,
        businessRegistrationDocKey: null,
      });
      setProfileLoaded(true);
      return;
    }
    void refresh();
  }, [session?.user, isPending, refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...(profile ?? PUBLIC_DEFAULT),
      isLoading: isPending || !profileLoaded,
      refresh,
    }),
    [profile, isPending, profileLoaded, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** @deprecated Use `useAuth()` — kept as a drop-in during Milestone 2 cutover. */
export function useDemoPersona() {
  const auth = useAuth();
  return {
    persona: auth.persona,
    isRegistered: auth.isRegistered,
    isQualified: auth.isQualified,
    isGovernment: auth.isGovernment,
    isMinistryAdmin: auth.isMinistryAdmin,
    isAdmin: auth.isAdmin,
    isSuperAdmin: auth.isSuperAdmin,
    isLoading: auth.isLoading,
    // No-op — real auth replaces persona switching.
    setPersona: () => {},
  };
}
