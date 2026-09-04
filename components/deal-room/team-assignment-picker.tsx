"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Users, X } from "lucide-react";
import type { OrgInvite, ProjectTeamMember } from "@/lib/types";

/**
 * Per-proposal "Team" roster (Deal Room Feedback Batch v2, Phase 5, item 8). Only the proposal's
 * own owner can add/remove assignees — see the ownership gate in
 * app/api/projects/[id]/team/route.ts — and only from among their own already-validated
 * (`active`) org invites, never anyone else's. A read-only variant renders for an assigned
 * teammate viewing the same proposal, so they can see who else has access without being able to
 * change it.
 */
export function TeamAssignmentPicker({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const [team, setTeam] = useState<ProjectTeamMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [teamRes, invitesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/team`),
        isOwner ? fetch("/api/org-team/invites") : Promise.resolve(null),
      ]);
      if (teamRes.ok) setTeam(await teamRes.json());
      if (invitesRes?.ok) setInvites(await invitesRes.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const assign = async (userId: string) => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not assign");
      toast.success("Team member assigned to this proposal");
      setPickerOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign team member");
    } finally {
      setAssigning(false);
    }
  };

  const remove = async (userId: string) => {
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/projects/${projectId}/team`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Removed from this proposal");
      await load();
    } catch {
      toast.error("Could not remove team member");
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) return <div className="dashboard-skeleton h-16 rounded-lg" />;

  const assignedIds = new Set(team.map((t) => t.userId));
  const availableInvites = invites.filter((i) => i.status === "active" && i.invitedUserId && !assignedIds.has(i.invitedUserId));

  if (!isOwner && team.length === 0) return null;

  return (
    <section className="dashboard-panel p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Users className="h-4 w-4" /> Team
        </h2>
        {isOwner && (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            disabled={availableInvites.length === 0}
            title={availableInvites.length === 0 ? "Validate a team member on My Profile first" : undefined}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Assign teammate
          </button>
        )}
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
        {isOwner
          ? "Give a validated teammate full co-editor access to this specific proposal."
          : "Teammates with co-editor access to this proposal."}
      </p>

      {pickerOpen && (
        <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] p-2 space-y-1">
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

      {team.length === 0 ? (
        <p className="text-xs py-2" style={{ color: "var(--color-text-muted)" }}>
          No teammates assigned yet.
        </p>
      ) : (
        <div className="space-y-2">
          {team.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-3 rounded-lg p-2.5 border border-white/10 bg-white/[0.02]"
            >
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{member.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                  {member.email}
                </p>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => remove(member.userId)}
                  disabled={removingId === member.userId}
                  title="Remove from this proposal"
                  className="p-1 rounded text-white/40 hover:text-white/80 disabled:opacity-40 shrink-0"
                >
                  {removingId === member.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
