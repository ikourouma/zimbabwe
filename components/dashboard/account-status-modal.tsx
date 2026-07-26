"use client";

import { useEffect, useState } from "react";
import { Lock, ShieldAlert, UserCheck, UserMinus, UserX } from "lucide-react";
import type { AdminUserRecord } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** The three account-status mutations this modal can confirm — a single shared "Four-Eyes"
 *  governance gate (mandatory, audit-logged justification) instead of three separate,
 *  inconsistently-guarded affordances (previously: Suspend/Reactivate fired instantly with a
 *  canned reason, only Deactivate confirmed at all — and even then without capturing why). */
export type AccountStatusAction = "suspend" | "reactivate" | "deactivate";

const ACTION_COPY: Record<
  AccountStatusAction,
  { title: string; verb: string; icon: typeof UserX; tone: "warning" | "default" | "destructive"; body: string }
> = {
  suspend: {
    title: "Suspend account",
    verb: "Suspend",
    icon: UserX,
    tone: "warning",
    body: "The account is immediately blocked from signing in. This is reversible by reactivating the account later.",
  },
  reactivate: {
    title: "Reactivate account",
    verb: "Reactivate",
    icon: UserCheck,
    tone: "default",
    body: "The account regains sign-in access immediately.",
  },
  deactivate: {
    title: "Deactivate account (archive)",
    verb: "Deactivate",
    icon: UserMinus,
    tone: "destructive",
    body: "The account is archived and can no longer sign in. This is reversible by reactivating the account later.",
  },
};

interface AccountStatusModalProps {
  user: AdminUserRecord | null;
  action: AccountStatusAction | null;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Four-Eyes governance gate for every account-status mutation (Suspend / Reactivate / Deactivate).
 * Every status change now requires an explicit, non-empty justification persisted into the
 * unalterable audit trail (metadata.reason) — same pattern as RoleChangeModal, so a privileged
 * status change is never a single reason-less click. Owns its own pending state, mirroring
 * RoleChangeModal, so callers never need a locally-managed busy spinner.
 */
export function AccountStatusModal({ user, action, onConfirm, onCancel }: AccountStatusModalProps) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const open = Boolean(user && action);

  useEffect(() => {
    if (open) {
      setReason("");
      setPending(false);
    }
  }, [open, user?.userId, action]);

  if (!user || !action) return null;

  const copy = ACTION_COPY[action];
  const Icon = copy.icon;

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setPending(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" style={{ color: copy.tone === "default" ? "var(--color-gold)" : "#fbbf24" }} />
            {copy.title}
          </DialogTitle>
          <DialogDescription>
            {copy.body} This action is recorded in the audit log for {user.name} ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Justification (required — recorded in the audit log)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="dashboard-input"
            placeholder="e.g. Suspicious login pattern flagged by security review; authorized by Head of Compliance."
            autoFocus
          />
        </div>

        {/* Scaffolded step-up authentication — deliberately disabled until Neon Auth MFA is enabled
            (consistent with RoleChangeModal's own deferral), so we never fake a security step. */}
        <div
          className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs opacity-60"
          style={{ border: "1px dashed var(--color-sovereign-border)", color: "var(--color-text-muted)" }}
        >
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Step-up MFA re-authentication — available once platform MFA is enabled.
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={copy.tone === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending || !reason.trim()}
          >
            <Icon className="h-3.5 w-3.5" /> {pending ? `${copy.verb}ing…` : copy.verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
