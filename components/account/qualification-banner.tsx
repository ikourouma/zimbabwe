"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export interface KycValues {
  organization: string;
  phone: string;
  hqAddress: string;
  businessRegistrationId: string;
  websiteUrl: string;
}

export const KYC_FIELD_KEYS: (keyof KycValues)[] = [
  "organization",
  "phone",
  "hqAddress",
  "businessRegistrationId",
  "websiteUrl",
];

export function isKycComplete(values: KycValues): boolean {
  return KYC_FIELD_KEYS.every((key) => values[key].trim().length > 0);
}

interface QualificationBannerProps {
  /** `profile` — rendered inside the Company & Representative form on /deal-room/profile; the
   *  button saves the in-progress form first, then submits. `overview` — rendered on the
   *  /deal-room landing page with no form to save; `values` there is already-persisted
   *  auth-context state, so the button submits directly, or links back to /deal-room/profile
   *  when KYC is still incomplete (Qualified Investor banner + pilot closeout plan). */
  variant: "profile" | "overview";
  values: KycValues;
  onSaveFirst?: () => Promise<void> | void;
}

/**
 * "Become a Qualified Investor" — the self-serve on-ramp into the qualification pipeline. Shared
 * between /deal-room/profile (where it originated) and the /deal-room overview, so the two
 * surfaces can never drift on copy, disabled logic, or the request-review call.
 */
export function QualificationBanner({ variant, values, onSaveFirst }: QualificationBannerProps) {
  const { name, email } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const kycComplete = isKycComplete(values);

  const requestReview = async () => {
    setSubmitting(true);
    try {
      if (onSaveFirst) await onSaveFirst();
      const res = await fetch("/api/inquiries/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engagementType: "investor",
          name: name ?? "",
          email: email ?? "",
          organization: values.organization,
          phone: values.phone,
          hqAddress: values.hqAddress,
          businessRegistrationId: values.businessRegistrationId,
          websiteUrl: values.websiteUrl,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not start your application");
      }
      toast.success("Company profile saved to your application — continue to finish and submit.");
      router.push("/strategic-partnerships");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start your application");
    } finally {
      setSubmitting(false);
    }
  };

  const description =
    variant === "overview" && !kycComplete
      ? "Add your organization, phone, HQ address, business registration ID, and corporate website on My Profile, then request review — your KYC details carry straight into the application, so you only add your investment interest before submitting."
      : kycComplete
        ? "Your company profile is complete. Continue to declare your investment interest and submit for ZIDA review — you won't need to re-enter your KYC details."
        : "Fill in every field in Company & Representative above, then request review — your KYC details carry straight into the application, so you only add your investment interest before submitting.";

  return (
    <section
      className="rounded-lg p-5"
      style={{ backgroundColor: "rgba(0,100,0,0.12)", border: "1px solid var(--color-sovereign-border)" }}
    >
      <div className="flex items-start gap-3">
        <Handshake className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "var(--color-gold)" }} />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-white mb-1">Become a Qualified Investor</h2>
          <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
            {description}
          </p>
          {variant === "overview" && !kycComplete ? (
            <Link
              href="/deal-room/profile"
              className="px-4 py-2.5 rounded text-sm font-semibold bg-[#FFD300] text-black hover:brightness-95 transition inline-flex items-center gap-2"
            >
              Complete Company &amp; Representative
            </Link>
          ) : (
            <button
              type="button"
              onClick={requestReview}
              disabled={!kycComplete || submitting}
              className="px-4 py-2.5 rounded text-sm font-semibold bg-[#FFD300] text-black hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Request Qualified Investor Review
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
