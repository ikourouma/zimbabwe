"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, UserCog, X } from "lucide-react";
import type { OrgInvite } from "@/lib/types";

/**
 * Engagement Delegate picker (Team Ministry Traceability Batch, Phase 5, item 5) — owner-only,
 * same UX pattern as the proposal `TeamAssignmentPicker`, but single-assignee (an engagement has
 * at most one Delegate at a time, unlike a proposal's multi-person co-editor roster). Delegate
 * model: assigning never removes the owner's own authority — both the owner and the Delegate can
 * fully drive this engagement's remaining stages with ZIDA (see the widened PATCH ownership gate
 * in app/api/engagements/[id]/route.ts).
 *
 * Staff (admin/super_admin) can also assign/clear a Delegate on the investor's behalf while the
 * engagement is still `draft` (see app/api/engagements/[id]/assign/route.ts) — that support-case
 * path is API-only for now; this picker only renders for the engagement's own owner.
 */
export function EngagementDelegatePicker({
  engagementId,
  assignedUserId,
  isOwner,
}: {
  engagementId: string;
  assignedUserId?: string | null;
  isOwner: boolean;
}) {
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const load = async () => {
    try {
      if (isOwner) {
        const res = await fetch("/api/org-team/invites");
        if (res.ok) setInvites(await res.json());
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId, isOwner]);

  const assign = async (userId: string) => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not assign delegate");
      toast.success("Delegate assigned — they now have full authority on this engagement alongside you");
      setPickerOpen(false);
      window.dispatchEvent(new CustomEvent("zim:engagement-updated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign delegate");
    } finally {
      setAssigning(false);
    }
  };

  const unassign = async () => {
    setRemoving(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/assign`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Delegate removed");
      window.dispatchEvent(new CustomEvent("zim:engagement-updated"));
    } catch {
      toast.error("Could not remove delegate");
    } finally {
      setRemoving(false);
    }
  };

  if (!isOwner) return null;
  if (isLoading) return <div className="dashboard-skeleton h-10 rounded-lg" />;

  const activeInvites = invites.filter((i) => i.status === "active" && i.invitedUserId);
  const currentDelegate = activeInvites.find((i) => i.invitedUserId === assignedUserId);
  const availableInvites = activeInvites.filter((i) => i.invitedUserId !== assignedUserId);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-white flex items-center gap-1.5">
          <UserCog className="h-3.5 w-3.5" /> Delegate
        </p>
        {!assignedUserId && (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            disabled={availableInvites.length === 0}
            title={availableInvites.length === 0 ? "Validate a team member on the Team page first" : undefined}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            <Plus className="h-3 w-3" /> Assign
          </button>
        )}
      </div>

      {assignedUserId ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
            style={{ backgroundColor: "rgba(255,211,0,0.1)", color: "var(--color-gold)" }}
          >
            {currentDelegate?.inviteName ?? "Assigned teammate"}
          </span>
          <button
            type="button"
            onClick={unassign}
            disabled={removing}
            title="Remove delegate"
            className="p-1 rounded text-white/40 hover:text-white/80 disabled:opacity-40"
          >
            {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </button>
        </div>
      ) : (
        <p className="mt-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          No delegate assigned — you&apos;re the only one driving this engagement.
        </p>
      )}

      {pickerOpen && !assignedUserId && (
        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 space-y-1">
          {availableInvites.map((invite) => (
            <button
              key={invite.id}
              type="button"
              disabled={assigning}
              onClick={() => invite.invitedUserId && assign(invite.invitedUserId)}
              className="w-full flex items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-sm text-white/90 hover:bg-white/10 disabled:opacity-40"
            >
              <span className="truncate">
                {invite.inviteName} <span style={{ color: "var(--color-text-muted)" }}>· {invite.inviteEmail}</span>
              </span>
              {assigning && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
