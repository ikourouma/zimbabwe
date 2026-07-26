"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { NDA_CLAUSES, NDA_TITLE, NDA_VERSION } from "@/lib/governance/nda";

/**
 * Blocking clickwrap NDA gate for the Deal Room. Renders `children` immediately for anyone who
 * doesn't need the NDA (staff, unauthenticated/loading — those are handled by the access gate),
 * and for qualified investors who have already accepted the current version. Otherwise it overlays
 * a non-dismissible acceptance dialog. Server routes independently enforce authorization; this is
 * a UX + legal-attestation layer, not the security boundary.
 */
/** Corporate KYC fields required before a qualified investor can complete Tier-2 (Deal Room) NDA
 *  acceptance — collected here rather than at self-registration so top-of-funnel signup stays
 *  frictionless (see the free-mail soft-warning on /register for the earlier, non-blocking step). */
const KYC_FIELDS: { key: "organization" | "phone" | "hqAddress" | "businessRegistrationId" | "websiteUrl"; label: string; placeholder: string }[] = [
  { key: "organization", label: "Company / Fund name", placeholder: "e.g. Meridian Capital Partners" },
  { key: "phone", label: "Corporate phone", placeholder: "e.g. +1 212 555 0100" },
  { key: "hqAddress", label: "Headquarters address", placeholder: "e.g. 1 Wall Street, New York, NY 10005" },
  { key: "businessRegistrationId", label: "Business registration / incorporation number", placeholder: "e.g. DE-2014-0451123" },
  { key: "websiteUrl", label: "Corporate website", placeholder: "e.g. https://www.example.com" },
];

export function NdaGate({ children }: { children: React.ReactNode }) {
  const {
    isQualified,
    isAdmin,
    isGovernment,
    isSuperAdmin,
    isLoading,
    ndaAcceptedAt,
    name,
    organization,
    phone,
    hqAddress,
    businessRegistrationId,
    websiteUrl,
    refresh,
  } = useAuth();
  const [title, setTitle] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kyc, setKyc] = useState({
    organization: organization ?? "",
    phone: phone ?? "",
    hqAddress: hqAddress ?? "",
    businessRegistrationId: businessRegistrationId ?? "",
    websiteUrl: websiteUrl ?? "",
  });

  // Staff personas are ZIDA-internal and exempt; only pure investors (qualified but not staff) gate.
  const isStaff = isAdmin || isGovernment || isSuperAdmin;
  const needsNda = !isLoading && isQualified && !isStaff && !ndaAcceptedAt;
  const kycComplete = Object.values(kyc).every((v) => v.trim().length > 0);

  // The profile loads asynchronously after this component's first render, so seed any
  // still-empty fields once it resolves — a plain useState initializer would otherwise miss it.
  useEffect(() => {
    if (isLoading) return;
    setKyc((prev) => ({
      organization: prev.organization || organization || "",
      phone: prev.phone || phone || "",
      hqAddress: prev.hqAddress || hqAddress || "",
      businessRegistrationId: prev.businessRegistrationId || businessRegistrationId || "",
      websiteUrl: prev.websiteUrl || websiteUrl || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  async function accept() {
    if (!agreed || !title.trim() || !kycComplete) return;
    setBusy(true);
    try {
      const res = await fetch("/api/nda/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          organization: kyc.organization.trim(),
          phone: kyc.phone.trim(),
          hqAddress: kyc.hqAddress.trim(),
          businessRegistrationId: kyc.businessRegistrationId.trim(),
          websiteUrl: kyc.websiteUrl.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Could not record your acceptance. Please try again.");
        return;
      }
      await refresh();
      toast.success("Confidentiality agreement accepted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {children}
      <Dialog open={needsNda}>
        {/* Non-dismissible: no onOpenChange handler and pointer-events on the overlay keep the
            investor from bypassing the gate without accepting. */}
        <DialogContent
          className="max-w-lg"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          hideClose
        >
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5" style={{ color: "var(--color-gold)" }} />
              <DialogTitle>{NDA_TITLE}</DialogTitle>
            </div>
            <DialogDescription>
              Before accessing confidential project information, please review and accept the terms below. Version{" "}
              {NDA_VERSION}.
            </DialogDescription>
          </DialogHeader>

          <ol
            className="list-decimal pl-5 space-y-2 text-sm max-h-56 overflow-y-auto pr-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {NDA_CLAUSES.map((clause, i) => (
              <li key={i}>{clause}</li>
            ))}
          </ol>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>
                Accepting as
              </label>
              <div
                className="dashboard-input flex items-center"
                style={{ opacity: 0.85 }}
                aria-readonly="true"
              >
                {name ?? "Your account"}
              </div>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                Recorded from your verified account.
              </p>
            </div>
            <div>
              <label htmlFor="nda-title" className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>
                Your title / capacity
              </label>
              <input
                id="nda-title"
                className="dashboard-input"
                placeholder="e.g. Managing Director"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="pt-1">
              <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>
                Institutional details (required to access the Data Room)
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {KYC_FIELDS.map((field) => (
                  <div key={field.key} className={field.key === "hqAddress" ? "sm:col-span-2" : undefined}>
                    <label htmlFor={`kyc-${field.key}`} className="text-[11px] mb-1 block" style={{ color: "var(--color-text-muted)" }}>
                      {field.label}
                    </label>
                    <input
                      id={`kyc-${field.key}`}
                      className="dashboard-input"
                      placeholder={field.placeholder}
                      value={kyc[field.key]}
                      onChange={(e) => setKyc((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>
                I, <strong>{name ?? "the account holder"}</strong>
                {title.trim() ? (
                  <>
                    {" "}(<strong>{title.trim()}</strong>)
                  </>
                ) : null}
                , have read and agree to the {NDA_TITLE}, and I am authorized to accept it on behalf of my organization.
              </span>
            </label>
            <div className="flex justify-end">
              <Button onClick={accept} disabled={!agreed || !title.trim() || !kycComplete || busy}>
                Accept &amp; Enter Deal Room
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
