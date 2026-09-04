"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Check,
  Download,
  Eye,
  FileSignature,
  Handshake,
  History,
  KeyRound,
  ListChecks,
  Lock,
  MailWarning,
  MessageCircle,
  Pencil,
  Radar,
  ShieldCheck,
  UserX,
  UserCheck,
  UserMinus,
  UserSquare,
  Wallet,
  X,
} from "lucide-react";
import type { AdminUserRecord, AuditLogEntry, FollowThroughStatus, Ministry, UserDossier } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";
import type { AccountStatusAction } from "@/components/dashboard/account-status-modal";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useUserDossier } from "@/lib/hooks/use-user-dossier";
import { formatAccountRef } from "@/lib/utils/account-ref";
import { MOU_STATUS_LABELS } from "@/lib/governance/mou-workflow";
import { parseCapitalTotalMillions, formatMillions } from "@/lib/utils/capital";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ElevatedTabsList, ElevatedTabsTrigger } from "@/components/ui/elevated-tabs";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { EngagementStatusPill } from "@/components/deal-room/engagement-status-pill";
import { MessageThread } from "@/components/deal-room/message-thread";
import { ROLE_LABELS } from "@/components/dashboard/role-change-modal";

const STATUS_LABELS: Record<AdminUserRecord["accountStatus"], string> = {
  active: "Active",
  suspended: "Suspended",
  pending: "Pending",
  deactivated: "Deactivated",
};

const FOLLOW_THROUGH_LABELS: Record<FollowThroughStatus, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  non_responsive: "Non-Responsive",
  completed: "Completed",
};

const FOLLOW_THROUGH_COLOR: Record<FollowThroughStatus, string> = {
  on_track: "#4ade80",
  at_risk: "#fbbf24",
  non_responsive: "#f87171",
  completed: "#93c5fd",
};

interface UserDetailDrawerProps {
  user: AdminUserRecord | null;
  isSelf: boolean;
  onClose: () => void;
  onRequestRoleChange: (user: AdminUserRecord, nextRole: AccountRole) => void;
  /** Four-Eyes governance (Sovereign Dossier Drawer Round 2) — Suspend/Reactivate/Deactivate all
   *  route through the shared AccountStatusModal in users-workspace.tsx, which owns its own
   *  pending state and mandatory-reason gate; the drawer no longer manages a local busy toggle. */
  onRequestStatusChange: (user: AdminUserRecord, action: AccountStatusAction) => void;
  /** Ministry rebind (Institutional Compliance Dossier round) — previously only settable at
   *  account creation. `null` unassigns it. */
  onUpdateMinistry: (userId: string, ministryId: string | null) => Promise<void>;
  /** Opens the shared Edit Details modal (Platform Feedback Batch v4, Phase 4) — owned by the
   *  parent workspace, same as the row action's "Edit details" menu item, so there's only ever one
   *  edit flow/one source of truth for the underlying save. */
  onEdit: (user: AdminUserRecord) => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-xs uppercase tracking-wide shrink-0" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span className="text-sm text-right min-w-0 truncate" style={{ color: "var(--color-text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}

/** Deferred-infra quick action — rendered but disabled, with an explanatory note, so we never
 *  imply a capability (email invite send, cross-user session revoke, document review) that isn't
 *  wired yet. */
function DeferredAction({ icon: Icon, label, note }: { icon: typeof Lock; label: string; note: string }) {
  return (
    <div
      className="rounded-md px-3 py-2 opacity-60"
      style={{ border: "1px dashed var(--color-sovereign-border)" }}
    >
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
      </div>
      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
        {note}
      </p>
    </div>
  );
}

/**
 * Institutional Compliance & Governance Dossier — the master-detail drawer for a single account
 * (Users & Roles center). Four tabs: Institutional Profile, Compliance & NDA, Portfolio &
 * Activity, and Security & Governance. Supports a `?userId=` deep link from the parent page.
 * Fetches the richer GET /api/users/[id] dossier payload on open (see useUserDossier); the
 * lighter AdminUserRecord `user` prop renders immediately so the header/basic fields never wait
 * on the round trip. Wired actions sit alongside clearly-labeled deferred ones (MFA enrollment,
 * accreditation document upload) pending future infrastructure.
 */
export function UserDetailDrawer({
  user,
  isSelf,
  onClose,
  onRequestRoleChange,
  onRequestStatusChange,
  onUpdateMinistry,
  onEdit,
}: UserDetailDrawerProps) {
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const { ministries } = useTaxonomyStore();

  const userId = user?.userId ?? null;
  const { dossier, isLoading: dossierLoading, refresh: refreshDossier } = useUserDossier(userId);

  // Cross-component refresh: the Edit Details modal is owned by the parent workspace (so there's
  // one save flow whether it's opened from here or from the table row action) — once it saves, this
  // picks up the change if this same account's drawer is still open. Mirrors the
  // zim:engagement-updated pattern already used by the Engagement Detail Drawer.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (detail?.userId && detail.userId === userId) refreshDossier();
    };
    window.addEventListener("zim:user-details-updated", handler);
    return () => window.removeEventListener("zim:user-details-updated", handler);
  }, [userId, refreshDossier]);

  const loadAudit = useCallback(async (id: string) => {
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/audit`);
      if (res.ok) setAudit(await res.json());
      else setAudit([]);
    } catch {
      setAudit([]);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) void loadAudit(userId);
    else setAudit([]);
  }, [userId, loadAudit]);

  return (
    <Sheet open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        {user && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="status-badge status-badge-active">{ROLE_LABELS[user.role]}</span>
                <span
                  className="status-badge"
                  style={{
                    color: user.accountStatus === "active" ? "#4ade80" : user.accountStatus === "suspended" ? "#f87171" : "#fde047",
                  }}
                >
                  {STATUS_LABELS[user.accountStatus]}
                </span>
                <span className="text-[11px] font-mono ml-auto" style={{ color: "var(--color-text-muted)" }}>
                  {formatAccountRef(dossier?.accountSeq ?? user.accountSeq)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <SheetTitle>{user.name}</SheetTitle>
                  <SheetDescription>{user.email}</SheetDescription>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => onEdit(user)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>
            </SheetHeader>

            <Tabs defaultValue="institutional">
              {/* 5 tabs with longer labels overflow the drawer's fixed-width row (clipping the last
                  tab, as flagged) — scroll horizontally instead of wrapping, so the tab row stays a
                  single touch-friendly strip on narrow/mobile viewports. */}
              <ElevatedTabsList className="scrollbar-hide">
                <ElevatedTabsTrigger value="institutional" icon={UserSquare}>
                  Institutional Profile
                </ElevatedTabsTrigger>
                <ElevatedTabsTrigger value="compliance" icon={ShieldCheck}>
                  Compliance &amp; NDA
                </ElevatedTabsTrigger>
                <ElevatedTabsTrigger value="portfolio" icon={Wallet}>
                  Portfolio &amp; Activity
                </ElevatedTabsTrigger>
                <ElevatedTabsTrigger value="interactions" icon={MessageCircle}>
                  Interactions
                </ElevatedTabsTrigger>
                <ElevatedTabsTrigger value="security" icon={Lock}>
                  Security &amp; Governance
                </ElevatedTabsTrigger>
              </ElevatedTabsList>

              <TabsContent value="institutional" className="mt-4">
                <InstitutionalTab
                  user={user}
                  dossier={dossier}
                  isSelf={isSelf}
                  ministries={ministries}
                  onRequestRoleChange={onRequestRoleChange}
                  onUpdateMinistry={onUpdateMinistry}
                />
              </TabsContent>

              <TabsContent value="compliance" className="mt-4">
                <ComplianceTab user={user} dossier={dossier} isLoading={dossierLoading} onRequestRoleChange={onRequestRoleChange} />
              </TabsContent>

              <TabsContent value="portfolio" className="mt-4">
                <PortfolioTab dossier={dossier} isLoading={dossierLoading} audit={audit} auditLoading={auditLoading} />
              </TabsContent>

              <TabsContent value="interactions" className="mt-4">
                <InteractionsTab user={user} isSelf={isSelf} />
              </TabsContent>

              <TabsContent value="security" className="mt-4">
                <SecurityTab user={user} isSelf={isSelf} onRequestStatusChange={onRequestStatusChange} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* --------------------------------------------------------- Institutional Profile ---- */

function InstitutionalTab({
  user,
  dossier,
  isSelf,
  ministries,
  onRequestRoleChange,
  onUpdateMinistry,
}: {
  user: AdminUserRecord;
  dossier: UserDossier | null;
  isSelf: boolean;
  ministries: Ministry[];
  onRequestRoleChange: (user: AdminUserRecord, nextRole: AccountRole) => void;
  onUpdateMinistry: (userId: string, ministryId: string | null) => Promise<void>;
}) {
  const [savingMinistry, setSavingMinistry] = useState(false);

  const handleMinistryChange = async (value: string) => {
    setSavingMinistry(true);
    try {
      await onUpdateMinistry(user.userId, value === "__none__" ? null : value);
    } finally {
      setSavingMinistry(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="dashboard-panel p-3">
        <InfoRow label="Role" value={ROLE_LABELS[user.role]} />
        <InfoRow label="Status" value={STATUS_LABELS[user.accountStatus]} />
        <InfoRow label="Organization" value={user.organization ?? "—"} />
        <InfoRow
          label="Email"
          value={
            <span className="inline-flex items-center gap-1.5 justify-end">
              <span className="truncate">{user.email}</span>
              {dossier && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                  style={{
                    color: dossier.isDomainVerified ? "#4ade80" : "var(--color-text-muted)",
                    backgroundColor: dossier.isDomainVerified ? "rgba(74,222,128,0.12)" : "rgba(148,163,184,0.12)",
                  }}
                  title={dossier.isDomainVerified ? "Corporate email domain" : "Consumer webmail domain"}
                >
                  <BadgeCheck className="h-3 w-3" />
                  {dossier.isDomainVerified ? "Domain Verified" : "Consumer Webmail"}
                </span>
              )}
            </span>
          }
        />
        <InfoRow label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
      </div>

      <div className="dashboard-panel p-3">
        <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>
          Institutional KYC
        </p>
        <InfoRow label="HQ Address" value={dossier?.hqAddress ?? "—"} />
        <InfoRow label="Business Registration ID" value={dossier?.businessRegistrationId ?? "—"} />
        <InfoRow label="Website" value={dossier?.websiteUrl ?? "—"} />
      </div>

      <div className="dashboard-panel p-3">
        <p className="text-[11px] uppercase tracking-wide mb-1 flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
          <UserSquare className="h-3 w-3" /> Executive Representative
        </p>
        <InfoRow label="Name" value={user.name} />
        <InfoRow label="Job Title" value={user.jobTitle ?? "—"} />
        <InfoRow label="Phone" value={user.phone ?? "—"} />
      </div>

      <div className="dashboard-panel p-3">
        <p className="text-[11px] uppercase tracking-wide mb-1 flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
          <History className="h-3 w-3" /> Chain of custody
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {formatChainOfCustody(dossier)}
        </p>
      </div>

      {(user.role === "government" || user.role === "ministry_admin") && (
        <div className="dashboard-panel p-3 space-y-2">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Ministry binding
          </p>
          <select
            className="dashboard-input"
            value={user.ministryId ?? "__none__"}
            onChange={(e) => handleMinistryChange(e.target.value)}
            disabled={savingMinistry}
          >
            <option value="__none__">Unassigned</option>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          Change role
        </p>
        {isSelf ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            You can&apos;t change your own role — ask another platform admin.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ROLE_LABELS) as AccountRole[]).map((role) => (
              <button
                key={role}
                type="button"
                disabled={role === user.role}
                onClick={() => onRequestRoleChange(user, role)}
                className="rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-default"
                style={{
                  borderColor: role === user.role ? "var(--color-gold)" : "var(--color-sovereign-border)",
                  color: role === user.role ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * "Chain of custody" line (Team Ministry Traceability Batch, Phase 7) — renders the immutable
 * `createdByContext` snapshot captured once at account-creation time. Three cases: direct-created
 * by staff, invited by an org/ministry owner (self-service signups later validated separately),
 * and pre-this-column/self-service accounts with nothing to attribute.
 */
function formatChainOfCustody(dossier: UserDossier | null): string {
  if (!dossier) return "Loading…";
  const ctx = dossier.createdByContext;
  if (!ctx) return "No creator on record — likely a self-service signup, or an account created before chain-of-custody tracking began.";

  const roleLabel = ROLE_LABELS[ctx.actorRole] ?? ctx.actorRole;
  const isStaffCreator = ctx.actorRole === "admin" || ctx.actorRole === "super_admin";
  const orgOrMinistry = ctx.ministryName ?? ctx.organization;

  if (isStaffCreator) {
    return `Created directly by ${ctx.actorName} (${roleLabel}).`;
  }
  return `Invited by ${ctx.actorName} (${roleLabel}${orgOrMinistry ? ` · ${orgOrMinistry}` : ""}).`;
}

/* -------------------------------------------------------------- Compliance & NDA ---- */

function ComplianceTab({
  user,
  dossier,
  isLoading,
  onRequestRoleChange,
}: {
  user: AdminUserRecord;
  dossier: UserDossier | null;
  isLoading: boolean;
  onRequestRoleChange: (user: AdminUserRecord, nextRole: AccountRole) => void;
}) {
  const kycChecklist: { label: string; done: boolean }[] = [
    { label: "Organization on file", done: Boolean(user.organization) },
    { label: "HQ address on file", done: Boolean(dossier?.hqAddress) },
    { label: "Business registration ID on file", done: Boolean(dossier?.businessRegistrationId) },
    { label: "Website on file", done: Boolean(dossier?.websiteUrl) },
  ];
  const kycDoneCount = kycChecklist.filter((item) => item.done).length;
  const kycPercent = Math.round((kycDoneCount / kycChecklist.length) * 100);

  return (
    <div className="space-y-4">
      <div className="dashboard-panel p-3">
        <div className="flex items-center gap-2 text-sm text-white mb-1">
          <ShieldCheck className="h-4 w-4" style={{ color: "var(--color-gold)" }} /> NDA Acceptance Record
        </div>
        {isLoading ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Loading…
          </p>
        ) : dossier?.ndaAcceptedAt ? (
          <>
            <InfoRow label="Accepted at" value={new Date(dossier.ndaAcceptedAt).toLocaleString()} />
            <InfoRow label="Agreement version" value={dossier.ndaVersion ?? "—"} />
            <InfoRow label="IP address" value={dossier.ndaAcceptedIp ?? "—"} />
            <InfoRow label="Attested title" value={dossier.ndaAcceptedTitle ?? "—"} />
          </>
        ) : (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            This account has not yet accepted the Sovereign Confidentiality Framework — a real,
            stored acceptance record, not a fabricated certificate.
          </p>
        )}
      </div>

      <div className="dashboard-panel p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            KYC completeness
          </p>
          <span className="text-xs font-semibold" style={{ color: kycPercent === 100 ? "#4ade80" : "var(--color-text-secondary)" }}>
            {kycPercent}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden mb-2" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${kycPercent}%`, backgroundColor: kycPercent === 100 ? "#4ade80" : "var(--color-gold)" }}
          />
        </div>
        {kycChecklist.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm" style={{ color: item.done ? "#4ade80" : "var(--color-text-muted)" }}>
            {item.done ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
            {item.label}
          </div>
        ))}
      </div>

      {user.role === "registered" && (
        <div
          className="rounded-md p-3 flex items-center gap-3"
          style={{ backgroundColor: "rgba(255,211,0,0.08)", border: "1px solid rgba(255,211,0,0.3)" }}
        >
          <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: "var(--color-gold)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium">Elevate to Qualified Investor</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Grants Deal Room and qualified-tier data room access once KYC review is complete.
            </p>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => onRequestRoleChange(user, "qualified")}>
            Elevate
          </Button>
        </div>
      )}

      <AccreditationReview userId={user.userId} />
    </div>
  );
}

/* --------------------------------------------------------- Portfolio & Activity ---- */

function KpiTile({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="dashboard-panel p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function PortfolioTab({
  dossier,
  isLoading,
  audit,
  auditLoading,
}: {
  dossier: UserDossier | null;
  isLoading: boolean;
  audit: AuditLogEntry[];
  auditLoading: boolean;
}) {
  const trackedCapitalMillions = (dossier?.engagements ?? []).reduce((sum, e) => {
    const parsed = parseCapitalTotalMillions(e.ticketSize ?? undefined);
    return parsed ? sum + parsed : sum;
  }, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <KpiTile icon={Handshake} label="Engagements" value={String(dossier?.engagements.length ?? 0)} />
        <KpiTile
          icon={Wallet}
          label="Tracked Capital"
          value={trackedCapitalMillions > 0 ? formatMillions(trackedCapitalMillions) : "—"}
        />
        <KpiTile icon={Eye} label="VDR Previews" value={String(dossier?.documentPreviews.count ?? 0)} />
        <KpiTile icon={ListChecks} label="Audit Events" value={String(audit.length)} />
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
          Engagements ({dossier?.engagements.length ?? 0})
        </p>
        {isLoading ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Loading…
          </p>
        ) : !dossier || dossier.engagements.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            No engagements linked to this account.
          </p>
        ) : (
          <ul className="space-y-2">
            {dossier.engagements.map((e) => (
              <li key={e.id} className="dashboard-panel p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm text-white truncate">{e.projectTitle ?? "Untitled project"}</span>
                  <EngagementStatusPill status={e.status} />
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {e.ticketSize && <span>{e.ticketSize}</span>}
                  {e.mouStatus && (
                    <span className="inline-flex items-center gap-1">
                      <FileSignature className="h-3 w-3" /> MOU: {MOU_STATUS_LABELS[e.mouStatus]}
                    </span>
                  )}
                  {e.followThroughStatus && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
                      style={{ color: FOLLOW_THROUGH_COLOR[e.followThroughStatus], backgroundColor: "rgba(255,255,255,0.06)" }}
                    >
                      {FOLLOW_THROUGH_LABELS[e.followThroughStatus]}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
          Document downloads ({dossier?.documentDownloads.count ?? 0})
        </p>
        {isLoading ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Loading…
          </p>
        ) : !dossier || dossier.documentDownloads.items.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            No downloads recorded yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {dossier.documentDownloads.items.slice(0, 6).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate inline-flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                  <Download className="h-3 w-3 shrink-0" /> {d.documentTitle ?? "Document"}
                </span>
                <span className="shrink-0" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(d.downloadedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
          Account activity
        </p>
        <ActivityFeed entries={audit} isLoading={auditLoading} emptyMessage="No account activity recorded yet." />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Interactions ---- */

/**
 * Direct comms with this account (Deal Room Feedback Batch v2, item 17) — reuses the same General
 * Concierge channel and MessageThread UI as the investor-facing Deal Room, just opened from the
 * staff side with `ownerUserId` pinned to this profile. No separate messaging system: a note left
 * here shows up for the investor in their own Concierge tab, and vice versa.
 */
function InteractionsTab({ user, isSelf }: { user: AdminUserRecord; isSelf: boolean }) {
  if (isSelf) {
    return (
      <div className="dashboard-panel p-6 text-center">
        <MessageCircle className="h-5 w-5 mx-auto mb-2" style={{ color: "var(--color-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          This is your own account — open the Communication Hub to message other users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="dashboard-panel p-3">
        <div className="flex items-center gap-2 text-sm text-white mb-1">
          <MessageCircle className="h-4 w-4" style={{ color: "var(--color-gold)" }} /> General Concierge thread
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Direct, project-less notes with {user.name}. Visible to them under their own Concierge
          channel unless marked Internal.
        </p>
      </div>
      <MessageThread
        concierge={{ ownerUserId: user.userId }}
        isStaff
        emptyMessage={`No messages with ${user.name} yet. Start the conversation below.`}
      />
    </div>
  );
}

/* ---------------------------------------------------------- Security & Governance ---- */

function SecurityTab({
  user,
  isSelf,
  onRequestStatusChange,
}: {
  user: AdminUserRecord;
  isSelf: boolean;
  onRequestStatusChange: (user: AdminUserRecord, action: AccountStatusAction) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="dashboard-panel p-3 space-y-1">
        <div className="flex items-center gap-2 text-sm text-white">
          <ShieldCheck className="h-4 w-4" style={{ color: "var(--color-gold)" }} /> Authentication posture
        </div>
        <InfoRow label="Multi-factor auth" value="Not enforced (platform-wide)" />
        <InfoRow label="Account tier" value={ROLE_LABELS[user.role]} />
      </div>

      <div className="space-y-2">
        {!isSelf && (
          <Button
            size="sm"
            variant={user.accountStatus === "suspended" ? "default" : "destructive"}
            onClick={() => onRequestStatusChange(user, user.accountStatus === "suspended" ? "reactivate" : "suspend")}
          >
            {user.accountStatus === "suspended" ? (
              <>
                <UserCheck className="h-3.5 w-3.5" /> Reactivate account
              </>
            ) : (
              <>
                <UserX className="h-3.5 w-3.5" /> Suspend account
              </>
            )}
          </Button>
        )}
        {/* DeferredAction scaffolds hidden for demo — re-enable when Neon Auth admin flows land. */}
        <UserSessionTelemetry userId={user.userId} />
        {!isSelf && user.accountStatus !== "deactivated" && (
          <div className="pt-2 border-t border-white/10">
            <Button size="sm" variant="destructive" onClick={() => onRequestStatusChange(user, "deactivate")}>
              <UserMinus className="h-3.5 w-3.5" /> Deactivate account (archive)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AccreditationReview({ userId }: { userId: string }) {
  const [rows, setRows] = useState<{ id: string; kind: string; fileName: string; status: string; createdAt: string }[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetch(`/api/accreditation?userId=${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setRows)
      .catch(() => setRows([]));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, decision: "approved" | "declined") => {
    const res = await fetch("/api/accreditation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision, notes: notes[id] }),
    });
    if (res.ok) load();
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
        Accreditation documents
      </p>
      {rows.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          No Commitment Letter or Investment Guarantee Letter uploaded yet.
        </p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="rounded-md p-3" style={{ border: "1px solid var(--color-sovereign-border)" }}>
            <p className="text-sm text-white">
              {row.kind === "commitment_letter" ? "Commitment Letter" : "Investment Guarantee Letter"} · {row.fileName}
            </p>
            <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
              {row.status} · {new Date(row.createdAt).toLocaleString()}
            </p>
            <a href={`/api/accreditation/${row.id}/download`} className="text-xs underline" style={{ color: "var(--color-gold)" }}>
              Open
            </a>
            {row.status === "pending" && (
              <div className="mt-2 space-y-2">
                <input
                  className="dashboard-input text-xs"
                  placeholder="Review note"
                  value={notes[row.id] ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide(row.id, "approved")}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(row.id, "declined")}>Decline</Button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function UserSessionTelemetry({ userId }: { userId: string }) {
  const [rows, setRows] = useState<{ userAgent?: string | null; ipAddress?: string | null; updatedAt?: string | null }[] | null>(null);

  useEffect(() => {
    fetch(`/api/users/${userId}/sessions`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setRows)
      .catch(() => setRows([]));
  }, [userId]);

  return (
    <div className="rounded-md px-3 py-2" style={{ border: "1px solid var(--color-sovereign-border)" }}>
      <div className="flex items-center gap-2 text-sm text-white mb-2">
        <Radar className="h-3.5 w-3.5" /> Active Device & IP Telemetry
      </div>
      {rows === null ? (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loading sessions…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No sessions returned by Neon Auth.</p>
      ) : (
        <ul className="space-y-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {rows.map((s, i) => (
            <li key={`${s.ipAddress ?? "ip"}-${i}`}>
              {s.ipAddress || "IP unavailable"} · {s.userAgent?.slice(0, 80) || "Unknown device"}
              {s.updatedAt ? ` · ${new Date(s.updatedAt).toLocaleString()}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
