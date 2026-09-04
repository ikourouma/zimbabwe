"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Handshake, Loader2, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import type { InvestmentProject, MessageActionPayload, ProjectMessage } from "@/lib/types";

interface RequestAssociationButtonProps {
  project: InvestmentProject;
  /** The viewer's own ministryId (ministry_admin or government) — never the project's. */
  actorMinistryId: string;
}

/**
 * "Request Association" (Platform Feedback Batch v4, Phase 6) — lets a `ministry_admin` or
 * `government` viewer whose own ministry is a stranger to this project ask for it to be added as
 * a secondary beneficiary. Files a `ministry_association_request` Action Card via
 * POST /api/projects/[id]/association-request; never mutates the live project directly — that
 * only happens once admin/super_admin Approve the card (see POST /api/messages/[id]/action).
 * Mirrors RequestAmendmentForm's "check for an already-pending card" pattern.
 */
export function RequestAssociationButton({ project, actorMinistryId }: RequestAssociationButtonProps) {
  const [checking, setChecking] = useState(true);
  // Tracks the *latest* card this ministry has filed on this project — lets the button surface a
  // resolved/declined outcome too, not just "pending", since the filer may never be able to view
  // this project's Messages tab directly to see the staff reply (a ministry_admin's own-ministry
  // read gate on GET /api/projects/[id]/messages is intentionally narrower than this dedicated
  // check — see POST /api/projects/[id]/association-request's rationale comment).
  const [latest, setLatest] = useState<MessageActionPayload | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshLatest = () => {
    let mounted = true;
    fetch(`/api/projects/${project.id}/association-request`)
      .then((res) => (res.ok ? res.json() : []))
      .then((cards: ProjectMessage[]) => {
        if (!mounted) return;
        const mine = cards
          .map((c) => c.payload as MessageActionPayload | undefined)
          .filter((p): p is MessageActionPayload => Boolean(p && p.requestingMinistryId === actorMinistryId));
        setLatest(mine.length ? mine[mine.length - 1] : null);
      })
      .catch(() => {})
      .finally(() => mounted && setChecking(false));
    return () => {
      mounted = false;
    };
  };

  useEffect(() => refreshLatest(), [project.id, actorMinistryId]);

  // Already a beneficiary (primary or secondary) — nothing to request.
  if (projectMatchesMinistry(project, actorMinistryId)) return null;
  if (checking) return null;

  if (latest?.status === "open") {
    return (
      <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
        <Handshake className="h-3 w-3 mr-1 inline" /> Association request pending ZIDA review
      </p>
    );
  }
  if (latest?.status === "resolved") {
    return (
      <p className="text-xs italic" style={{ color: "#4ade80" }}>
        <Handshake className="h-3 w-3 mr-1 inline" /> Association request approved — your ministry is now a
        secondary beneficiary
      </p>
    );
  }

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please explain why your ministry should be associated with this project.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/association-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not file the association request.");
        return;
      }
      refreshLatest();
      setOpen(false);
      setReason("");
      toast.success("Association request submitted to ZIDA for review.");
    } catch {
      toast.error("A network error occurred — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {latest?.status === "declined" && (
        <p className="text-xs italic mb-1" style={{ color: "var(--color-text-muted)" }}>
          A previous association request was declined — you may file a new one below.
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs underline"
        style={{ color: "var(--color-gold)" }}
      >
        <Handshake className="h-3.5 w-3.5" /> Request Association for my Ministry
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Association</DialogTitle>
            <DialogDescription>
              Ask ZIDA to add your ministry as a secondary beneficiary on <strong>{project.title}</strong>. An
              admin/super_admin will review and decide.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Reason *
            </label>
            <textarea
              className="dashboard-input min-h-[88px] w-full"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. This project also delivers outcomes within our ministry's mandate"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
