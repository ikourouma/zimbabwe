"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useProjectStore } from "@/context/project-store-context";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OrgInvite } from "@/lib/types";

/**
 * In-place "Assign" action from the Team roster row (Reconcile plan + Phase 3, item B3) — lets the
 * org owner/ministry_admin put a validated teammate onto one of their own proposals (multi-assignee
 * co-editor grant, `POST /api/projects/[id]/team`) or engagements (single-Delegate,
 * `POST /api/engagements/[id]/assign`) without leaving the Team page and hunting down that
 * record's own detail view first. Reuses both existing endpoints exactly as-is — same ownership
 * ceiling (the caller must be that project/engagement's own owner, enforced server-side), same
 * validated-active-teammate requirement.
 */
export function TeamAssignModal({
  invite,
  open,
  onOpenChange,
  onChanged,
}: {
  invite: OrgInvite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const { userId } = useAuth();
  const { projects } = useProjectStore();
  const { engagements } = useDealRoomStore();
  const [busyId, setBusyId] = useState<string | null>(null);

  const targetUserId = invite?.invitedUserId ?? null;

  const myProjects = useMemo(
    () => (userId ? projects.filter((p) => p.createdBy === userId) : []),
    [projects, userId]
  );
  const myEngagements = useMemo(
    () => (userId ? engagements.filter((e) => e.userId === userId && !e.deletedAt) : []),
    [engagements, userId]
  );

  const toggleProject = async (projectId: string, isAssigned: boolean) => {
    if (!targetUserId) return;
    setBusyId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}/team`, {
        method: isAssigned ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not update assignment");
      toast.success(isAssigned ? "Removed from this proposal" : "Assigned to this proposal");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update assignment");
    } finally {
      setBusyId(null);
    }
  };

  const assignEngagement = async (engagementId: string) => {
    if (!targetUserId) return;
    setBusyId(engagementId);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not assign delegate");
      toast.success("Assigned as Delegate on this engagement");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign delegate");
    } finally {
      setBusyId(null);
    }
  };

  const unassignEngagement = async (engagementId: string) => {
    setBusyId(engagementId);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/assign`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not remove delegate");
      toast.success("Delegate removed");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove delegate");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign {invite?.inviteName}</DialogTitle>
          <DialogDescription>
            Give this teammate co-editor access to one of your proposals, or Delegate authority on one of your
            engagements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-white/80 mb-2">Projects</p>
            {myProjects.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                You have no projects or proposals yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {myProjects.map((p) => {
                  const isAssigned = targetUserId ? (p.teamAssignedUserIds ?? []).includes(targetUserId) : false;
                  const busy = busyId === p.id;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5"
                    >
                      <span className="text-sm text-white truncate">{p.title}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleProject(p.id, isAssigned)}
                        className={cn(
                          "text-xs font-medium px-2.5 py-1 rounded border transition-colors shrink-0 disabled:opacity-40 inline-flex items-center gap-1",
                          isAssigned
                            ? "border-red-400/30 text-red-400 hover:bg-red-400/10"
                            : "border-white/10 text-white/80 hover:bg-white/10"
                        )}
                      >
                        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                        {isAssigned ? "Remove" : "Assign"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-white/80 mb-2">Engagements</p>
            {myEngagements.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                You have no engagements yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {myEngagements.map((e) => {
                  const project = projects.find((p) => p.id === e.projectId);
                  const isThisDelegate = Boolean(targetUserId) && e.assignedUserId === targetUserId;
                  const isDelegatedToOther = Boolean(e.assignedUserId) && !isThisDelegate;
                  const busy = busyId === e.id;
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5"
                    >
                      <span className="text-sm text-white truncate">{project?.title ?? e.investorName}</span>
                      {isDelegatedToOther ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => unassignEngagement(e.id)}
                          title="Already delegated to someone else — unassign first"
                          className="text-xs font-medium px-2.5 py-1 rounded border border-white/10 text-white/50 hover:bg-white/10 shrink-0 disabled:opacity-40 inline-flex items-center gap-1"
                        >
                          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                          Unassign current
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => (isThisDelegate ? unassignEngagement(e.id) : assignEngagement(e.id))}
                          className={cn(
                            "text-xs font-medium px-2.5 py-1 rounded border transition-colors shrink-0 disabled:opacity-40 inline-flex items-center gap-1",
                            isThisDelegate
                              ? "border-red-400/30 text-red-400 hover:bg-red-400/10"
                              : "border-white/10 text-white/80 hover:bg-white/10"
                          )}
                        >
                          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                          {isThisDelegate ? "Remove" : "Assign"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
