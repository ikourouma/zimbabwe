"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Loader2,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgInvite, TeamAssignmentSummary } from "@/lib/types";
import { executiveFieldClassName, executiveFieldStyle, executiveLabelClassName } from "@/components/auth/executive-field-styles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TeamAssignModal } from "@/components/account/team-assign-modal";

/**
 * Row status shown on the roster — a superset of `OrgInvite["status"]` that also surfaces
 * `suspended` as its own visual state (Phase 3, B2) even though it's backed by
 * `invitedUserAccountStatus`, not the invite's own `status` column (which stays `"active"` while
 * suspended — see `suspendTeamMember` in lib/db/queries/org-team.ts).
 */
type RosterStatus = OrgInvite["status"] | "suspended";

const STATUS_META: Record<RosterStatus, { label: string; color: string; bg: string }> = {
  pending_validation: { label: "Pending ZIDA Review", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  active: { label: "Active", color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
  suspended: { label: "Suspended", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  revoked: { label: "Archived", color: "var(--color-text-muted)", bg: "rgba(255,255,255,0.05)" },
};

function rosterStatus(invite: OrgInvite): RosterStatus {
  return invite.status === "active" && invite.invitedUserAccountStatus === "suspended" ? "suspended" : invite.status;
}

const STATUS_FILTER_CHIPS: { value: RosterStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending_validation", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "revoked", label: "Archived" },
];

type InviteRow = { name: string; email: string; phone: string };
const emptyRow = (): InviteRow => ({ name: "", email: "", phone: "" });

/**
 * Dedicated Team roster page — /deal-room/teams (qualified investors) and /ministry/teams
 * (ministry_admin), same component, same API (Team Ministry Traceability Batch, Phase 4). Replaces
 * the old My Profile-embedded "My Team" panel with: (a) a bulk multi-row invite form (item 4 — no
 * longer one-at-a-time), and (b) a roster that shows what each *active* teammate is currently
 * assigned to — both proposal co-editor grants and, since Phase 5, engagement Delegate grants
 * (item 3's "what's the flow once a team member exists" — the answer starts here).
 *
 * `entityLabel` is the noun used in copy ("organization" for qualified, "ministry" for
 * ministry_admin) — the underlying invite/approval pipeline is identical (see
 * app/api/org-team/invites/route.ts and approveOrgInvite's role-mirroring), only the wording
 * differs between the two consoles.
 */
export function TeamRosterView({ entityLabel }: { entityLabel: string }) {
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [assignments, setAssignments] = useState<Record<string, TeamAssignmentSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<InviteRow[]>([emptyRow()]);
  // Batch-level context (Platform Feedback Batch v3, Phase 2) — applied identically to every row in
  // this submission. Address/justification tend to be shared across one invite batch (same
  // organization/ministry office, same onboarding reason), so this avoids repeating them per row;
  // phone stays per-row since each invitee has their own number.
  const [address, setAddress] = useState("");
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // Safe reassignment handoff (Phase 8, item 3) — revoking an active teammate's access needs a
  // confirmation step when they still hold work, since it silently falls everything back to the
  // owner rather than leaving a dangling co-editor/Delegate reference.
  const [revokeTarget, setRevokeTarget] = useState<OrgInvite | null>(null);
  const [revoking, setRevoking] = useState(false);
  // Roster search + status filter (Phase 3, B1) — mirrors the ProjectFiltersBar/status-chip pattern
  // used across the pipeline/saved/proposals registries for platform-wide consistency.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RosterStatus | "all">("all");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  // In-place Assign (Phase 3, B3) — replaces the old "go to that record's own page" flow.
  const [assignTarget, setAssignTarget] = useState<OrgInvite | null>(null);

  const load = async () => {
    try {
      const [invitesRes, assignmentsRes] = await Promise.all([
        fetch("/api/org-team/invites"),
        fetch("/api/org-team/assignments"),
      ]);
      if (invitesRes.ok) setInvites(await invitesRes.json());
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateRow = (idx: number, field: keyof InviteRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (idx: number) => setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const submitInvites = async () => {
    const nonEmpty = rows.filter((r) => r.name.trim() || r.email.trim());
    if (nonEmpty.length === 0) {
      toast.error("Add at least one name and email");
      return;
    }
    const incomplete = nonEmpty.filter((r) => !r.name.trim() || !r.email.trim());
    if (incomplete.length > 0) {
      toast.error("Every row needs both a name and an email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/org-team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invites: nonEmpty.map((r) => ({
            inviteName: r.name.trim(),
            inviteEmail: r.email.trim(),
            phone: r.phone.trim() || undefined,
            address: address.trim() || undefined,
            justification: justification.trim() || undefined,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { results?: { ok: boolean; inviteEmail: string; error?: string }[]; error?: string };
      if (!res.ok || !data.results) throw new Error(data.error ?? "Could not send invites");

      const succeeded = data.results.filter((r) => r.ok);
      const failed = data.results.filter((r) => !r.ok);
      if (succeeded.length > 0) {
        toast.success(
          succeeded.length === 1
            ? `Invite sent to ${succeeded[0].inviteEmail} — awaiting ZIDA validation`
            : `${succeeded.length} invites sent — awaiting ZIDA validation`
        );
      }
      for (const f of failed) {
        toast.error(`${f.inviteEmail || "One row"}: ${f.error ?? "Could not send invite"}`);
      }
      if (succeeded.length > 0) {
        setRows([emptyRow()]);
        setAddress("");
        setJustification("");
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invites");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelInvite = async (id: string) => {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/org-team/invites/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Invite cancelled");
      await load();
    } catch {
      toast.error("Could not cancel invite");
    } finally {
      setCancellingId(null);
    }
  };

  const revokeTargetWork = revokeTarget?.invitedUserId ? assignments[revokeTarget.invitedUserId] : undefined;
  const revokeTargetAffectedCount = (revokeTargetWork?.proposals.length ?? 0) + (revokeTargetWork?.engagements.length ?? 0);

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/org-team/invites/${revokeTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fallbackToOwner: revokeTargetAffectedCount > 0 }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not revoke access");
      }
      toast.success(`${revokeTarget.inviteName} has been archived`);
      setRevokeTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke access");
    } finally {
      setRevoking(false);
    }
  };

  const setStatusAction = async (invite: OrgInvite, action: "suspend" | "reinstate") => {
    setPendingActionId(invite.id);
    try {
      const res = await fetch(`/api/org-team/invites/${invite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Could not ${action} this teammate`);
      }
      toast.success(
        action === "suspend"
          ? `${invite.inviteName}'s access has been suspended`
          : `${invite.inviteName} has been reinstated`
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not ${action} this teammate`);
    } finally {
      setPendingActionId(null);
    }
  };

  const activeCount = invites.filter((i) => rosterStatus(i) === "active").length;
  const pendingCount = invites.filter((i) => i.status === "pending_validation").length;

  const filteredInvites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invites.filter((invite) => {
      if (statusFilter !== "all" && rosterStatus(invite) !== statusFilter) return false;
      if (!q) return true;
      return invite.inviteName.toLowerCase().includes(q) || invite.inviteEmail.toLowerCase().includes(q);
    });
  }, [invites, search, statusFilter]);

  const countFor = (value: RosterStatus | "all") =>
    value === "all" ? invites.length : invites.filter((i) => rosterStatus(i) === value).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Team</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Invite named colleagues into your {entityLabel}. Every invite is reviewed by ZIDA before it goes live
          (Four-Eyes control) — once active, use Assign right here on their roster row to put them on a specific
          proposal or engagement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="dashboard-panel p-4">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Active</p>
          <p className="text-2xl font-semibold text-white mt-1">{isLoading ? "—" : activeCount}</p>
        </div>
        <div className="dashboard-panel p-4">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Pending ZIDA Review</p>
          <p className="text-2xl font-semibold text-white mt-1">{isLoading ? "—" : pendingCount}</p>
        </div>
        <div className="dashboard-panel p-4">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Total invited</p>
          <p className="text-2xl font-semibold text-white mt-1">{isLoading ? "—" : invites.length}</p>
        </div>
      </div>

      <section className="dashboard-panel p-5 mb-6">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
          <UserPlus className="h-4 w-4" /> Invite team members
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          Add as many colleagues as you need in one batch — each goes through the same ZIDA validation step
          independently.
        </p>

        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
              <div>
                {idx === 0 && (
                  <label className={executiveLabelClassName} style={{ color: "var(--color-text-muted)" }}>
                    Full name
                  </label>
                )}
                <input
                  value={row.name}
                  onChange={(e) => updateRow(idx, "name", e.target.value)}
                  placeholder="Jane Moyo"
                  className={executiveFieldClassName}
                  style={executiveFieldStyle(!!row.name)}
                />
              </div>
              <div>
                {idx === 0 && (
                  <label className={executiveLabelClassName} style={{ color: "var(--color-text-muted)" }}>
                    Email
                  </label>
                )}
                <input
                  value={row.email}
                  onChange={(e) => updateRow(idx, "email", e.target.value)}
                  placeholder="jane@company.com"
                  className={executiveFieldClassName}
                  style={executiveFieldStyle(!!row.email)}
                />
              </div>
              <div>
                {idx === 0 && (
                  <label className={executiveLabelClassName} style={{ color: "var(--color-text-muted)" }}>
                    Phone (optional)
                  </label>
                )}
                <input
                  value={row.phone}
                  onChange={(e) => updateRow(idx, "phone", e.target.value)}
                  placeholder="+263…"
                  className={executiveFieldClassName}
                  style={executiveFieldStyle(!!row.phone)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                disabled={rows.length === 1}
                title="Remove row"
                className="p-2 rounded text-white/40 hover:text-white/80 disabled:opacity-30 disabled:hover:text-white/40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          <div>
            <label className={executiveLabelClassName} style={{ color: "var(--color-text-muted)" }}>
              Office address (optional, applies to this batch)
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Harare HQ, 5th Floor"
              className={executiveFieldClassName}
              style={executiveFieldStyle(!!address)}
            />
          </div>
          <div>
            <label className={executiveLabelClassName} style={{ color: "var(--color-text-muted)" }}>
              Reason for these invites (optional, applies to this batch)
            </label>
            <input
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g. New portfolio analysts joining the deal team"
              className={executiveFieldClassName}
              style={executiveFieldStyle(!!justification)}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add another
          </button>
          <button
            type="button"
            onClick={submitInvites}
            disabled={submitting}
            className="px-4 py-2 rounded text-xs font-semibold bg-[#FFD300] text-black hover:brightness-95 disabled:opacity-40 transition inline-flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send {rows.filter((r) => r.name.trim() || r.email.trim()).length > 1 ? "invites" : "invite"}
          </button>
        </div>
      </section>

      <section className="dashboard-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="h-4 w-4" /> Roster
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {!isLoading && invites.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {STATUS_FILTER_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatusFilter(chip.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  statusFilter === chip.value
                    ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)] border-[var(--color-gold)]/40"
                    : "text-[var(--color-text-muted)] border-[var(--color-sovereign-border)] hover:bg-white/5 hover:text-white"
                )}
              >
                {chip.label} ({countFor(chip.value)})
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="dashboard-skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : invites.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--color-text-muted)" }}>
            No team members invited yet.
          </p>
        ) : filteredInvites.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--color-text-muted)" }}>
            No team members match this search or filter.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredInvites.map((invite) => {
              const rStatus = rosterStatus(invite);
              const meta = STATUS_META[rStatus];
              const work = invite.invitedUserId ? assignments[invite.invitedUserId] : undefined;
              const busy = pendingActionId === invite.id;
              return (
                <div key={invite.id} className="rounded-lg p-3 border border-white/10 bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{invite.inviteName}</p>
                      <p className="text-xs mt-0.5 flex items-center gap-1 truncate" style={{ color: "var(--color-text-muted)" }}>
                        <Mail className="h-3 w-3 shrink-0" /> {invite.inviteEmail}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ color: meta.color, backgroundColor: meta.bg }}
                      >
                        {meta.label}
                      </span>
                      {invite.status === "pending_validation" && (
                        <button
                          type="button"
                          onClick={() => cancelInvite(invite.id)}
                          disabled={cancellingId === invite.id}
                          title="Cancel invite"
                          className="p-1 rounded text-white/40 hover:text-white/80 disabled:opacity-40"
                        >
                          {cancellingId === invite.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {rStatus === "active" && (
                        <button
                          type="button"
                          onClick={() => setStatusAction(invite, "suspend")}
                          disabled={busy}
                          title="Suspend access (temporary, reversible)"
                          className="p-1 rounded text-white/40 hover:text-orange-400 disabled:opacity-40"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {(rStatus === "suspended" || rStatus === "revoked") && (
                        <button
                          type="button"
                          onClick={() => setStatusAction(invite, "reinstate")}
                          disabled={busy}
                          title="Reinstate access"
                          className="p-1 rounded text-white/40 hover:text-emerald-400 disabled:opacity-40"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {(rStatus === "active" || rStatus === "suspended") && (
                        <button
                          type="button"
                          onClick={() => setRevokeTarget(invite)}
                          title="Archive (revoke access)"
                          className="p-1 rounded text-white/40 hover:text-red-400 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {invite.status === "active" && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5">
                      {work && (work.proposals.length > 0 || work.engagements.length > 0) ? (
                        <>
                          {work.proposals.map((p) => (
                            <span
                              key={`p-${p.id}`}
                              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px]"
                              style={{ color: "var(--color-text-secondary)", backgroundColor: "rgba(255,255,255,0.04)" }}
                            >
                              <ShieldCheck className="h-3 w-3" /> {p.title}
                            </span>
                          ))}
                          {work.engagements.map((e) => (
                            <span
                              key={`e-${e.id}`}
                              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px]"
                              style={{ color: "var(--color-text-secondary)", backgroundColor: "rgba(255,255,255,0.04)" }}
                            >
                              <ShieldCheck className="h-3 w-3" /> {e.title}
                            </span>
                          ))}
                        </>
                      ) : (
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          Not yet assigned to any proposal or engagement.
                        </p>
                      )}
                      {rStatus === "active" && (
                        <button
                          type="button"
                          onClick={() => setAssignTarget(invite)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors ml-auto"
                        >
                          <Briefcase className="h-3 w-3" /> Assign
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {revokeTarget?.inviteName}&apos;s access?</DialogTitle>
            <DialogDescription>
              {revokeTargetAffectedCount > 0 ? (
                <>
                  This teammate still holds {revokeTargetAffectedCount} active assignment{revokeTargetAffectedCount === 1 ? "" : "s"}:
                  {revokeTargetWork && revokeTargetWork.proposals.length > 0 && (
                    <span className="block mt-2 text-white">
                      Proposals: {revokeTargetWork.proposals.map((p) => p.title).join(", ")}
                    </span>
                  )}
                  {revokeTargetWork && revokeTargetWork.engagements.length > 0 && (
                    <span className="block mt-1 text-white">
                      Engagements: {revokeTargetWork.engagements.map((e) => e.title).join(", ")}
                    </span>
                  )}
                  <span className="block mt-2">
                    Archiving will fall all of these back to you directly. To reassign to someone else instead, cancel
                    here and reassign each one individually from its own page first. If you just need to temporarily
                    block their access without losing any of this, use Suspend instead.
                  </span>
                </>
              ) : (
                "They currently hold no active proposal or engagement assignments. This immediately ends their access — you can bring them back later with Reinstate."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white" onClick={confirmRevoke} disabled={revoking}>
              {revoking ? "Archiving…" : revokeTargetAffectedCount > 0 ? "Archive & fall back to me" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TeamAssignModal
        invite={assignTarget}
        open={Boolean(assignTarget)}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        onChanged={load}
      />
    </div>
  );
}
