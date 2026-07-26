"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  Camera,
  Check,
  Fingerprint,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  Mail,
  Monitor,
  ShieldCheck,
  ShieldQuestion,
  Smartphone,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { authClient } from "@/lib/auth/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { PasswordInput } from "@/components/auth/password-input";
import {
  executiveFieldClassName,
  executiveFieldStyle,
} from "@/components/auth/executive-field-styles";
import type { AccountRole } from "@/lib/auth/types";
import type { NotificationPreferences } from "@/lib/types";

const ROLE_LABELS: Record<AccountRole, string> = {
  registered: "Registered Investor",
  qualified: "Qualified Investor",
  government: "Government User",
  admin: "ZIDA Admin",
  super_admin: "Platform Admin",
};

const ROLE_SCOPE: Record<AccountRole, string> = {
  registered:
    "Browse the project registry, expand summaries, save a watchlist, and submit strategic inquiries.",
  qualified:
    "Full Deal Room access: document data room, engagement pipeline, Communication Hub, and MOU workflow.",
  government:
    "Government portfolio oversight, sovereign engagement tooling, and inter-ministerial coordination.",
  admin:
    "Manage projects, engagements, inquiries, users, and the Communication Hub across the platform.",
  super_admin:
    "Full platform administration, site settings, role assignment, and the governance audit trail.",
};

/**
 * The Account & Security suite (Fortune-100 settings surface). A single dark-themed, tabbed view
 * rendered both standalone at /account (avatar menu, all roles) and inside consoles. All auth
 * operations go straight to the Neon Managed Better Auth client — no bespoke security endpoints.
 */
export function AccountView() {
  const { isLoading, isAuthenticated, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading your account…
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Account &amp; Security</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Manage your profile, credentials, active sessions, and notification preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-white/5 border-white/10 mb-5 flex-wrap h-auto">
          <TabsTrigger value="profile" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
            Security
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
            Sessions
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab role={role} />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ Profile ---- */

function ProfileTab() {
  const { userId, name, email, role, organization, avatarKey, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(name ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [identity, setIdentity] = useState<{ loading: boolean; provider: string | null }>({
    loading: true,
    provider: null,
  });

  useEffect(() => {
    setDisplayName(name ?? "");
  }, [name]);

  const avatarSrc = userId && (avatarKey || avatarVersion > 0) && !avatarFailed
    ? `/api/avatars/${userId}?v=${avatarVersion}`
    : null;

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image exceeds the 5 MB limit");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/account/avatar", { method: "POST", body });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Upload failed");
      }
      setAvatarFailed(false);
      setAvatarVersion((v) => v + 1);
      await refresh();
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload avatar");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authClient.listAccounts();
        const accounts = (res?.data ?? []) as Array<{ provider?: string; providerId?: string }>;
        const federated = accounts.find((a) => (a.provider ?? a.providerId) && (a.provider ?? a.providerId) !== "credential");
        if (active) {
          setIdentity({ loading: false, provider: federated ? (federated.provider ?? federated.providerId ?? "SSO") : null });
        }
      } catch {
        if (active) setIdentity({ loading: false, provider: null });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const initials = useMemo(() => {
    const source = (name ?? email ?? "").trim();
    if (!source) return "?";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name, email]);

  const dirty = displayName.trim() !== (name ?? "").trim() && displayName.trim().length > 0;

  const resetProfile = () => setDisplayName(name ?? "");

  const saveName = async () => {
    if (!dirty) return;
    setSaving(true);
    const previous = name ?? "";
    const next = displayName.trim();
    try {
      const res = await authClient.updateUser({ name: next });
      if (res?.error) throw new Error(res.error.message ?? "Update failed");
      // Better Auth owns the mutation; mirror it into our audit trail (fire-and-forget).
      void fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: previous, to: next }),
      });
      await refresh();
      toast.success("Profile changes saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="dashboard-panel p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative h-14 w-14 shrink-0">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-semibold text-black"
                style={{ backgroundColor: "#FFD300" }}
                aria-hidden
              >
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-white truncate">{name ?? "—"}</p>
            <span className="inline-flex items-center gap-1.5 mt-1 text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/80">
              <ShieldCheck className="h-3 w-3" />
              {role ? ROLE_LABELS[role] : "—"}
            </span>
          </div>
          <div className="ml-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={handleAvatarPick}
              disabled={uploading}
              className="px-3 py-2 rounded text-xs font-medium border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              Change avatar
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: "var(--color-text-muted)" }}>
              Display name *
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={executiveFieldClassName}
              style={executiveFieldStyle(!!displayName)}
              autoComplete="name"
            />
          </div>

          <ReadOnlyRow icon={Mail} label="Email" value={email ?? "—"} managed="Read-only" />
          <ReadOnlyRow icon={Building2} label="Entity" value={organization ?? "Not provided"} managed="Managed by ZIDA" />
          <ReadOnlyRow
            icon={Fingerprint}
            label="Identity"
            value={
              identity.loading
                ? "Checking…"
                : identity.provider
                  ? `Managed by ${identity.provider}`
                  : "Local password"
            }
            managed={identity.provider ? "SSO" : undefined}
          />
        </div>

        {/* Section-level dirty-state action bar (Fortune-100 pattern) — replaces the old inline
            per-field save button. */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <p className="text-xs" style={{ color: dirty ? "#fbbf24" : "var(--color-text-muted)" }}>
            {dirty ? "Unsaved profile changes." : "Profile details up to date."}
          </p>
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                type="button"
                onClick={resetProfile}
                disabled={saving}
                className="px-3 py-2 rounded text-sm font-medium text-white/70 hover:text-white disabled:opacity-40 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={saveName}
              disabled={!dirty || saving}
              className="px-4 py-2 rounded text-sm font-semibold bg-[#FFD300] text-black hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-1.5"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save profile changes
            </button>
          </div>
        </div>
      </section>

      {role && <EntitlementsPanel role={role} />}
    </div>
  );
}

function ReadOnlyRow({
  icon: Icon,
  label,
  value,
  managed,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  managed?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
      <span className="text-[10px] font-mono tracking-widest uppercase w-24 shrink-0" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span className="text-sm text-white truncate">{value}</span>
      {managed && (
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0" style={{ color: "var(--color-text-muted)" }}>
          <Lock className="h-2.5 w-2.5" />
          {managed}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Entitlements ---- */

function EntitlementsPanel({ role }: { role: AccountRole }) {
  const canRequest = role !== "admin" && role !== "super_admin";
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/request-elevation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Request failed");
      setRequested(true);
      setOpen(false);
      setNote("");
      toast.success("Request submitted to the ZIDA team");
    } catch {
      toast.error("Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" /> Access &amp; Entitlements
      </h2>
      <div className="flex items-start gap-3 mb-3">
        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/80 shrink-0">
          {ROLE_LABELS[role]}
        </span>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {ROLE_SCOPE[role]}
        </p>
      </div>

      {canRequest && (
        <div className="pt-3 border-t border-white/10">
          {requested ? (
            <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
              <Check className="h-3.5 w-3.5" /> Your request is with the ZIDA team. We&apos;ll be in touch.
            </p>
          ) : !open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-sm font-medium text-[#FFD300] hover:underline"
            >
              Request elevated permissions
            </button>
          ) : (
            <div className="space-y-2">
              <label htmlFor="elevationNote" className="block text-[10px] font-mono tracking-widest uppercase" style={{ color: "var(--color-text-muted)" }}>
                Tell us what access you need (optional)
              </label>
              <textarea
                id="elevationNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className={executiveFieldClassName}
                style={executiveFieldStyle(!!note)}
                placeholder="e.g. Requesting qualified-investor access to review the data room for Project X."
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="px-3 py-2 rounded text-sm font-medium bg-white/10 text-white hover:bg-white/15 disabled:opacity-40 transition-colors"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded text-sm text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------- Security ---- */

const PW_RULES: { key: string; label: string; test: (v: string) => boolean }[] = [
  { key: "len", label: "At least 12 characters", test: (v) => v.length >= 12 },
  { key: "num", label: "Contains a number", test: (v) => /\d/.test(v) },
  { key: "special", label: "Contains a special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function SecurityTab({ role }: { role: AccountRole | null }) {
  void role;
  const [identity, setIdentity] = useState<{ loading: boolean; provider: string | null }>({
    loading: true,
    provider: null,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authClient.listAccounts();
        const accounts = (res?.data ?? []) as Array<{ provider?: string; providerId?: string }>;
        const federated = accounts.find((a) => (a.provider ?? a.providerId) && (a.provider ?? a.providerId) !== "credential");
        if (active) setIdentity({ loading: false, provider: federated ? (federated.provider ?? federated.providerId ?? "SSO") : null });
      } catch {
        if (active) setIdentity({ loading: false, provider: null });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      {identity.loading ? (
        <section className="dashboard-panel p-5 flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Checking sign-in method…
        </section>
      ) : identity.provider ? (
        <ManagedIdentityCard provider={identity.provider} />
      ) : (
        <PasswordChangeCard />
      )}

      <MfaScaffoldCard />
    </div>
  );
}

function ManagedIdentityCard({ provider }: { provider: string }) {
  return (
    <section className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" /> Managed Identity
      </h2>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Your sign-in is managed by <span className="text-white font-medium capitalize">{provider}</span>. Password and
        multi-factor settings are controlled by your identity provider, not here.
      </p>
    </section>
  );
}

function PasswordChangeCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [saving, setSaving] = useState(false);

  const rulesPassed = PW_RULES.every((r) => r.test(next));
  const matches = next.length > 0 && next === confirm;
  const canSubmit = current.length > 0 && rulesPassed && matches && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: revokeOthers,
      });
      if (res?.error) throw new Error(res.error.message ?? "Password change failed");
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success(revokeOthers ? "Password changed — other sessions signed out" : "Password changed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <KeyRound className="h-4 w-4" /> Change Password
      </h2>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <Field label="Current password">
          <PasswordInput
            id="currentPassword"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
            showLabel="Show password"
            hideLabel="Hide password"
          />
        </Field>
        <Field label="New password">
          <PasswordInput
            id="newPassword"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
            showLabel="Show password"
            hideLabel="Hide password"
          />
        </Field>
        <ul className="space-y-1">
          {PW_RULES.map((r) => {
            const ok = r.test(next);
            return (
              <li key={r.key} className="flex items-center gap-2 text-xs" style={{ color: ok ? "#4ade80" : "var(--color-text-muted)" }}>
                {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {r.label}
              </li>
            );
          })}
        </ul>
        <Field label="Confirm new password">
          <PasswordInput
            id="confirmPassword"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            showLabel="Show password"
            hideLabel="Hide password"
          />
          {confirm.length > 0 && !matches && (
            <p className="text-xs mt-1" style={{ color: "#f87171" }}>
              Passwords do not match.
            </p>
          )}
        </Field>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
          <Switch checked={revokeOthers} onCheckedChange={setRevokeOthers} aria-label="Sign out other sessions" />
          Sign out of all other sessions
        </label>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2.5 rounded text-sm font-medium bg-white/10 text-white hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </button>
      </form>
    </section>
  );
}

function MfaScaffoldCard() {
  return (
    <section className="dashboard-panel p-5 opacity-90">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Lock className="h-4 w-4" /> Multi-Factor Authentication
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Add an authenticator app (TOTP) or passkey for a second layer of protection on sensitive
            deal-room actions.
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-mono tracking-widest uppercase px-2 py-1 rounded bg-white/5 border border-white/10 text-white/50">
          Coming soon
        </span>
      </div>
      <button
        type="button"
        disabled
        className="mt-4 px-4 py-2.5 rounded text-sm font-medium bg-white/5 text-white/40 cursor-not-allowed"
        title="Enabled once MFA is turned on in the Neon Console"
      >
        Enable MFA
      </button>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- Sessions ---- */

interface SessionRow {
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
}

function deviceLabel(ua?: string | null): { label: string; icon: typeof Monitor } {
  if (!ua) return { label: "Unknown device", icon: Monitor };
  const os =
    /Windows/i.test(ua) ? "Windows" :
    /Mac OS X|Macintosh/i.test(ua) ? "macOS" :
    /Android/i.test(ua) ? "Android" :
    /iPhone|iPad|iOS/i.test(ua) ? "iOS" :
    /Linux/i.test(ua) ? "Linux" : "";
  const browser =
    /Edg\//i.test(ua) ? "Edge" :
    /Chrome\//i.test(ua) && !/Edg\//i.test(ua) ? "Chrome" :
    /Firefox\//i.test(ua) ? "Firefox" :
    /Safari\//i.test(ua) && !/Chrome\//i.test(ua) ? "Safari" : "Browser";
  const mobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const label = [browser, os].filter(Boolean).join(" · ") || "Browser";
  return { label, icon: mobile ? Smartphone : Laptop };
}

function relativeTime(iso?: string | Date | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function SessionsTab() {
  const { data: sessionData } = authClient.useSession();
  const currentToken = (sessionData as { session?: { token?: string } } | null | undefined)?.session?.token ?? null;

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authClient.listSessions();
      const rows = (res?.data ?? []) as unknown as SessionRow[];
      // Newest activity first.
      rows.sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime());
      setSessions(rows);
    } catch {
      toast.error("Could not load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revokeOne = async (token: string) => {
    setBusy(token);
    try {
      const res = await authClient.revokeSession({ token });
      if (res?.error) throw new Error();
      setSessions((prev) => prev.filter((s) => s.token !== token));
      toast.success("Session revoked");
    } catch {
      toast.error("Could not revoke session");
    } finally {
      setBusy(null);
    }
  };

  const revokeAllOthers = async () => {
    setBusy("__all__");
    try {
      const res = await authClient.revokeSessions();
      if (res?.error) throw new Error();
      await load();
      toast.success("All other sessions signed out");
    } catch {
      toast.error("Could not revoke sessions");
    } finally {
      setBusy(null);
    }
  };

  const otherCount = sessions.filter((s) => s.token !== currentToken).length;

  return (
    <section className="dashboard-panel p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Monitor className="h-4 w-4" /> Active Sessions
        </h2>
        {otherCount > 0 && (
          <button
            type="button"
            onClick={revokeAllOthers}
            disabled={busy === "__all__"}
            className="text-xs font-medium text-[#FFD300] hover:underline disabled:opacity-40"
          >
            {busy === "__all__" ? "Revoking…" : "Revoke all others"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm py-6" style={{ color: "var(--color-text-muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm py-4" style={{ color: "var(--color-text-muted)" }}>
          No active sessions found.
        </p>
      ) : (
        <ul className="divide-y divide-white/10">
          {sessions.map((s) => {
            const { label, icon: Icon } = deviceLabel(s.userAgent);
            const isCurrent = s.token === currentToken;
            return (
              <li key={s.token} className="flex items-center gap-3 py-3">
                <Icon className="h-5 w-5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white flex items-center gap-2">
                    {label}
                    {isCurrent && (
                      <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {s.ipAddress || "IP unavailable"} · {relativeTime(s.updatedAt ?? s.createdAt) || "—"}
                  </p>
                </div>
                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => revokeOne(s.token)}
                    disabled={busy === s.token}
                    className="shrink-0 text-xs font-medium text-white/60 hover:text-white transition-colors disabled:opacity-40"
                  >
                    {busy === s.token ? "…" : "Revoke"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs mt-4 flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
        <ShieldQuestion className="h-3.5 w-3.5" /> Approximate location from IP is coming soon.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------ Notifications ---- */

const PREF_LABELS: Record<keyof NotificationPreferences, string> = {
  engagementUpdates: "Engagement status changes",
  newMessages: "New Communication Hub messages",
  mouActivity: "MOU lifecycle activity",
};

function NotificationsTab() {
  const { notificationPrefs, refresh } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences>(notificationPrefs);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(notificationPrefs);
  }, [notificationPrefs]);

  const setPref = async (key: keyof NotificationPreferences, value: boolean) => {
    const optimistic = { ...prefs, [key]: value };
    setPrefs(optimistic);
    setSaving(key);
    try {
      const res = await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error();
      await refresh();
      toast.success("Preference saved");
    } catch {
      setPrefs((prev) => ({ ...prev, [key]: !value })); // roll back
      toast.error("Could not save preference");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Bell className="h-4 w-4" /> Notification Preferences
      </h2>
      <div className="space-y-3">
        {(Object.keys(PREF_LABELS) as (keyof NotificationPreferences)[]).map((key) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
              {PREF_LABELS[key]}
              {saving === key && <Loader2 className="h-3 w-3 animate-spin" />}
            </span>
            <Switch
              checked={prefs[key]}
              onCheckedChange={(v) => setPref(key, v)}
              aria-label={PREF_LABELS[key]}
            />
          </div>
        ))}
      </div>
      <p className="text-xs mt-4" style={{ color: "var(--color-text-muted)" }}>
        Preferences are saved to your account and apply on every device. Email/in-app delivery
        activates as those channels come online.
      </p>
    </section>
  );
}
