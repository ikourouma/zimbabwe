"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Lock } from "lucide-react";
import type { AccountRole } from "@/lib/auth/types";
import type { AdminUserRecord } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// "Platform Admin" (not "Super Admin") is the single source of truth for this role's display
// label platform-wide — "Super Admin" reads as IT/gaming jargon on an executive-facing surface
// (role badges, report tables, dropdowns); the `super_admin` AccountRole value and the
// `/super-admin/*` routes are unaffected, this only changes what's shown to a human.
export const ROLE_LABELS: Record<AccountRole, string> = {
  registered: "Registered",
  qualified: "Qualified Investor",
  government: "Government",
  ministry_admin: "Ministry Admin",
  admin: "ZIDA Admin",
  super_admin: "Platform Admin",
};

/** Roles that grant elevated platform authority — flagged with a stronger warning in the modal. */
const PRIVILEGED_ROLES: AccountRole[] = ["admin", "super_admin", "government", "ministry_admin"];

interface RoleChangeModalProps {
  user: AdminUserRecord | null;
  nextRole: AccountRole | null;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Zero-trust confirmation gate for changing a user's role. A naked inline Select silently mutating
 * privileged access is exactly the pattern the Super Admin audit called out; this requires an
 * explicit justification (persisted into the audit trail's metadata.reason) and shows a scaffolded
 * — deliberately disabled — step-up MFA affordance pending Neon Auth MFA enablement.
 */
export function RoleChangeModal({ user, nextRole, onConfirm, onCancel }: RoleChangeModalProps) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const open = Boolean(user && nextRole);

  useEffect(() => {
    if (open) {
      setReason("");
      setPending(false);
    }
  }, [open, user?.userId, nextRole]);

  if (!user || !nextRole) return null;

  const isEscalation = PRIVILEGED_ROLES.includes(nextRole) && !PRIVILEGED_ROLES.includes(user.role);

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
            <ShieldAlert className="h-4 w-4" style={{ color: isEscalation ? "#fbbf24" : "var(--color-gold)" }} />
            Confirm role change
          </DialogTitle>
          <DialogDescription>
            {user.name} ({user.email}) will move from{" "}
            <span className="text-white font-medium">{ROLE_LABELS[user.role]}</span> to{" "}
            <span className="text-white font-medium">{ROLE_LABELS[nextRole]}</span>.
          </DialogDescription>
        </DialogHeader>

        {isEscalation && (
          <div
            className="rounded-md p-2.5 text-xs flex items-start gap-2"
            style={{ backgroundColor: "rgba(251, 191, 36, 0.1)", color: "#fbbf24" }}
          >
            <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            This grants elevated platform authority. Confirm the requester and business justification.
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Justification (required — recorded in the audit log)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="dashboard-input"
            placeholder="e.g. Approved investor vetting complete (ticket #1234); authorized by Head of Investment."
            autoFocus
          />
        </div>

        {/* Scaffolded step-up authentication — deliberately disabled until Neon Auth MFA is enabled
            (consistent with the Account & Security MFA deferral), so we never fake a security step. */}
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
          <Button size="sm" onClick={handleConfirm} disabled={pending || !reason.trim()}>
            {pending ? "Applying…" : "Confirm change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
