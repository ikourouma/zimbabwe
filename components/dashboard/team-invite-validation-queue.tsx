"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronRight, Loader2, ShieldCheck, X } from "lucide-react";
import type { OrgInvite } from "@/lib/types";
import { ROLE_LABELS } from "@/components/dashboard/role-change-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Platform-wide "team invite awaiting validation" queue, mounted on both /admin/users and
 * /super-admin/users (Deal Room Feedback Batch v2, Phase 5) — the Four-Eyes checkpoint an org owner
 * can never bypass on their own invite. Approve either links an existing account (matched by email)
 * or provisions a brand-new one directly, surfacing a one-time temp password in that case (same
 * hand-off convention as the super-admin "Create User" feature). Renders nothing once the queue is
 * empty, so it never permanently occupies space on an otherwise-quiet console.
 *
 * Platform Feedback Batch v3, Phase 2: rows no longer decide from the bare name/email/inviter shown
 * on the collapsed list — clicking a row opens a detail dialog with everything the owner captured
 * (phone/address/justification), the inviting owner's org/ministry, and the role this invitee will
 * be granted on approval. Approve/Reject now live in that dialog, not on the row.
 */
export function TeamInviteValidationQueue() {
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [detailInvite, setDetailInvite] = useState<OrgInvite | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/org-team/pending");
      if (res.ok) setInvites(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const decide = async (invite: OrgInvite, action: "approve" | "reject") => {
    setDecidingId(invite.id);
    try {
      const res = await fetch(`/api/org-team/invites/${invite.id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not record decision");

      if (action === "approve") {
        if (data.accountCreated && data.tempPassword) {
          setLastCreated({ email: invite.inviteEmail, tempPassword: data.tempPassword });
        }
        toast.success(
          data.accountCreated
            ? `${invite.inviteEmail}'s account was created and set to ${invite.resultingRole ? ROLE_LABELS[invite.resultingRole] : "Qualified Investor"}`
            : `${invite.inviteEmail} was linked and set to ${invite.resultingRole ? ROLE_LABELS[invite.resultingRole] : "Qualified Investor"}`
        );
      } else {
        toast.success(`Invite for ${invite.inviteEmail} rejected`);
      }
      setDetailInvite(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record decision");
    } finally {
      setDecidingId(null);
    }
  };

  if (!isLoading && invites.length === 0 && !lastCreated) return null;

  return (
    <section className="dashboard-panel p-5 mb-6">
      <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" style={{ color: "var(--color-gold)" }} />
        Team Invites Awaiting Validation
        {invites.length > 0 && (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: "rgba(251,191,36,0.18)", color: "#fbbf24" }}
          >
            {invites.length}
          </span>
        )}
      </h2>
      <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
        A qualified investor or ministry admin invited each of these named colleagues. Open a row to review the
        full request — who&apos;s inviting, why, and what role they&apos;ll be granted — before deciding.
      </p>

      {lastCreated && (
        <div
          className="mb-4 rounded-lg p-3 flex items-center justify-between gap-3"
          style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}
        >
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            New account for <span className="text-white font-medium">{lastCreated.email}</span> — temp password:{" "}
            <code className="text-white bg-black/30 px-1.5 py-0.5 rounded">{lastCreated.tempPassword}</code> (hand off
            out-of-band; shown once)
          </p>
          <button type="button" onClick={() => setLastCreated(null)} className="p-1 text-white/40 hover:text-white/80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="dashboard-skeleton h-12 rounded-lg" />
      ) : (
        <div className="space-y-2">
          {invites.map((invite) => (
            <button
              key={invite.id}
              type="button"
              onClick={() => setDetailInvite(invite)}
              className="w-full flex items-center justify-between gap-3 rounded-lg p-3 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
            >
              <div className="min-w-0">
                <p className="text-sm text-white truncate">
                  {invite.inviteName} <span style={{ color: "var(--color-text-muted)" }}>· {invite.inviteEmail}</span>
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                  Invited by {invite.ownerName}
                  {invite.ownerOrganization ? ` (${invite.ownerOrganization})` : invite.ownerMinistryName ? ` (${invite.ownerMinistryName})` : ""}
                  {invite.resultingRole ? ` — will become ${ROLE_LABELS[invite.resultingRole]}` : ""}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium shrink-0" style={{ color: "var(--color-gold)" }}>
                Review <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={Boolean(detailInvite)} onOpenChange={(open) => !open && setDetailInvite(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailInvite?.inviteName}</DialogTitle>
            <DialogDescription>
              Invited by {detailInvite?.ownerName}
              {detailInvite?.ownerOrganization
                ? ` (${detailInvite.ownerOrganization})`
                : detailInvite?.ownerMinistryName
                  ? ` (${detailInvite.ownerMinistryName})`
                  : ""}
            </DialogDescription>
          </DialogHeader>

          {detailInvite && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Email</p>
                  <p className="text-white mt-0.5">{detailInvite.inviteEmail}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Phone</p>
                  <p className="text-white mt-0.5">{detailInvite.phone || "Not provided"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Address</p>
                <p className="text-white mt-0.5">{detailInvite.address || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Justification</p>
                <p className="text-white mt-0.5">{detailInvite.justification || "Not provided"}</p>
              </div>
              <div className="rounded-md p-3" style={{ backgroundColor: "rgba(255,211,0,0.08)", border: "1px solid rgba(255,211,0,0.2)" }}>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Will become</p>
                <p className="text-white font-medium mt-0.5">
                  {detailInvite.resultingRole ? ROLE_LABELS[detailInvite.resultingRole] : "Qualified Investor"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => detailInvite && decide(detailInvite, "reject")}
              disabled={decidingId === detailInvite?.id}
            >
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button size="sm" onClick={() => detailInvite && decide(detailInvite, "approve")} disabled={decidingId === detailInvite?.id}>
              {decidingId === detailInvite?.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
