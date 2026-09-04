"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Camera,
  Check,
  CircleAlert,
  FileText,
  FilePlus2,
  Handshake,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useProjectStore } from "@/context/project-store-context";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { executiveFieldClassName, executiveFieldStyle, executiveLabelClassName } from "@/components/auth/executive-field-styles";
import { MyTeamPanel } from "@/components/account/my-team-panel";
import type { AccountRole } from "@/lib/auth/types";

const ROLE_LABELS: Record<AccountRole, string> = {
  registered: "Registered Investor",
  qualified: "Qualified Investor",
  government: "Government User",
  ministry_admin: "Ministry Admin",
  admin: "ZIDA Admin",
  super_admin: "Platform Admin",
};

interface CompanyForm {
  organization: string;
  jobTitle: string;
  phone: string;
  executiveRepresentativeName: string;
  executiveRepresentativeTitle: string;
  hqAddress: string;
  businessRegistrationId: string;
  websiteUrl: string;
}

const KYC_FIELD_KEYS: (keyof CompanyForm)[] = [
  "organization",
  "phone",
  "hqAddress",
  "businessRegistrationId",
  "websiteUrl",
];

/**
 * "My Profile" — one shared 360-degree view rendered at /deal-room/profile, /admin/profile, and
 * /super-admin/profile (Deal Room Feedback Batch v2, Phase 2). Distinct from the Account &
 * Security suite (credentials/sessions/notifications, still at .../account or .../settings) —
 * this page is the company/KYC/compliance surface, and for a `registered` investor doubles as
 * the self-serve on-ramp into the existing qualification pipeline (item 18 + item 1 follow-up).
 */
export function ProfileView() {
  const auth = useAuth();
  const {
    name,
    email,
    role,
    userId,
    avatarKey,
    organization,
    jobTitle,
    phone,
    hqAddress,
    businessRegistrationId,
    websiteUrl,
    executiveRepresentativeName,
    executiveRepresentativeTitle,
    ndaAcceptedAt,
    businessRegistrationDocKey,
    ministryId,
    refresh,
  } = auth;
  const isMinistryAdmin = role === "ministry_admin";

  const pathname = usePathname();
  const securityHref = pathname?.startsWith("/super-admin")
    ? "/super-admin/account"
    : pathname?.startsWith("/admin")
      ? "/admin/account"
      : "/deal-room/settings";

  const initialForm: CompanyForm = {
    organization: organization ?? "",
    jobTitle: jobTitle ?? "",
    phone: phone ?? "",
    executiveRepresentativeName: executiveRepresentativeName ?? "",
    executiveRepresentativeTitle: executiveRepresentativeTitle ?? "",
    hqAddress: hqAddress ?? "",
    businessRegistrationId: businessRegistrationId ?? "",
    websiteUrl: websiteUrl ?? "",
  };
  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [saving, setSaving] = useState(false);

  const dirty = KYC_FIELD_KEYS.concat(["jobTitle", "executiveRepresentativeName", "executiveRepresentativeTitle"]).some(
    (key) => form[key].trim() !== (initialForm[key] ?? "").trim()
  );

  const setField = (key: keyof CompanyForm) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const saveCompany = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      await refresh();
      toast.success("Company profile updated");
    } catch {
      toast.error("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const kycComplete = KYC_FIELD_KEYS.every((key) => form[key].trim().length > 0);

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">My Profile</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Your full account, company, and compliance record — the same view ZIDA staff see on your Institutional
          Compliance Dossier.{" "}
          <Link href={securityHref} className="text-[#FFD300] hover:underline">
            Manage credentials &amp; security →
          </Link>
        </p>
      </div>

      <div className="space-y-4">
        <IdentityCard name={name} email={email} role={role} avatarKey={avatarKey} userId={userId} />

        {isMinistryAdmin ? (
          <MinistryIdentityCard ministryId={ministryId} variant="designated" />
        ) : (
          <>
            <CompanyDetailsCard form={form} setField={setField} dirty={dirty} saving={saving} onSave={saveCompany} />

            <ComplianceCard
              role={role}
              ndaAcceptedAt={ndaAcceptedAt}
              kycComplete={kycComplete}
              businessRegistrationDocKey={businessRegistrationDocKey}
              onRefresh={refresh}
            />

            {/* A government reviewer with a ministryId (Phase 1 pilot tagging) is affiliated with
               that ministry for context, but never ministry-scoped like ministry_admin — see the
               card's "affiliated" copy variant. */}
            {role === "government" && ministryId && <MinistryIdentityCard ministryId={ministryId} variant="affiliated" />}
          </>
        )}

        {role === "registered" && <QualificationCard kycComplete={kycComplete} onSaveFirst={saveCompany} form={form} />}

        {role === "qualified" && <PortfolioSummaryCard userId={userId} />}

        {(role === "qualified" || isMinistryAdmin) && <MyTeamPanel />}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Identity ---- */

function IdentityCard({
  name,
  email,
  role,
  avatarKey,
  userId,
}: {
  name: string | null;
  email: string | null;
  role: AccountRole | null;
  avatarKey: string | null;
  userId: string | null;
}) {
  const { refresh } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const avatarSrc = userId && (avatarKey || avatarVersion > 0) && !avatarFailed
    ? `/api/avatars/${userId}?v=${avatarVersion}`
    : null;

  const initials = useMemo(() => {
    const source = (name ?? email ?? "").trim();
    if (!source) return "?";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name, email]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image exceeds the 5 MB limit");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/account/avatar", { method: "POST", body });
      if (!res.ok) throw new Error("Upload failed");
      setAvatarFailed(false);
      setAvatarVersion((v) => v + 1);
      await refresh();
      toast.success("Avatar updated");
    } catch {
      toast.error("Could not upload avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="dashboard-panel p-5">
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSrc} alt="" className="h-14 w-14 rounded-full object-cover" onError={() => setAvatarFailed(true)} />
          ) : (
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-semibold text-black"
              style={{ backgroundColor: "#FFD300" }}
              aria-hidden
            >
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-white truncate">{name ?? "—"}</p>
          <p className="text-sm truncate" style={{ color: "var(--color-text-secondary)" }}>
            {email ?? "—"}
          </p>
          <span className="inline-flex items-center gap-1.5 mt-1.5 text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/80">
            <ShieldCheck className="h-3 w-3" />
            {role ? ROLE_LABELS[role] : "—"}
          </span>
        </div>
        <div className="shrink-0">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 rounded text-xs font-medium border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Change avatar
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Ministry Scope ---- */

/** Read-only ministry identity for `ministry_admin` (Deal Room Feedback Batch v2, Phase 6) — in
 *  place of the investor-oriented CompanyDetailsCard/ComplianceCard, neither of which applies to a
 *  government official. `ministryId` is set by whichever admin/super_admin created this account
 *  (see CreateUserModal) — a ministry official can't self-reassign which ministry they represent. */
/**
 * Ministry affiliation card — two copy variants sharing the same ministries data-fetch (Team
 * Ministry Traceability Batch, Phase 6, item 7): `ministry_admin` gets "Designated Ministry" (their
 * console is hard-scoped to it — full create/edit/publish authority per Phase 3); `government` gets
 * "Affiliated Ministry" (a platform-wide reviewer isn't ministry-exclusive — this is context, not a
 * scope restriction). Distinct copy prevents a government pilot account from reading as if they
 * were ministry-locked staff.
 */
function MinistryIdentityCard({ ministryId, variant = "designated" }: { ministryId: string | null; variant?: "designated" | "affiliated" }) {
  const { ministries, isLoading } = useTaxonomyStore();
  const ministry = ministries.find((m) => m.id === ministryId);

  return (
    <section className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
        <Building2 className="h-4 w-4" /> {variant === "affiliated" ? "Affiliated Ministry" : "Designated Ministry"}
      </h2>
      <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
        {variant === "affiliated"
          ? "For context only — as a platform-wide reviewer, your access isn't limited to this ministry's projects. Contact a Platform/ZIDA Admin to change it."
          : "Your console shows only the project pipeline and team tied to this ministry. Contact a Platform/ZIDA Admin to change it."}
      </p>
      {isLoading ? (
        <div className="dashboard-skeleton h-6 w-48" />
      ) : (
        <p className="text-base text-white">{ministry?.name ?? "No ministry assigned yet"}</p>
      )}
    </section>
  );
}

/* ---------------------------------------------------------- Company Details ---- */

function CompanyDetailsCard({
  form,
  setField,
  dirty,
  saving,
  onSave,
}: {
  form: CompanyForm;
  setField: (key: keyof CompanyForm) => (v: string) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <section className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
        <Building2 className="h-4 w-4" /> Company &amp; Representative
      </h2>
      <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
        This is your company&apos;s identity of record — it prepopulates read-only fields when you propose a project
        or file an application.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LabeledInput label="Company / entity name" value={form.organization} onChange={setField("organization")} />
        <LabeledInput label="Corporate phone" value={form.phone} onChange={setField("phone")} />
        <LabeledInput
          label="Authorized representative"
          value={form.executiveRepresentativeName}
          onChange={setField("executiveRepresentativeName")}
          placeholder="Full name on file"
        />
        <LabeledInput
          label="Representative title"
          value={form.executiveRepresentativeTitle}
          onChange={setField("executiveRepresentativeTitle")}
          placeholder="e.g. Managing Director"
        />
        <LabeledInput label="Job title" value={form.jobTitle} onChange={setField("jobTitle")} />
        <LabeledInput label="Corporate website" value={form.websiteUrl} onChange={setField("websiteUrl")} placeholder="https://" />
        <LabeledInput
          label="Business registration ID"
          value={form.businessRegistrationId}
          onChange={setField("businessRegistrationId")}
        />
        <div className="sm:col-span-2">
          <LabeledInput
            label="HQ / company address"
            value={form.hqAddress}
            onChange={setField("hqAddress")}
            placeholder="Used to prefill a proposal's project location"
          />
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
        <p className="text-xs" style={{ color: dirty ? "#fbbf24" : "var(--color-text-muted)" }}>
          {dirty ? "Unsaved changes." : "Company details up to date."}
        </p>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="px-4 py-2 rounded text-sm font-semibold bg-[#FFD300] text-black hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-1.5"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save company details
        </button>
      </div>
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={executiveLabelClassName} style={{ color: "var(--color-text-muted)" }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={executiveFieldClassName}
        style={executiveFieldStyle(!!value)}
      />
    </div>
  );
}

/* -------------------------------------------------------------- Compliance ---- */

function ComplianceCard({
  role,
  ndaAcceptedAt,
  kycComplete,
  businessRegistrationDocKey,
  onRefresh,
}: {
  role: AccountRole | null;
  ndaAcceptedAt: string | null;
  kycComplete: boolean;
  businessRegistrationDocKey: string | null;
  onRefresh: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showNda = role === "qualified" || role === "government" || role === "admin" || role === "super_admin";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/account/company-document", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      await onRefresh();
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/account/company-document", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await onRefresh();
      toast.success("Document removed");
    } catch {
      toast.error("Could not remove document");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" /> Compliance &amp; Documents
      </h2>

      <div className="space-y-2.5 mb-4">
        <div className="flex items-center gap-2 text-sm">
          {kycComplete ? (
            <Check className="h-4 w-4 shrink-0" style={{ color: "#4ade80" }} />
          ) : (
            <CircleAlert className="h-4 w-4 shrink-0" style={{ color: "#fbbf24" }} />
          )}
          <span style={{ color: "var(--color-text-secondary)" }}>
            KYC profile {kycComplete ? "complete" : "incomplete — fill in every field above"}
          </span>
        </div>
        {showNda && (
          <div className="flex items-center gap-2 text-sm">
            {ndaAcceptedAt ? (
              <Check className="h-4 w-4 shrink-0" style={{ color: "#4ade80" }} />
            ) : (
              <CircleAlert className="h-4 w-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
            )}
            <span style={{ color: "var(--color-text-secondary)" }}>
              {ndaAcceptedAt
                ? `Deal Room NDA accepted ${new Date(ndaAcceptedAt).toLocaleDateString()}`
                : "Deal Room NDA not yet accepted"}
            </span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-white/10">
        <p className={executiveLabelClassName} style={{ color: "var(--color-text-muted)" }}>
          Business registration certificate
        </p>
        {businessRegistrationDocKey ? (
          <div className="flex items-center gap-3 mt-1.5">
            <a
              href="/api/account/company-document"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#FFD300] hover:underline"
            >
              <FileText className="h-3.5 w-3.5" /> View uploaded document
            </a>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/80 disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        ) : (
          <div className="mt-1.5">
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-2 rounded text-xs font-medium border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload certificate (PDF, DOC, or scan)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Qualification ---- */

function QualificationCard({
  kycComplete,
  onSaveFirst,
  form,
}: {
  kycComplete: boolean;
  onSaveFirst: () => Promise<void> | void;
  form: CompanyForm;
}) {
  const { name, email } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const requestReview = async () => {
    setSubmitting(true);
    try {
      await onSaveFirst();
      const res = await fetch("/api/inquiries/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engagementType: "investor",
          name: name ?? "",
          email: email ?? "",
          organization: form.organization,
          phone: form.phone,
          hqAddress: form.hqAddress,
          businessRegistrationId: form.businessRegistrationId,
          websiteUrl: form.websiteUrl,
        }),
      });
      if (!res.ok) throw new Error("Could not start your application");
      toast.success("Company profile saved to your application — continue to finish and submit.");
      router.push("/strategic-partnerships");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start your application");
    } finally {
      setSubmitting(false);
    }
  };

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
            {kycComplete
              ? "Your company profile is complete. Continue to declare your investment interest and submit for ZIDA review — you won't need to re-enter your KYC details."
              : "Fill in every field in Company & Representative above, then request review — your KYC details carry straight into the application, so you only add your investment interest before submitting."}
          </p>
          <button
            type="button"
            onClick={requestReview}
            disabled={!kycComplete || submitting}
            className="px-4 py-2.5 rounded text-sm font-semibold bg-[#FFD300] text-black hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Request Qualified Investor Review
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Portfolio ---- */

function PortfolioSummaryCard({ userId }: { userId: string | null }) {
  const { projects } = useProjectStore();
  const { engagements } = useDealRoomStore();

  const myProposals = projects.filter((p) => p.investorSubmitted && p.createdBy === userId);
  const myEngagements = engagements.filter((e) => e.userId === userId);

  return (
    <section className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <FilePlus2 className="h-4 w-4" /> My Portfolio
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/deal-room/proposals"
          className="rounded-lg p-4 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
        >
          <p className="text-2xl font-semibold text-white">{myProposals.length}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Project proposals →
          </p>
        </Link>
        <Link
          href="/deal-room/engagements"
          className="rounded-lg p-4 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
        >
          <p className="text-2xl font-semibold text-white">{myEngagements.length}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Active engagements →
          </p>
        </Link>
      </div>
    </section>
  );
}
