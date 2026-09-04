"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Info, Lock } from "lucide-react";
import type { AccountRole } from "@/lib/auth/types";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/components/dashboard/role-change-modal";

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
  /** Roles the current actor may assign (server re-enforces the ceiling). Defaults to all. */
  assignableRoles?: AccountRole[];
}

const ALL_ROLES = Object.keys(ROLE_LABELS) as AccountRole[];

/**
 * Invite User. Files a tracked, audited invitation (POST /api/users/invite) and sends a Resend
 * email when configured. Temp-password + enforce-MFA remain disabled "coming soon" toggles.
 */
export function InviteUserModal({ open, onOpenChange, onInvited, assignableRoles }: InviteUserModalProps) {
  const { ministries } = useTaxonomyStore();
  const roles = assignableRoles && assignableRoles.length > 0 ? assignableRoles : ALL_ROLES;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccountRole>(roles[0] ?? "registered");
  const [note, setNote] = useState("");
  const [organization, setOrganization] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const [firmType, setFirmType] = useState("");
  const [mandate, setMandate] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setNote("");
      setRole(roles[0] ?? "registered");
      setOrganization("");
      setJobTitle("");
      setPhone("");
      setMinistryId("");
      setFirmType("");
      setMandate("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (!email.trim().includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role,
          note: note.trim() || undefined,
          organization: organization.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          phone: phone.trim() || undefined,
          ministryId: role === "government" || role === "ministry_admin" ? ministryId || undefined : undefined,
          firmType: role === "qualified" ? firmType.trim() || undefined : undefined,
          mandate: role === "qualified" ? mandate.trim() || undefined : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not send the invitation.");
      }
      const data = (await res.json().catch(() => ({}))) as { emailDelivery?: string };
      toast.success(
        data.emailDelivery === "sent"
          ? "Invitation sent. The recipient can create their account from the email."
          : "Invitation recorded. Email is not configured here — follow up with the recipient directly."
      );
      onInvited?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the invitation.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>Pre-assign a role and send an invitation email. The recipient creates their own account.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="dashboard-input"
              placeholder="investor@example.com"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Initial role
            </label>
            <select value={role} onChange={(e) => setRole(e.target.value as AccountRole)} className="dashboard-input">
              {roles.map((r) => (
                <option key={r} value={r} style={{ background: "#0a140a" }}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Organization
              </label>
              <input
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="dashboard-input"
                placeholder="e.g. Afronovation Capital"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Job title
              </label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="dashboard-input"
                placeholder="e.g. Portfolio Director"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Phone
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="dashboard-input" placeholder="+263…" />
          </div>

          {/* Role-dynamic invite-intent fields */}
          {(role === "government" || role === "ministry_admin") && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                {role === "ministry_admin" ? "Designated ministry" : "Beneficiary ministry"}
              </label>
              <select value={ministryId} onChange={(e) => setMinistryId(e.target.value)} className="dashboard-input">
                <option value="">Select ministry…</option>
                {ministries.map((m) => (
                  <option key={m.id} value={m.id} style={{ background: "#0a140a" }}>
                    {m.shortName}
                  </option>
                ))}
              </select>
            </div>
          )}
          {role === "qualified" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Firm type
                </label>
                <input value={firmType} onChange={(e) => setFirmType(e.target.value)} className="dashboard-input" placeholder="e.g. PE fund" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Mandate
                </label>
                <input value={mandate} onChange={(e) => setMandate(e.target.value)} className="dashboard-input" placeholder="e.g. Infrastructure" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="dashboard-input"
              placeholder="Context for the invitation…"
            />
          </div>

          {/* Hidden until credential provisioning ships — disabled checkboxes read as broken UI in demos. */}

          <div
            className="flex items-start gap-2 rounded-md px-2.5 py-2 text-xs"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "var(--color-text-muted)" }}
          >
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            An invitation email is sent when Resend is configured with a verified sending domain. The invitee still
            creates their own account at sign-up.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending ? "Sending…" : "Send invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
