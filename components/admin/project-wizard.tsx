"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { strategicPillars, sdgs } from "@/lib/data/taxonomies";
import { validateRequiredFields, STATUS_LABELS } from "@/lib/governance/project-workflow";
import { PROJECT_FIRST_SAVE_REQUIRED_FIELDS } from "@/lib/governance/investor-proposal";
import { useDebouncedAutosave } from "@/lib/hooks/use-debounced-autosave";
import { ProjectWizardShell, type AutosaveStatus } from "@/components/projects/project-wizard-shell";
import { cn, slugify } from "@/lib/utils";
import {
  ProjectDocumentManager,
  uploadProjectDocument,
  type StagedProjectDocument,
} from "@/components/admin/project-document-manager";
import type { InvestmentProject, ProjectDocumentRecord, VisibilityLevel } from "@/lib/types";

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
  visibilityLevel: "public",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </label>
  );
}

interface ProjectWizardProps {
  /** Present when editing an existing project — absent for a fresh create. */
  initial?: InvestmentProject;
  /** The registry this wizard returns to on Back/Cancel/Save & Exit, e.g. "/admin/projects". */
  basePath: string;
  /** Team Ministry Traceability Batch, Phase 3 (item 8) — locks Primary Beneficiary Ministry to
   *  the ministry_admin's own ministry (the server force-overwrites this field for that role
   *  regardless, so locking it here is purely about not showing a control that would silently do
   *  nothing). */
  lockedMinistryId?: string;
}

/**
 * Government/Admin full-page project registration + editing wizard (Platform Feedback Batch v3,
 * Phase 5) — the ProjectForm-in-a-Dialog popup's replacement. Reuses exactly ProjectForm's field
 * set (no new fields), organized into the same 5-step shape as the investor "Propose a Project"
 * wizard, on the same ProjectWizardShell chrome (autosave, free step navigation). One component
 * handles both create (`/*.../projects/new`) and edit (`/*.../projects/[id]/edit`) — `initial`
 * being present is the only difference.
 */
export function ProjectWizard({ initial, basePath, lockedMinistryId }: ProjectWizardProps) {
  const router = useRouter();
  const { ministries, sectors } = useTaxonomyStore();
  const mode: "create" | "edit" = initial ? "edit" : "create";

  const [projectId, setProjectId] = useState<string | undefined>(initial?.id);
  const [form, setForm] = useState<Partial<InvestmentProject>>({
    ...emptyForm,
    ...initial,
    ...(lockedMinistryId ? { primaryBeneficiaryMinistryId: lockedMinistryId } : null),
  });
  const [scopeText, setScopeText] = useState((initial?.scope ?? []).join("\n"));
  const [impactText, setImpactText] = useState((initial?.developmentImpact ?? []).join("\n"));
  const [documents, setDocuments] = useState<ProjectDocumentRecord[]>(initial?.documentRecords ?? []);
  const [stagedDocs, setStagedDocs] = useState<StagedProjectDocument[]>([]);
  const [step, setStep] = useState(0);
  // In edit mode every step is already "reached" — a resumed/existing project has real data in
  // every step, unlike a brand-new create where progress is genuinely linear.
  const [furthestStep, setFurthestStep] = useState(mode === "edit" ? STEPS.length - 1 : 0);
  const [busy, setBusy] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [editReason, setEditReason] = useState("");
  const [showDocuments, setShowDocuments] = useState(mode === "edit" || Boolean(lockedMinistryId));

  const sectorSubsectors = sectors.find((s) => s.id === form.sectorId)?.subsectors ?? [];

  const update = (patch: Partial<InvestmentProject>) => setForm((f) => ({ ...f, ...patch }));

  const step0Valid = PROJECT_FIRST_SAVE_REQUIRED_FIELDS.every((field) => Boolean(form[field]));
  const editRequiresReason = Boolean(
    initial && (initial.projectStatus === "approved" || initial.projectStatus === "published")
  );

  const buildPayload = (): Partial<InvestmentProject> => ({
    ...form,
    slug: form.slug ?? slugify(form.title ?? ""),
    scope: scopeText.split("\n").map((s) => s.trim()).filter(Boolean),
    developmentImpact: impactText.split("\n").map((s) => s.trim()).filter(Boolean),
  });

  const { valid: submitValid, missing: submitMissing } = useMemo(
    () => validateRequiredFields(buildPayload()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, scopeText, impactText]
  );

  /** Flushes any documents picked before the project row existed (create mode, pre-first-save). */
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
   *  live id on success, or null on failure. `silent` (the autosave tick) swaps the error toast
   *  for the shell's "Autosave failed" indicator so a transient blip doesn't interrupt typing. */
  const persist = async (
    extra?: Partial<InvestmentProject> & { reason?: string },
    silent = false
  ): Promise<string | null> => {
    const payload: Partial<InvestmentProject> & { reason?: string } = { ...buildPayload(), ...extra };
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
          else toast.error(body.error ?? "Could not save this project.");
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
        else toast.error(body.error ?? "Could not save this project.");
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

  // Autosave (Phase 5) — mirrors ProposeProjectWizard's: silent, ~1.5s debounce, gated on step 0's
  // minimum-required fields being present so nothing half-formed is ever created on the very first
  // keystroke. Edit mode requiring a live-project reason still autosaves the rest of the fields;
  // the reason itself is only enforced on the explicit Save Changes/Save & Exit actions below.
  useDebouncedAutosave(
    () => {
      if (!busy) void persist(undefined, true);
    },
    [form, scopeText, impactText],
    1500,
    step0Valid
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
    if (editRequiresReason && !editReason.trim()) {
      toast.error("A reason is required to edit a live project.");
      return;
    }
    const id = await persist(editRequiresReason ? { reason: editReason.trim() } : undefined);
    if (!id) return;
    toast.success(mode === "create" ? "Draft saved — resume any time from the registry." : "Changes saved");
    router.push(basePath);
  };

  const handleSaveDraft = async () => {
    const id = await persist();
    if (!id) return;
    toast.success("Draft saved");
    router.push(basePath);
  };

  const handleSubmitForReview = async () => {
    if (!submitValid) {
      toast.error(`Complete required fields before submission: ${submitMissing.join(", ")}`);
      return;
    }
    const id = await persist({ projectStatus: "submitted_for_review" });
    if (!id) return;
    toast.success("Project submitted for review");
    router.push(basePath);
  };

  const handleSaveChanges = async () => {
    if (editRequiresReason && !editReason.trim()) {
      toast.error("A reason is required to edit a live project.");
      return;
    }
    const id = await persist(editRequiresReason ? { reason: editReason.trim() } : undefined);
    if (!id) return;
    toast.success("Project updated");
    router.push(basePath);
  };

  const banner = editRequiresReason && (
    <div
      className="mb-6 rounded-lg p-3"
      style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
    >
      <Label>
        Reason for change (required — this project is {initial!.projectStatus === "published" ? "published" : "approved"})
      </Label>
      <textarea
        value={editReason}
        onChange={(e) => setEditReason(e.target.value)}
        rows={2}
        placeholder="e.g. Corrected capital figure per updated feasibility study"
        className="dashboard-input w-full"
      />
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
      onBack={() => (step === 0 ? router.push(basePath) : setStep((s) => s - 1))}
      onSaveExit={handleSaveAndExit}
      saveExitLabel="Save & Exit"
      saveExitDisabled={step === 0 && !step0Valid}
      onNext={goNext}
      nextDisabled={step === 0 && !step0Valid}
      isLastStep={step === STEPS.length - 1}
      onSubmit={mode === "create" ? handleSubmitForReview : handleSaveChanges}
      submitLabel={mode === "create" ? "Submit for Review" : "Save Changes"}
      submitDisabled={mode === "create" ? !submitValid : false}
      extraFooterActions={
        mode === "create" && (
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={busy}
            className="btn-sovereign-ghost text-xs px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save as Draft
          </button>
        )
      }
      banner={banner}
    >
      {step === 0 && (
        <>
          <div>
            <Label>Primary Beneficiary Ministry *</Label>
            <select
              className="dashboard-input"
              value={form.primaryBeneficiaryMinistryId ?? ""}
              disabled={Boolean(lockedMinistryId)}
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
            {lockedMinistryId && (
              <p className="mt-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                Locked to your own ministry — Ministry Admins create projects on behalf of their designated ministry only.
              </p>
            )}
          </div>
          <div>
            <Label>Co-sponsoring Ministries (optional)</Label>
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
              Other ministries with a stake in this project — they&apos;ll see it in their own portfolio and receive
              notifications alongside the primary ministry.
            </p>
          </div>
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
                value={form.subsectorId ?? ""}
                onChange={(e) => update({ subsectorId: e.target.value || undefined })}
              >
                <option value="">None</option>
                {sectorSubsectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Project Owner *</Label>
              <input className="dashboard-input" value={form.projectOwner ?? ""} onChange={(e) => update({ projectOwner: e.target.value })} />
            </div>
            <div>
              <Label>Location *</Label>
              <input className="dashboard-input" value={form.location ?? ""} onChange={(e) => update({ location: e.target.value })} placeholder="e.g. Harare, Zimbabwe" />
            </div>
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
              <input className="dashboard-input" value={form.financingType ?? ""} onChange={(e) => update({ financingType: e.target.value })} placeholder="e.g. Equity, PPP, Debt" />
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Government-created projects capture E1 financials only. Detailed financial model and company
            capability fields (E2/E3) apply to investor-submitted proposals.
          </p>
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
            <textarea className="dashboard-input min-h-[96px]" rows={4} value={form.description ?? ""} onChange={(e) => update({ description: e.target.value })} />
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
            {lockedMinistryId
              ? "Attach feasibility studies, financial models, permits, or other supporting materials — each document can have its own visibility tier."
              : "Documents are hidden by default on ZIDA-created projects. You can add them now or after the project is published."}
          </p>
          {!showDocuments ? (
            <button
              type="button"
              className="btn-sovereign-ghost text-xs px-4 py-2 mb-3"
              onClick={() => setShowDocuments(true)}
            >
              Show document upload
            </button>
          ) : (
          <ProjectDocumentManager
            projectId={projectId}
            documents={documents}
            onDocumentsChange={setDocuments}
            staged={stagedDocs}
            onStagedChange={setStagedDocs}
          />
          )}
          <div>
            <Label>Visibility Level</Label>
            <select
              className="dashboard-input"
              value={form.visibilityLevel ?? "public"}
              onChange={(e) => update({ visibilityLevel: e.target.value as VisibilityLevel })}
            >
              <option value="public">Public</option>
              <option value="registered">Registered</option>
              <option value="qualified_investor">Qualified Investor</option>
              <option value="admin_only">Admin Only</option>
            </select>
          </div>
        </>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-white">Review before {mode === "create" ? "submitting" : "saving"}</p>
          <dl className="rounded-md p-3 space-y-2" style={{ border: "1px solid var(--color-sovereign-border)" }}>
            <SummaryRow label="Title" value={form.title || "—"} />
            <SummaryRow label="Sector" value={sectors.find((s) => s.id === form.sectorId)?.name ?? "—"} />
            <SummaryRow label="Subsector" value={sectorSubsectors.find((s) => s.id === form.subsectorId)?.name ?? "—"} />
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
            <SummaryRow label="Visibility" value={(form.visibilityLevel ?? "public").replace(/_/g, " ")} />
            <SummaryRow label="Documents" value={String(documents.length + stagedDocs.length)} />
            {mode === "edit" && initial && <SummaryRow label="Current Status" value={STATUS_LABELS[initial.projectStatus]} />}
          </dl>
          {!submitValid && (
            <p className="text-xs" style={{ color: "#f87171" }}>
              Missing required field(s): {submitMissing.join(", ")}
            </p>
          )}
          {/* Override/Amendment disclaimer (Platform Feedback Batch v4, Phase 8) — you and ZIDA
           *  keep direct edit authority on this project throughout the workflow, but once it's
           *  Approved/Published, a Government reviewer's own change request must go through the
           *  governed Amendment Request workflow (their Ministry Admin, then ZIDA Admin) rather
           *  than a direct edit — see the Review Queue's "Pending Requests" tab. */}
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Once this project is Approved or Published, you and ZIDA staff retain direct edit authority — but any change
            a Government reviewer requests must go through the governed Amendment Request workflow (their Ministry
            Admin, then ZIDA Admin) instead of a direct edit.
          </p>
        </div>
      )}
    </ProjectWizardShell>
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
