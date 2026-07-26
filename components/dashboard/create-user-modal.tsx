"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ShieldAlert, UserPlus } from "lucide-react";
import type { AccountRole } from "@/lib/auth/types";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useAdminUsers } from "@/lib/hooks/use-admin-users";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/components/dashboard/role-change-modal";

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  /** Roles the current actor may assign (server re-enforces the ceiling). Defaults to all. */
  assignableRoles?: AccountRole[];
}

interface RevealedCredentials {
  email: string;
  name: string;
  role: AccountRole;
  tempPassword: string;
}

/**
 * Super-admin/admin "Create User" — provisions a real, immediately-active account (no email
 * verification, no MFA gate — both deferred phases platform-wide) and shows the generated
 * temporary password exactly once for hand-off out-of-band. Distinct from "Invite user" (which
 * only records intent for later manual follow-up): this one actually creates a sign-in-ready
 * account right now.
 */
export function CreateUserModal({ open, onOpenChange, onCreated, assignableRoles }: CreateUserModalProps) {
  const { ministries } = useTaxonomyStore();
  const { createUser } = useAdminUsers();
  const roles = assignableRoles && assignableRoles.length > 0 ? assignableRoles : (Object.keys(ROLE_LABELS) as AccountRole[]);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AccountRole>(roles[0] ?? "registered");
  const [organization, setOrganization] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState<RevealedCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setName("");
      setRole(roles[0] ?? "registered");
      setOrganization("");
      setJobTitle("");
      setPhone("");
      setMinistryId("");
      setRevealed(null);
      setCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (!email.trim().includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!name.trim()) {
      toast.error("Enter the user's full name.");
      return;
    }
    setPending(true);
    try {
      const result = await createUser({
        email: email.trim(),
        name: name.trim(),
        role,
        organization: organization.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        phone: phone.trim() || undefined,
        ministryId: role === "government" ? ministryId || undefined : undefined,
      });
      setRevealed({ email: result.email, name: result.name, role: result.role, tempPassword: result.tempPassword });
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setPending(false);
    }
  };

  const copyCredentials = async () => {
    if (!revealed) return;
    await navigator.clipboard.writeText(`Email: ${revealed.email}\nTemporary password: ${revealed.tempPassword}`);
    setCopied(true);
    toast.success("Credentials copied");
    setTimeout(() => setCopied(false), 2000);
  };

  if (revealed) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account created</DialogTitle>
            <DialogDescription>
              {revealed.name} ({ROLE_LABELS[revealed.role]}) can sign in immediately. Copy these credentials now — the
              temporary password will not be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md p-3 font-mono text-sm" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--color-sovereign-border)" }}>
              <p style={{ color: "var(--color-text-muted)" }} className="text-xs mb-1">
                Email
              </p>
              <p className="text-white mb-3">{revealed.email}</p>
              <p style={{ color: "var(--color-text-muted)" }} className="text-xs mb-1">
                Temporary password
              </p>
              <p className="text-white">{revealed.tempPassword}</p>
            </div>
            <div
              className="flex items-start gap-2 rounded-md px-2.5 py-2 text-xs"
              style={{ backgroundColor: "rgba(251,191,36,0.08)", color: "var(--color-text-muted)" }}
            >
              <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
              Share this password with the user out-of-band (not by email/chat that others can read). They should
              change it after first sign-in — enforced password reset is a future phase.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={copyCredentials}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy credentials"}
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            Provisions a real account instantly — no email verification or MFA enrollment required (both deferred
            platform-wide for the pilot). The account is active immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Full name
              </label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="dashboard-input" placeholder="Jane Moyo" autoFocus />
            </div>
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
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Role
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

          {role === "government" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Beneficiary ministry
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
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            <UserPlus className="h-3.5 w-3.5" />
            {pending ? "Creating…" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
