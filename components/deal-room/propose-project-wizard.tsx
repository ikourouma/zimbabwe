"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserSquare2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { strategicPillars, sdgs } from "@/lib/data/taxonomies";
import { validateRequiredFields, STATUS_LABELS } from "@/lib/governance/project-workflow";
import { INVESTOR_FIRST_SAVE_REQUIRED_FIELDS } from "@/lib/governance/investor-proposal";
import { useDebouncedAutosave } from "@/lib/hooks/use-debounced-autosave";
import { ProjectWizardShell, type AutosaveStatus } from "@/components/projects/project-wizard-shell";
import { cn } from "@/lib/utils";
import {
  ProjectDocumentManager,
  uploadProjectDocument,
  type StagedProjectDocument,
} from "@/components/admin/project-document-manager";
import { RequestAmendmentForm } from "@/components/deal-room/request-amendment-form";
import { MessageThread } from "@/components/deal-room/message-thread";
import type { InvestmentProject, ProjectDocumentRecord } from "@/lib/types";

const STEPS = ["Basics & Identity", "Financials & Impact", "Narrative & Taxonomy", "Supporting Documents", "Review & Submit"];

const emptyForm: Partial<InvestmentProject> = {
  title: "",
  sectorId: "",
  primaryBeneficiaryMinistryId: "",
  secondaryBeneficiaryMinistryIds: [],
  projectOwner: "",
  location: "",
  projectReadiness: "",
  opportunitySummary: "",
  description: "",
  scope: [],
  developmentImpact: [],
  strategicPillarIds: [],
  sdgIds: [],
  documents: [],
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </label>
  );
}

interface ProposeProjectWizardProps {
  /** Present when resuming an existing draft/changes_requested proposal. */
  initial?: InvestmentProject;
}

/**
 * "Propose a Project" — the qualified investor self-authoring lifecycle (Investor Dashboard
 * Expansion plan, Phase 4). Mirrors the save-and-continue-later pattern of EngagementWizard
 * (strategic-partnerships) but against the real `projects` table via POST/PATCH
 * /api/projects[/:id] rather than the inquiry-draft endpoint — the first "Continue" from step 0
 * creates the row (draft, admin_only, investorSubmitted: true), every later "Continue" PATCHes it,
 * and the final step's "Submit for Review" is the one call that flips projectStatus and locks
 * further direct edits (see the ownership+stage gate in PATCH /api/projects/[id]).
 */
export function ProposeProjectWizard({ initial }: ProposeProjectWizardProps) {
  const router = useRouter();
  const auth = useAuth();
  const { userId } = auth;
  const { ministries, sectors } = useTaxonomyStore();

  const [projectId, setProjectId] = useState<string | undefined>(initial?.id);
  const [form, setForm] = useState<Partial<InvestmentProject>>({ ...emptyForm, ...initial });
  const [scopeText, setScopeText] = useState((initial?.scope ?? []).join("\n"));
  const [impactText, setImpactText] = useState((initial?.developmentImpact ?? []).join("\n"));
  const [documents, setDocuments] = useState<ProjectDocumentRecord[]>(initial?.documentRecords ?? []);
  const [stagedDocs, setStagedDocs] = useState<StagedProjectDocument[]>([]);
  const [step, setStep] = useState(0);
  // Free navigation (Phase 5) — tracks the highest step reached so far so the stepper can let the
  // user jump back to any already-visited step, not just the one immediately before the current.
  const [furthestStep, setFurthestStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [certified, setCertified] = useState(false);
  // "Other (not listed)" subsector (item 7) — a sentinel local UI mode, not a form field; the
  // free-text name only ever travels to the server as `subsectorOther` on save (see buildPayload).
  const [otherSubsectorMode, setOtherSubsectorMode] = useState(false);
  const [otherSubsectorText, setOtherSubsectorText] = useState("");

  const sectorSubsectors = (sectors.find((s) => s.id === form.sectorId)?.subsectors ?? []).filter(
    (s) => s.status === "active"
  );

  const update = (patch: Partial<InvestmentProject>) => setForm((f) => ({ ...f, ...patch }));

  // Project Owner/Sponsor is now a read-only identity field driven entirely by the investor's own
  // My Profile company name — it isn't meant to vary per-proposal (item 6). Kept in sync even on a
  // resumed draft, since it's derived, not stored state.
  useEffect(() => {
    if (auth.organization) update({ projectOwner: auth.organization });
  }, [auth.organization]);

  // Location prefills from the company's HQ/registered address once (item 12) — but stays fully
  // editable afterward, since a project's physical site often differs from the investor's office.
  useEffect(() => {
    if (!initial && !form.location && auth.hqAddress) update({ location: auth.hqAddress });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.hqAddress]);

  const buildPayload = (): Partial<InvestmentProject> => ({
    ...form,
    scope: scopeText.split("\n").map((s) => s.trim()).filter(Boolean),
    developmentImpact: impactText.split("\n").map((s) => s.trim()).filter(Boolean),
    ...(otherSubsectorMode ? { subsectorOther: otherSubsectorText, subsectorId: undefined } : {}),
  });

  const step0Valid = INVESTOR_FIRST_SAVE_REQUIRED_FIELDS.every((field) => Boolean(form[field]));
  const isOwnedByMe = !initial || initial.createdBy === userId;
  const isLocked = Boolean(initial && !["draft", "changes_requested"].includes(initial.projectStatus));

  const { valid: submitValid, missing: submitMissing } = useMemo(
    () => validateRequiredFields(buildPayload()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, scopeText, impactText]
  );

  /** Flushes any documents picked before the project row existed (step 0/1/2, pre-first-save). */
  const flushStagedDocuments = async (id: string) => {
    if (stagedDocs.length === 0) return;
    let ok = 0;
    for (const s of stagedDocs) {
      try {
        const created = await uploadProjectDocument(id, s.file, s.visibilityLevel);
        setDocuments((prev) => [...prev, created]);
        ok += 1;
      } catch {
        /* summarized below */
      }
    }
    setStagedDocs([]);
    if (ok < stagedDocs.length) toast.warning(`Uploaded ${ok} of ${stagedDocs.length} staged document(s)`);
  };

  /** Creates (first save) or updates (every later save) the underlying project row. Returns the
   *  live id on success, or null on failure. `silent` (used by the autosave tick below) swaps the
   *  error toast for the shell's "Autosave failed" indicator instead, so a transient blip while
   *  the user is still typing doesn't interrupt them with a toast every 1.5s. */
  const persist = async (extra?: Partial<InvestmentProject>, silent = false): Promise<string | null> => {
    const payload = { ...buildPayload(), ...extra };
    setBusy(true);
    if (silent) setAutosaveStatus("saving");
    try {
      if (!projectId) {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (silent) setAutosaveStatus("error");
          else toast.error(body.error ?? "Could not save your proposal.");
          return null;
        }
        const created = (await res.json()) as InvestmentProject;
        setProjectId(created.id);
        await flushStagedDocuments(created.id);
        if (silent) setAutosaveStatus("saved");
        return created.id;
      }
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (silent) setAutosaveStatus("error");
        else toast.error(body.error ?? "Could not save your proposal.");
        return null;
      }
      if (silent) setAutosaveStatus("saved");
      return projectId;
    } catch {
      if (silent) setAutosaveStatus("error");
      else toast.error("A network error occurred — please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  // Autosave (Phase 5) — fires ~1.5s after the last change to any step-0-through-3 field, once
  // step 0's minimum-required fields are in (nothing safe to persist before that — see
  // step0Valid). Silent by design: no toast on every tick, just the shell's inline indicator.
  // Skipped entirely once the proposal is locked/read-only or mid an explicit user-triggered save.
  useDebouncedAutosave(
    () => {
      if (!busy) void persist(undefined, true);
    },
    [form, scopeText, impactText, otherSubsectorMode, otherSubsectorText],
    1500,
    step0Valid && !isLocked
  );

  const goToStep = (index: number) => {
    if (index <= furthestStep) setStep(index);
  };

  const goNext = async () => {
    const id = await persist();
    if (!id) return;
    setStep((s) => {
      const next = Math.min(STEPS.length - 1, s + 1);
      setFurthestStep((f) => Math.max(f, next));
      return next;
    });
  };

  const handleSaveAndExit = async () => {
    const id = await persist();
    if (!id) return;
    toast.success("Draft saved — resume any time from My Proposals.");
    router.push("/deal-room/proposals");
  };

  const handleSubmit = async () => {
    if (!submitValid) {
      toast.error(`Complete required fields before submission: ${submitMissing.join(", ")}`);
      return;
    }
    if (!certified) {
      toast.error("Please certify the accuracy of this proposal before submitting.");
      return;
    }
    const id = await persist({ projectStatus: "submitted_for_review" });
    if (!id) return;
    toast.success("Proposal submitted for ZIDA review.");
    router.push("/deal-room/proposals");
  };

  if (initial && !isOwnedByMe) {
    return (
      <div className="dashboard-panel p-6 text-center">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          You do not have permission to edit this proposal.
        </p>
      </div>
    );
  }

  if (isLocked) {
    const canRequestAmendment = initial!.projectStatus === "approved" || initial!.projectStatus === "published";
    return (
      <div className="space-y-4">
        <div className="dashboard-panel p-6 text-center">
          <p className="text-sm text-white mb-1">
            This proposal is <strong>{STATUS_LABELS[initial!.projectStatus]}</strong> and is locked for direct edits.
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {canRequestAmendment
              ? "Need to change something? File an Amendment Request below — ZIDA will review and apply approved changes."
              : "It's currently in ZIDA's review queue. You'll be notified of any decision."}
          </p>
        </div>
        {canRequestAmendment && <RequestAmendmentForm project={initial!} />}
        <div className="dashboard-panel p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Correspondence with ZIDA</h2>
          <MessageThread
            projectId={initial!.id}
            isStaff={false}
            emptyMessage="No messages yet on this proposal."
          />
        </div>
      </div>
    );
  }

  const banner = initial?.projectStatus === "changes_requested" && initial.reviewerNotes && (
    <div
      className="mb-6 rounded-lg p-4"
      style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#fbbf24" }}>
        Changes Requested by ZIDA
      </p>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{initial.reviewerNotes}</p>
    </div>
  );

  return (
    <ProjectWizardShell
      steps={STEPS.map((label) => ({ label }))}
      step={step}
      furthestStep={furthestStep}
      onStepSelect={goToStep}
      autosaveStatus={autosaveStatus}
      busy={busy}
      onBack={() => (step === 0 ? router.push("/deal-room/proposals") : setStep((s) => s - 1))}
      onSaveExit={handleSaveAndExit}
      saveExitDisabled={step === 0 && !step0Valid}
      onNext={goNext}
      nextDisabled={step === 0 && !step0Valid}
      isLastStep={step === STEPS.length - 1}
      onSubmit={handleSubmit}
      submitLabel="Submit for Review"
      submitDisabled={!certified}
      banner={banner}
    >
        {step === 0 && (
          <>
            <div>
              <Label>Project Title *</Label>
              <input className="dashboard-input" value={form.title ?? ""} onChange={(e) => update({ title: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Sector *</Label>
                <select
                  className="dashboard-input"
                  value={form.sectorId ?? ""}
                  onChange={(e) => update({ sectorId: e.target.value, subsectorId: undefined })}
                >
                  <option value="">Select sector</option>
                  {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Subsector</Label>
                <select
                  className="dashboard-input"
                  value={otherSubsectorMode ? "__other__" : form.subsectorId ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "__other__") {
                      setOtherSubsectorMode(true);
                      update({ subsectorId: undefined });
                    } else {
                      setOtherSubsectorMode(false);
                      update({ subsectorId: e.target.value || undefined });
                    }
                  }}
                >
                  <option value="">None</option>
                  {sectorSubsectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  <option value="__other__">Other (not listed)</option>
                </select>
                {otherSubsectorMode && (
                  <input
                    className="dashboard-input mt-2"
                    value={otherSubsectorText}
                    onChange={(e) => setOtherSubsectorText(e.target.value)}
                    placeholder="Name your subsector — ZIDA will review and add it to the taxonomy"
                    autoFocus
                  />
                )}
              </div>
            </div>
            <div>
              <Label>Primary Beneficiary Ministry *</Label>
              <select
                className="dashboard-input"
                value={form.primaryBeneficiaryMinistryId ?? ""}
                onChange={(e) =>
                  update({
                    primaryBeneficiaryMinistryId: e.target.value,
                    secondaryBeneficiaryMinistryIds: form.secondaryBeneficiaryMinistryIds?.filter((id) => id !== e.target.value),
                  })
                }
              >
                <option value="">Select ministry</option>
                {ministries.map((m) => <option key={m.id} value={m.id}>{m.shortName}</option>)}
              </select>
              <p className="mt-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                The ministry with primary oversight of this sector/initiative.
              </p>
            </div>
            <div>
              <Label>Secondary Beneficiary Ministry (optional)</Label>
              <div className="grid gap-2 sm:grid-cols-2 mt-1 max-h-32 overflow-y-auto rounded-md p-2" style={{ border: "1px solid var(--color-sovereign-border)" }}>
                {ministries
                  .filter((m) => m.id !== form.primaryBeneficiaryMinistryId)
                  .map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      <input
                        type="checkbox"
                        checked={form.secondaryBeneficiaryMinistryIds?.includes(m.id) ?? false}
                        onChange={(e) => {
                          const ids = form.secondaryBeneficiaryMinistryIds ?? [];
                          update({
                            secondaryBeneficiaryMinistryIds: e.target.checked ? [...ids, m.id] : ids.filter((id) => id !== m.id),
                          });
                        }}
                      />
                      {m.shortName}
                    </label>
                  ))}
              </div>
              <p className="mt-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                Any additional ministries co-sponsoring or affected by this initiative — ZIDA may also add these during assessment.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyIdentityField label="Project Owner / Sponsor" value={form.projectOwner || "—"} />
              <ReadOnlyIdentityField
                label="Authorized Representative"
                value={
                  [auth.executiveRepresentativeName, auth.executiveRepresentativeTitle].filter(Boolean).join(" — ") || "Not set"
                }
              />
            </div>
            <p className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
              <UserSquare2 className="h-3 w-3" /> These identity fields come from your company profile and don&apos;t vary
              per proposal.{" "}
              <Link href="/deal-room/profile" className="underline" style={{ color: "var(--color-gold)" }}>
                Edit in My Profile
              </Link>
            </p>
            <div>
              <Label>Location *</Label>
              <input
                className="dashboard-input"
                value={form.location ?? ""}
                onChange={(e) => update({ location: e.target.value })}
                placeholder="e.g. Harare, Zimbabwe"
              />
              <p className="mt-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                Prefilled from your company&apos;s registered address — edit if the project site differs.
              </p>
            </div>
            <div>
              <Label>Readiness Level *</Label>
              <input
                className="dashboard-input"
                value={form.projectReadiness ?? ""}
                onChange={(e) => update({ projectReadiness: e.target.value })}
                placeholder="e.g. Feasibility study complete"
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Capital Required</Label>
                <input
                  className="dashboard-input"
                  value={form.capitalRequired ?? ""}
                  onChange={(e) => update({ capitalRequired: e.target.value })}
                  placeholder="e.g. US$15 million"
                />
              </div>
              <div>
                <Label>Financing Type</Label>
                <input
                  className="dashboard-input"
                  value={form.financingType ?? ""}
                  onChange={(e) => update({ financingType: e.target.value })}
                  placeholder="e.g. Equity, PPP, Debt"
                />
              </div>
            </div>
            <div>
              <Label>Development Impact (one item per line)</Label>
              <textarea
                className="dashboard-input min-h-[88px]"
                rows={3}
                value={impactText}
                onChange={(e) => setImpactText(e.target.value)}
                placeholder="e.g. 300 direct jobs in the first 3 years"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Direct Jobs Projected</Label>
                <input
                  type="number"
                  min={0}
                  className="dashboard-input"
                  value={form.jobsDirect ?? ""}
                  onChange={(e) => update({ jobsDirect: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Indirect Jobs Projected</Label>
                <input
                  type="number"
                  min={0}
                  className="dashboard-input"
                  value={form.jobsIndirect ?? ""}
                  onChange={(e) => update({ jobsIndirect: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="rounded-lg p-3 space-y-3" style={{ border: "1px dashed var(--color-sovereign-border)" }}>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                E2 — Detailed Financial Model
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>IRR</Label>
                  <input className="dashboard-input" value={form.irr ?? ""} onChange={(e) => update({ irr: e.target.value })} placeholder="e.g. 18%" />
                </div>
                <div>
                  <Label>NPV</Label>
                  <input className="dashboard-input" value={form.npv ?? ""} onChange={(e) => update({ npv: e.target.value })} placeholder="e.g. $12.4M" />
                </div>
                <div>
                  <Label>ROI</Label>
                  <input className="dashboard-input" value={form.roi ?? ""} onChange={(e) => update({ roi: e.target.value })} placeholder="e.g. 2.3x" />
                </div>
                <div>
                  <Label>Payback Period</Label>
                  <input className="dashboard-input" value={form.paybackPeriod ?? ""} onChange={(e) => update({ paybackPeriod: e.target.value })} placeholder="e.g. 5 years" />
                </div>
              </div>
              <div>
                <Label>Projected Revenue</Label>
                <input className="dashboard-input" value={form.projectedRevenue ?? ""} onChange={(e) => update({ projectedRevenue: e.target.value })} placeholder="e.g. $8M / year at steady state" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Investment Source</Label>
                  <input className="dashboard-input" value={form.investmentSource ?? ""} onChange={(e) => update({ investmentSource: e.target.value })} placeholder="e.g. Sponsor equity, DFI, commercial bank" />
                </div>
                <div>
                  <Label>Capital Structure</Label>
                  <input className="dashboard-input" value={form.capitalStructure ?? ""} onChange={(e) => update({ capitalStructure: e.target.value })} placeholder="e.g. 40% equity / 60% debt" />
                </div>
              </div>
              <div>
                <Label>Shareholder Contribution</Label>
                <input className="dashboard-input" value={form.shareholderContribution ?? ""} onChange={(e) => update({ shareholderContribution: e.target.value })} placeholder="e.g. US$6 million sponsor equity" />
              </div>
            </div>
            <div className="rounded-lg p-3 space-y-3" style={{ border: "1px dashed var(--color-sovereign-border)" }}>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                E3 — Company Financing Capability
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Years of Sector Experience</Label>
                  <input className="dashboard-input" value={form.sectorExperienceYears ?? ""} onChange={(e) => update({ sectorExperienceYears: e.target.value })} placeholder="e.g. 12" />
                </div>
                <div>
                  <Label>Prior Projects Completed</Label>
                  <input className="dashboard-input" value={form.priorProjectsCompleted ?? ""} onChange={(e) => update({ priorProjectsCompleted: e.target.value })} placeholder="e.g. 4 comparable plants" />
                </div>
              </div>
              <div>
                <Label>Company Annual Turnover (last 3 years)</Label>
                <input className="dashboard-input" value={form.annualTurnover ?? ""} onChange={(e) => update({ annualTurnover: e.target.value })} placeholder="e.g. 2023: $40M; 2024: $48M; 2025: $52M" />
              </div>
              <div>
                <Label>Source of Financing Confirmation</Label>
                <input className="dashboard-input" value={form.financingConfirmation ?? ""} onChange={(e) => update({ financingConfirmation: e.target.value })} placeholder="e.g. Board-approved term sheet dated…" />
              </div>
              <div>
                <Label>Financing / Co-Investment Partners</Label>
                <input className="dashboard-input" value={form.financingPartners ?? ""} onChange={(e) => update({ financingPartners: e.target.value })} placeholder="e.g. Local pension fund, regional DFI" />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <Label>Opportunity Summary *</Label>
              <textarea
                className="dashboard-input min-h-[64px]"
                rows={2}
                value={form.opportunitySummary ?? ""}
                onChange={(e) => update({ opportunitySummary: e.target.value })}
                placeholder="A one- to two-sentence pitch for investors browsing the registry"
              />
            </div>
            <div>
              <Label>Full Description *</Label>
              <textarea
                className="dashboard-input min-h-[96px]"
                rows={4}
                value={form.description ?? ""}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>
            <div>
              <Label>Scope (one item per line)</Label>
              <textarea className="dashboard-input min-h-[72px]" rows={3} value={scopeText} onChange={(e) => setScopeText(e.target.value)} />
            </div>
            <div>
              <Label>Strategic Pillars</Label>
              <div className="grid gap-2 sm:grid-cols-2 mt-1 max-h-36 overflow-y-auto rounded-md p-2" style={{ border: "1px solid var(--color-sovereign-border)" }}>
                {strategicPillars.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    <input
                      type="checkbox"
                      checked={form.strategicPillarIds?.includes(p.id) ?? false}
                      onChange={(e) => {
                        const ids = form.strategicPillarIds ?? [];
                        update({ strategicPillarIds: e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id) });
                      }}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>SDG Alignment</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {sdgs.map((s) => {
                  const selected = form.sdgIds?.includes(s.id) ?? false;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => {
                        const ids = form.sdgIds ?? [];
                        update({ sdgIds: selected ? ids.filter((id) => id !== s.id) : [...ids, s.id] });
                      }}
                      title={s.name}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-white transition",
                        selected ? "ring-2 ring-[var(--color-gold)]" : "opacity-60 hover:opacity-100"
                      )}
                      style={{ backgroundColor: s.colorToken }}
                    >
                      {s.number}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Attach feasibility studies, financial models, permits, or other supporting materials. These stay
              private (Admin Only) until ZIDA reviews and approves your proposal.
            </p>
            <ProjectDocumentManager
              projectId={projectId}
              documents={documents}
              onDocumentsChange={setDocuments}
              staged={stagedDocs}
              onStagedChange={setStagedDocs}
            />
          </>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-white">Review before submitting</p>
            <dl className="rounded-md p-3 space-y-2" style={{ border: "1px solid var(--color-sovereign-border)" }}>
              <SummaryRow label="Title" value={form.title || "—"} />
              <SummaryRow label="Sector" value={sectors.find((s) => s.id === form.sectorId)?.name ?? "—"} />
              <SummaryRow
                label="Subsector"
                value={
                  otherSubsectorMode
                    ? `${otherSubsectorText || "—"} (new — pending ZIDA review)`
                    : sectorSubsectors.find((s) => s.id === form.subsectorId)?.name ?? "—"
                }
              />
              <SummaryRow label="Primary Ministry" value={ministries.find((m) => m.id === form.primaryBeneficiaryMinistryId)?.shortName ?? "—"} />
              <SummaryRow
                label="Secondary Ministries"
                value={
                  (form.secondaryBeneficiaryMinistryIds ?? [])
                    .map((id) => ministries.find((m) => m.id === id)?.shortName)
                    .filter(Boolean)
                    .join(", ") || "None"
                }
              />
              <SummaryRow label="Project Owner" value={form.projectOwner || "—"} />
              <SummaryRow label="Location" value={form.location || "—"} />
              <SummaryRow label="Capital Required" value={form.capitalRequired || "—"} />
              <SummaryRow label="IRR / NPV / ROI" value={[form.irr, form.npv, form.roi].filter(Boolean).join(" · ") || "—"} />
              <SummaryRow label="Capital Structure" value={form.capitalStructure || "—"} />
              <SummaryRow label="Sector Experience" value={form.sectorExperienceYears || "—"} />
              <SummaryRow label="Documents" value={String(documents.length + stagedDocs.length)} />
            </dl>
            {!submitValid && (
              <p className="text-xs" style={{ color: "#f87171" }}>
                Missing required field(s) before you can submit: {submitMissing.join(", ")}
              </p>
            )}
            {/* Override/Amendment disclaimer (Platform Feedback Batch v4, Phase 8) — same lock
             *  rule the admin/ministry ProjectWizard surfaces on its Review step: once Approved
             *  or Published, further field changes go through a governed Amendment Request
             *  (ZIDA Admin for an investor-filed card; Ministry Admin then ZIDA for a
             *  government-filed one) rather than a direct edit. */}
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Once this proposal is Approved or Published, it is locked for direct edits. Further changes require a
              governed Amendment Request that ZIDA Admin reviews and applies if approved.
            </p>
            <label className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <input type="checkbox" className="mt-0.5" checked={certified} onChange={(e) => setCertified(e.target.checked)} />
              <span>
                I certify that this information is accurate and that I am authorized to submit it on behalf of{" "}
                {form.projectOwner || "my organization"}. I understand that submitting locks this proposal for
                direct edits — further changes require a staff-adjudicated Amendment Request.
              </span>
            </label>
          </div>
        )}
    </ProjectWizardShell>
  );
}

function ReadOnlyIdentityField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div
        className="dashboard-input flex items-center opacity-80 cursor-not-allowed"
        style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-40 shrink-0 text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </dt>
      <dd className="text-white break-words">{value}</dd>
    </div>
  );
}
