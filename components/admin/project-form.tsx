"use client";

import { useState } from "react";
import type { InvestmentProject, ProjectDocumentRecord, ProjectStatus, VisibilityLevel } from "@/lib/types";
import {
  sectors,
  subsectors,
  strategicPillars,
  sdgs,
} from "@/lib/data/taxonomies";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { validateRequiredFields } from "@/lib/governance/project-workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ProjectDocumentManager,
  uploadProjectDocument,
  type StagedProjectDocument,
} from "@/components/admin/project-document-manager";
import { slugify } from "@/lib/utils";
import { toast } from "sonner";

interface ProjectFormProps {
  initial?: Partial<InvestmentProject>;
  /** May resolve with the saved project (with a real id) — used in create mode to know when it's
   *  safe to flush any documents staged before the project row existed. */
  onSave: (project: Partial<InvestmentProject>) => void | Promise<InvestmentProject | void>;
  onSubmit?: (project: Partial<InvestmentProject>) => void | Promise<InvestmentProject | void>;
  mode?: "create" | "edit";
}

const emptyForm: Partial<InvestmentProject> = {
  title: "",
  sectorId: "",
  primaryBeneficiaryMinistryId: "",
  projectOwner: "",
  location: "",
  projectReadiness: "",
  opportunitySummary: "",
  description: "",
  scope: [],
  developmentImpact: [],
  documents: [],
  visibilityLevel: "public",
  projectStatus: "draft",
  dataVerificationStatus: "pending_review",
};

export function ProjectForm({ initial, onSave, onSubmit, mode = "create" }: ProjectFormProps) {
  const { ministries } = useTaxonomyStore();
  const [form, setForm] = useState<Partial<InvestmentProject>>({ ...emptyForm, ...initial });
  const [scopeText, setScopeText] = useState((initial?.scope ?? []).join("\n"));
  const [impactText, setImpactText] = useState((initial?.developmentImpact ?? []).join("\n"));
  const [documents, setDocuments] = useState<ProjectDocumentRecord[]>(initial?.documentRecords ?? []);
  const [stagedDocs, setStagedDocs] = useState<StagedProjectDocument[]>([]);

  const sectorSubsectors = subsectors.filter((s) => s.sectorId === form.sectorId);

  const buildProject = (): Partial<InvestmentProject> => {
    // documentRecords are managed live via their own upload/delete endpoints (see
    // ProjectDocumentManager) — never round-tripped through the project PATCH/POST body.
    const rest = { ...form };
    delete rest.documentRecords;
    return {
      ...rest,
      slug: form.slug ?? slugify(form.title ?? ""),
      scope: scopeText.split("\n").filter(Boolean),
      developmentImpact: impactText.split("\n").filter(Boolean),
    };
  };

  /** Uploads every staged file (create mode only — files picked before the project row existed)
   *  now that a real projectId is available, right after the initial POST /api/projects lands. */
  const flushStagedDocuments = async (projectId: string) => {
    if (stagedDocs.length === 0) return;
    let ok = 0;
    for (const s of stagedDocs) {
      try {
        await uploadProjectDocument(projectId, s.file, s.visibilityLevel);
        ok += 1;
      } catch {
        /* summarized below */
      }
    }
    setStagedDocs([]);
    if (ok < stagedDocs.length) toast.warning(`Uploaded ${ok} of ${stagedDocs.length} staged document(s)`);
  };

  const handleSave = async () => {
    const project = buildProject();
    const { valid, missing } = validateRequiredFields(project);
    if (!valid && mode === "create") {
      toast.error(`Missing required fields: ${missing.join(", ")}`);
      return;
    }
    const result = await onSave(project);
    if (mode === "create") toast.success("Draft saved");
    if (mode === "create" && result?.id) await flushStagedDocuments(result.id);
  };

  const handleSubmit = async () => {
    const project = buildProject();
    const { valid, missing } = validateRequiredFields(project);
    if (!valid) {
      toast.error(`Complete required fields before submission: ${missing.join(", ")}`);
      return;
    }
    const result = await onSubmit?.(project);
    if (mode === "create" && result?.id) await flushStagedDocuments(result.id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{mode === "create" ? "New Project" : "Edit Project"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identity &amp; Classification</p>
        <div>
          <Label>Title *</Label>
          <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Sector *</Label>
            <Select value={form.sectorId ?? ""} onValueChange={(v) => setForm({ ...form, sectorId: v, subsectorId: undefined })}>
              <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
              <SelectContent>
                {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subsector</Label>
            <Select value={form.subsectorId ?? "none"} onValueChange={(v) => setForm({ ...form, subsectorId: v === "none" ? undefined : v })}>
              <SelectTrigger><SelectValue placeholder="Select subsector" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {sectorSubsectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-t">Impact &amp; Alignment</p>
        <div>
          <Label>Strategic Pillars</Label>
          <div className="grid gap-2 sm:grid-cols-2 mt-1 max-h-40 overflow-y-auto border rounded-md p-2">
            {strategicPillars.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.strategicPillarIds?.includes(p.id) ?? false}
                  onChange={(e) => {
                    const ids = form.strategicPillarIds ?? [];
                    setForm({
                      ...form,
                      strategicPillarIds: e.target.checked
                        ? [...ids, p.id]
                        : ids.filter((id) => id !== p.id),
                    });
                  }}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>SDG Alignment</Label>
          <div className="grid gap-2 sm:grid-cols-2 mt-1">
            {sdgs.map((s) => {
              const selected = form.sdgIds?.includes(s.id) ?? false;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    const ids = form.sdgIds ?? [];
                    setForm({
                      ...form,
                      sdgIds: selected ? ids.filter((id) => id !== s.id) : [...ids, s.id],
                    });
                  }}
                  className={`flex items-center gap-2.5 rounded-lg border p-2 text-left transition ${
                    selected ? "border-zim-green-600 ring-1 ring-zim-green-600/40" : "border-input hover:border-muted-foreground/40"
                  }`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                    style={{ backgroundColor: s.colorToken }}
                  >
                    {s.number}
                  </span>
                  <span className="min-w-0 flex-1 text-xs font-medium leading-tight truncate" title={s.name}>
                    {s.name}
                  </span>
                  {selected && <span className="text-zim-green-600 text-xs font-semibold">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-t">Location &amp; Ministry</p>
        <div>
          <Label>Primary Beneficiary Ministry *</Label>
          <Select
            value={form.primaryBeneficiaryMinistryId ?? ""}
            onValueChange={(v) =>
              setForm({
                ...form,
                primaryBeneficiaryMinistryId: v,
                // A ministry can't co-sponsor its own project — drop it from the secondary list
                // the moment it becomes the primary.
                secondaryBeneficiaryMinistryIds: form.secondaryBeneficiaryMinistryIds?.filter((id) => id !== v),
              })
            }
          >
            <SelectTrigger><SelectValue placeholder="Select ministry" /></SelectTrigger>
            <SelectContent>
              {ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.shortName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Co-sponsoring Ministries (optional)</Label>
          <p className="mb-1 text-xs text-muted-foreground">
            Other ministries with a stake in this project — they&apos;ll see it in their own portfolio and receive notifications alongside the primary ministry.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 mt-1 max-h-40 overflow-y-auto border rounded-md p-2">
            {ministries
              .filter((m) => m.id !== form.primaryBeneficiaryMinistryId)
              .map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.secondaryBeneficiaryMinistryIds?.includes(m.id) ?? false}
                    onChange={(e) => {
                      const ids = form.secondaryBeneficiaryMinistryIds ?? [];
                      setForm({
                        ...form,
                        secondaryBeneficiaryMinistryIds: e.target.checked ? [...ids, m.id] : ids.filter((id) => id !== m.id),
                      });
                    }}
                  />
                  {m.shortName}
                </label>
              ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Project Owner *</Label>
            <Input value={form.projectOwner ?? ""} onChange={(e) => setForm({ ...form, projectOwner: e.target.value })} />
          </div>
          <div>
            <Label>Location *</Label>
            <Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
        </div>
        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-t">Financial Model</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Capital Required</Label>
            <Input value={form.capitalRequired ?? ""} onChange={(e) => setForm({ ...form, capitalRequired: e.target.value })} placeholder="e.g. US$15 million" />
            <p className="mt-1 text-xs text-muted-foreground">Include units (million/billion) — avoid bare numbers; they can&apos;t be scaled correctly downstream.</p>
          </div>
          <div>
            <Label>Financing Type</Label>
            <Input value={form.financingType ?? ""} onChange={(e) => setForm({ ...form, financingType: e.target.value })} />
          </div>
        </div>
        <div className="rounded-lg border border-dashed p-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Financial Indicators
            <span className="ml-2 font-normal normal-case">(Qualified-investor only — masked from public/registered viewers)</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>IRR</Label>
              <Input value={form.irr ?? ""} onChange={(e) => setForm({ ...form, irr: e.target.value })} placeholder="e.g. 18%" />
            </div>
            <div>
              <Label>NPV</Label>
              <Input value={form.npv ?? ""} onChange={(e) => setForm({ ...form, npv: e.target.value })} placeholder="e.g. $12.4M" />
            </div>
            <div>
              <Label>ROI</Label>
              <Input value={form.roi ?? ""} onChange={(e) => setForm({ ...form, roi: e.target.value })} placeholder="e.g. 2.3x" />
            </div>
            <div>
              <Label>Payback Period</Label>
              <Input value={form.paybackPeriod ?? ""} onChange={(e) => setForm({ ...form, paybackPeriod: e.target.value })} placeholder="e.g. 5 years" />
            </div>
          </div>
          <div>
            <Label>Projected Revenue</Label>
            <Input value={form.projectedRevenue ?? ""} onChange={(e) => setForm({ ...form, projectedRevenue: e.target.value })} placeholder="e.g. $8M / year at steady state" />
          </div>
        </div>
        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-t">Narrative &amp; Scope</p>
        <div>
          <Label>Readiness Level *</Label>
          <Input value={form.projectReadiness ?? ""} onChange={(e) => setForm({ ...form, projectReadiness: e.target.value })} />
        </div>
        <div>
          <Label>Opportunity Summary *</Label>
          <Textarea value={form.opportunitySummary ?? ""} onChange={(e) => setForm({ ...form, opportunitySummary: e.target.value })} rows={2} />
        </div>
        <div>
          <Label>Description *</Label>
          <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        </div>
        <div>
          <Label>Scope (one item per line)</Label>
          <Textarea value={scopeText} onChange={(e) => setScopeText(e.target.value)} rows={3} />
        </div>
        <div>
          <Label>Development Impact (one item per line)</Label>
          <Textarea value={impactText} onChange={(e) => setImpactText(e.target.value)} rows={2} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Direct Jobs Projected</Label>
            <Input
              type="number"
              min={0}
              value={form.jobsDirect ?? ""}
              onChange={(e) => setForm({ ...form, jobsDirect: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="e.g. 120"
            />
          </div>
          <div>
            <Label>Indirect Jobs Projected</Label>
            <Input
              type="number"
              min={0}
              value={form.jobsIndirect ?? ""}
              onChange={(e) => setForm({ ...form, jobsIndirect: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="e.g. 300"
            />
          </div>
        </div>
        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-t">Documents &amp; Visibility</p>
        <div>
          <Label>Project Documents</Label>
          <p className="text-xs text-muted-foreground mb-1.5">
            Real uploaded files (R2-backed) — each can have its own visibility tier. Gated on download by the
            viewer&apos;s role (and NDA acceptance for Qualified Investor tier).
          </p>
          <ProjectDocumentManager
            projectId={initial?.id}
            documents={documents}
            onDocumentsChange={setDocuments}
            staged={stagedDocs}
            onStagedChange={setStagedDocs}
          />
        </div>
        <div>
          <Label>Visibility Level</Label>
          <Select value={form.visibilityLevel ?? "public"} onValueChange={(v) => setForm({ ...form, visibilityLevel: v as VisibilityLevel })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="qualified_investor">Qualified Investor</SelectItem>
              <SelectItem value="admin_only">Admin Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {mode === "edit" ? (
            <Button type="button" onClick={handleSave}>Save Changes</Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={handleSave}>Save Draft</Button>
              {onSubmit && (
                <Button type="button" onClick={handleSubmit}>Submit for Review</Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ReviewActions({
  project,
  onAction,
}: {
  project: InvestmentProject;
  onAction: (status: ProjectStatus, notes?: string) => void;
}) {
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <Label>Reviewer Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Required when requesting changes" />
      </div>
      <div className="flex flex-wrap gap-2">
        {project.projectStatus === "submitted_for_review" && (
          <Button size="sm" onClick={() => onAction("under_review")}>Start Review</Button>
        )}
        {["under_review", "submitted_for_review"].includes(project.projectStatus) && (
          <>
            <Button size="sm" variant="default" onClick={() => onAction("approved")}>Approve</Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (!notes) { toast.error("Reviewer notes required"); return; }
                onAction("changes_requested", notes);
              }}
            >
              Request Changes
            </Button>
          </>
        )}
        {project.projectStatus === "approved" && (
          <Button size="sm" variant="gold" onClick={() => onAction("published")}>Publish</Button>
        )}
        <Button size="sm" variant="destructive" onClick={() => onAction("archived")}>Archive</Button>
      </div>
    </div>
  );
}
