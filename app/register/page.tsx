"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import {
  executiveFieldClassName,
  executiveFieldStyle,
  executiveLabelClassName,
} from "@/components/auth/executive-field-styles";
import { useLeadCapture } from "@/context/lead-capture-context";
import { sectors } from "@/lib/data/taxonomies";
import { isFreeMailDomain } from "@/lib/utils/email-domain";

const investorTypes = [
  "Individual Investor",
  "Institutional Investor",
  "Development Finance Institution",
  "Diaspora Investor",
  "Strategic Partner",
  "Government / Institutional",
];

export default function RegisterPage() {
  const { addInquiry } = useLeadCapture();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    organization: "",
    investorType: "",
    email: "",
    sectorId: "",
    mandateAlignment: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const isFormValid =
    form.firstName &&
    form.lastName &&
    form.organization &&
    form.investorType &&
    form.email &&
    form.sectorId &&
    form.mandateAlignment;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);

    const sector = sectors.find((s) => s.id === form.sectorId);
    try {
      await addInquiry({
        type: "registration",
        name: `${form.firstName} ${form.lastName}`,
        email: form.email,
        organization: form.organization,
        message: `Investor type: ${form.investorType}. Sector interest: ${sector?.name ?? form.sectorId}. ${form.mandateAlignment}`,
      });
    } catch {
      setIsSubmitting(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 600));
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,100,0,0.15)", border: "1px solid rgba(0,100,0,0.35)" }}
        >
          <Check className="w-8 h-8" style={{ color: "#86efac" }} />
        </div>
        <h2
          className="text-3xl font-bold mb-4 text-center"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
        >
          Application Received
        </h2>
        <p
          className="text-sm leading-relaxed mb-6 text-center max-w-md mx-auto"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Thank you for applying to the Zimbabwe Digital Investment Platform. Your investor application
          has been securely recorded and is pending credential review.
        </p>
        <p
          className="text-sm leading-relaxed mb-10 text-center max-w-md mx-auto"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Once your qualification is confirmed, you will receive sign-in credentials to unlock
          registered-tier registry access. Capital estimates and financial indicators (IRR, NPV, ROI)
          unlock at the qualified-investor tier after review.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Link href="/projects" className="btn-sovereign w-full justify-center text-center">
            Browse Public Registry →
          </Link>
          <Link href="/auth/sign-in" className="btn-sovereign-ghost w-full justify-center text-center">
            Already have credentials? Sign in
          </Link>
        </div>

        <p className="text-xs text-center mt-8" style={{ color: "var(--color-text-muted)" }}>
          Have a specific opportunity in mind?{" "}
          <Link href="/strategic-partnerships" className="underline" style={{ color: "var(--color-gold)" }}>
            Start a Strategic Partnership inquiry →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full relative z-10 my-10">
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
        >
          Apply for Access
        </h1>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--color-text-secondary)", maxWidth: "500px" }}
        >
          Submit your investor application for governed access to the ZIDA catalogue. Applications are
          reviewed before credentials are issued — this is not a self-service login.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className={executiveLabelClassName}
              style={{ color: "var(--color-text-muted)" }}
            >
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
              className={`${executiveFieldClassName} focus:bg-[#FFD300] focus:text-black`}
              style={executiveFieldStyle(!!form.firstName)}
            />
          </div>
          <div>
            <label
              className={executiveLabelClassName}
              style={{ color: "var(--color-text-muted)" }}
            >
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 rounded text-sm transition-colors outline-none focus:bg-[#FFD300] focus:text-black"
              style={executiveFieldStyle(!!form.lastName)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className={executiveLabelClassName}
              style={{ color: "var(--color-text-muted)" }}
            >
              Organization
            </label>
            <input
              type="text"
              name="organization"
              value={form.organization}
              onChange={handleChange}
              required
              placeholder="Fund / Corporate Entity"
              className="w-full px-3 py-2.5 rounded text-sm transition-colors outline-none focus:bg-[#FFD300] focus:text-black placeholder-gray-600"
              style={executiveFieldStyle(!!form.organization)}
            />
          </div>
          <div>
            <label
              className={executiveLabelClassName}
              style={{ color: "var(--color-text-muted)" }}
            >
              Investor Profile
            </label>
            <select
              name="investorType"
              value={form.investorType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 rounded text-sm transition-colors outline-none focus:bg-[#FFD300] focus:text-black appearance-none"
              style={{
                ...executiveFieldStyle(!!form.investorType),
                color: form.investorType ? "#000" : "var(--color-text-muted)",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${form.investorType ? "%23000" : "%236b7280"}' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                backgroundSize: "1rem",
              }}
            >
              <option value="" disabled>
                Select type
              </option>
              {investorTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className={executiveLabelClassName}
              style={{ color: "var(--color-text-muted)" }}
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="name@org.com"
              className="w-full px-3 py-2.5 rounded text-sm transition-colors outline-none focus:bg-[#FFD300] focus:text-black placeholder-gray-600"
              style={executiveFieldStyle(!!form.email)}
            />
            {isFreeMailDomain(form.email) && (
              <p className="mt-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                For faster institutional accreditation, we recommend applying with your official corporate email address.
              </p>
            )}
          </div>
          <div>
            <label
              className={executiveLabelClassName}
              style={{ color: "var(--color-text-muted)" }}
            >
              Primary Sector Interest
            </label>
            <select
              name="sectorId"
              value={form.sectorId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 rounded text-sm transition-colors outline-none focus:bg-[#FFD300] focus:text-black appearance-none"
              style={{
                ...executiveFieldStyle(!!form.sectorId),
                color: form.sectorId ? "#000" : "var(--color-text-muted)",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${form.sectorId ? "%23000" : "%236b7280"}' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                backgroundSize: "1rem",
              }}
            >
              <option value="" disabled>
                Select sector
              </option>
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            className="block text-[10px] font-mono tracking-widest uppercase mb-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            Investment Interest & Mandate Alignment
          </label>
          <textarea
            name="mandateAlignment"
            value={form.mandateAlignment}
            onChange={handleChange}
            required
            rows={3}
            placeholder="Describe your investment thesis, ticket size, or engagement interest"
            className="w-full px-3 py-2.5 rounded text-sm transition-colors outline-none focus:bg-[#FFD300] focus:text-black placeholder-gray-600 resize-none"
            style={executiveFieldStyle(!!form.mandateAlignment)}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className="w-full py-3.5 mt-2 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "#006400",
            color: "#ffffff",
            boxShadow: "0 4px 14px 0 rgba(0, 100, 0, 0.35)",
          }}
        >
          {isSubmitting ? "SUBMITTING APPLICATION…" : "SUBMIT APPLICATION"}
          {!isSubmitting && <span>→</span>}
        </button>
      </form>

      <div className="mt-8 pt-4 border-t text-center" style={{ borderColor: "var(--color-sovereign-border)" }}>
        <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "var(--color-text-muted)" }}>
          Governed application · Stored securely · Credentials issued after review
        </p>
        <p className="text-sm mt-4" style={{ color: "var(--color-text-muted)" }}>
          Already have credentials?{" "}
          <Link href="/auth/sign-in" className="underline" style={{ color: "var(--color-gold)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
