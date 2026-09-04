"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { NDA_CLAUSES, NDA_TITLE, NDA_VERSION, requiresNdaAcceptance } from "@/lib/governance/nda";

/**
 * Blocking clickwrap NDA gate, mounted on every non-staff console shell (Deal Room + Ministry
 * Desk — Platform Feedback Batch v3, Phase 3). Renders `children` immediately for anyone who
 * doesn't need the NDA (staff, unauthenticated/loading — those are handled by the access gate) and
 * for non-staff accounts who have already accepted the current version. Otherwise it overlays a
 * non-dismissible acceptance dialog. Server routes independently enforce authorization; this is a
 * UX + legal-attestation layer, not the security boundary.
 *
 * Broadened from `qualified`-only to every role `requiresNdaAcceptance()` covers (`registered`,
 * `qualified`, `government`, `ministry_admin`) — "before accessing the platform" now means before
 * their first dashboard visit after any approval path, not just qualified investors.
 *
 * Institutional KYC (company, phone, HQ address, business registration id, corporate website) is
 * only ever shown/required for `qualified` investors — the Investor Qualification Vetting plan
 * moved that capture earlier, into the Strategic Partnerships wizard, and made it a hard
 * prerequisite for `role` ever becoming `qualified`. Other non-staff roles have no such
 * prerequisite, so this section is skipped entirely for them.
 */
const KYC_FIELDS: { key: "organization" | "phone" | "hqAddress" | "businessRegistrationId" | "websiteUrl"; label: string }[] = [
  { key: "organization", label: "Company / Fund" },
  { key: "phone", label: "Corporate phone" },
  { key: "hqAddress", label: "Headquarters address" },
  { key: "businessRegistrationId", label: "Business registration ID" },
  { key: "websiteUrl", label: "Corporate website" },
];

export function NdaGate({ children }: { children: React.ReactNode }) {
  const { role, isLoading, ndaAcceptedAt, name, organization, phone, hqAddress, businessRegistrationId, websiteUrl, refresh } = useAuth();
  const [title, setTitle] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const kyc = { organization, phone, hqAddress, businessRegistrationId, websiteUrl };

  const showKyc = role === "qualified";
  const needsNda = !isLoading && role !== null && requiresNdaAcceptance(role) && !ndaAcceptedAt;

  async function accept() {
    if (!agreed || !title.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/nda/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
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

            {showKyc && (
              <div className="pt-1">
                <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>
                  Institutional details on file
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {KYC_FIELDS.map((field) => (
                    <div key={field.key} className={field.key === "hqAddress" ? "sm:col-span-2" : undefined}>
                      <p className="text-[11px] mb-1" style={{ color: "var(--color-text-muted)" }}>{field.label}</p>
                      <div className="dashboard-input flex items-center" style={{ opacity: 0.85 }} aria-readonly="true">
                        {kyc[field.key] || "—"}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>
                  Captured during your investor application review. To update these details, contact ZIDA.
                </p>
              </div>
            )}

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
              <Button onClick={accept} disabled={!agreed || !title.trim() || busy}>
                Accept &amp; Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
