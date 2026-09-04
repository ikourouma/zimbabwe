"use client";

import { useEffect, useState } from "react";
import type { AdminUserRecord, UserDossier } from "@/lib/types";
import { useUserDossier } from "@/lib/hooks/use-user-dossier";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface EditUserDetailsPayload {
  organization: string | null;
  jobTitle: string | null;
  phone: string | null;
  hqAddress: string | null;
  businessRegistrationId: string | null;
  websiteUrl: string | null;
  executiveRepresentativeName: string | null;
  executiveRepresentativeTitle: string | null;
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="dashboard-input disabled:opacity-50"
      />
    </div>
  );
}

/**
 * "Edit details" — shared across the Users & Roles table row action and the User Detail Drawer's
 * header Edit button (Platform Feedback Batch v4, Phase 4, items 23/27/28). Expanded from the
 * original 3 fields (organization, job title, phone) to the full already-captured profile set —
 * institutional KYC (`hqAddress`, `businessRegistrationId`, `websiteUrl`) and the Executive
 * Representative pair — everything `profiles` actually stores that's safe to admin-edit. Name/Email
 * stay excluded — Better-Auth-owned, never editable here.
 *
 * The KYC/Executive fields live on the richer `UserDossier` (GET /api/users/[id]), not the lighter
 * `AdminUserRecord` the table row already has — so when the caller doesn't already have one loaded
 * (the plain row action), this self-fetches via `useUserDossier`. The drawer already has its own
 * dossier loaded, so it passes it straight through to avoid a duplicate round-trip.
 */
export function EditUserDetailsModal({
  user,
  dossier: dossierProp,
  onCancel,
  onSave,
}: {
  user: AdminUserRecord | null;
  dossier?: UserDossier | null;
  onCancel: () => void;
  onSave: (updates: EditUserDetailsPayload) => Promise<void>;
}) {
  const selfFetch = useUserDossier(dossierProp === undefined ? (user?.userId ?? null) : null);
  const dossier = dossierProp !== undefined ? dossierProp : selfFetch.dossier;
  const dossierLoading = dossierProp !== undefined ? false : selfFetch.isLoading;

  const [organization, setOrganization] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [hqAddress, setHqAddress] = useState("");
  const [businessRegistrationId, setBusinessRegistrationId] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [executiveRepresentativeName, setExecutiveRepresentativeName] = useState("");
  const [executiveRepresentativeTitle, setExecutiveRepresentativeTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const open = Boolean(user);

  useEffect(() => {
    if (!user) return;
    setOrganization(user.organization ?? "");
    setJobTitle(user.jobTitle ?? "");
    setPhone(user.phone ?? "");
    setBusy(false);
    // These four only ever come from the dossier — reset immediately on user change so a stale
    // previous user's values never flash while the fresh fetch is in flight.
    setHqAddress("");
    setBusinessRegistrationId("");
    setWebsiteUrl("");
    setExecutiveRepresentativeName("");
    setExecutiveRepresentativeTitle("");
  }, [user]);

  useEffect(() => {
    if (!dossier) return;
    setHqAddress(dossier.hqAddress ?? "");
    setBusinessRegistrationId(dossier.businessRegistrationId ?? "");
    setWebsiteUrl(dossier.websiteUrl ?? "");
    setExecutiveRepresentativeName(dossier.executiveRepresentativeName ?? "");
    setExecutiveRepresentativeTitle(dossier.executiveRepresentativeTitle ?? "");
  }, [dossier]);

  if (!user) return null;

  const submit = async () => {
    setBusy(true);
    try {
      await onSave({
        organization: organization.trim() || null,
        jobTitle: jobTitle.trim() || null,
        phone: phone.trim() || null,
        hqAddress: hqAddress.trim() || null,
        businessRegistrationId: businessRegistrationId.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        executiveRepresentativeName: executiveRepresentativeName.trim() || null,
        executiveRepresentativeTitle: executiveRepresentativeTitle.trim() || null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit details for {user.name}</DialogTitle>
          <DialogDescription>
            The full already-captured profile set is admin-editable here — name and email stay excluded, managed by
            the account&apos;s own sign-in provider.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Organization" value={organization} onChange={setOrganization} />
          <Field label="Job title" value={jobTitle} onChange={setJobTitle} />
          <Field label="Phone" value={phone} onChange={setPhone} />

          <div className="pt-2 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
              Institutional KYC
            </p>
            <div className="space-y-3">
              <Field
                label="HQ address"
                value={hqAddress}
                onChange={setHqAddress}
                disabled={dossierLoading}
              />
              <Field
                label="Business registration ID"
                value={businessRegistrationId}
                onChange={setBusinessRegistrationId}
                disabled={dossierLoading}
              />
              <Field label="Website" value={websiteUrl} onChange={setWebsiteUrl} disabled={dossierLoading} />
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
              Executive Representative
            </p>
            <div className="space-y-3">
              <Field
                label="Name"
                value={executiveRepresentativeName}
                onChange={setExecutiveRepresentativeName}
                disabled={dossierLoading}
              />
              <Field
                label="Title"
                value={executiveRepresentativeTitle}
                onChange={setExecutiveRepresentativeTitle}
                disabled={dossierLoading}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={busy || dossierLoading}>
            {busy ? "Saving…" : "Save details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
