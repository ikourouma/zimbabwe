"use client";

import { useState } from "react";
import type { InvestmentProject, ProjectStatus, VisibilityLevel } from "@/lib/types";
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
import { slugify } from "@/lib/utils";
import { toast } from "sonner";

interface ProjectFormProps {
  initial?: Partial<InvestmentProject>;
  onSave: (project: Partial<InvestmentProject>) => void;
  onSubmit?: (project: Partial<InvestmentProject>) => void;
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

  const sectorSubsectors = subsectors.filter((s) => s.sectorId === form.sectorId);

  const buildProject = (): Partial<InvestmentProject> => ({
    ...form,
    slug: form.slug ?? slugify(form.title ?? ""),
    scope: scopeText.split("\n").filter(Boolean),
    developmentImpact: impactText.split("\n").filter(Boolean),
  });

  const handleSave = () => {
    const project = buildProject();
    const { valid, missing } = validateRequiredFields(project);
    if (!valid && mode === "create") {
      toast.error(`Missing required fields: ${missing.join(", ")}`);
      return;
    }
    onSave(project);
    toast.success("Draft saved");
  };

  const handleSubmit = () => {
    const project = buildProject();
    const { valid, missing } = validateRequiredFields(project);
    if (!valid) {
      toast.error(`Complete required fields before submission: ${missing.join(", ")}`);
      return;
    }
    onSubmit?.(project);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{mode === "create" ? "New Project" : "Edit Project"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Label>SDG Tags</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {sdgs.map((s) => (
              <label key={s.id} className="flex items-center gap-1 text-xs border rounded px-2 py-1">
                <input
                  type="checkbox"
                  checked={form.sdgIds?.includes(s.id) ?? false}
                  onChange={(e) => {
                    const ids = form.sdgIds ?? [];
                    setForm({
                      ...form,
                      sdgIds: e.target.checked ? [...ids, s.id] : ids.filter((id) => id !== s.id),
                    });
                  }}
                />
                SDG {s.number}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>Primary Beneficiary Ministry *</Label>
          <Select value={form.primaryBeneficiaryMinistryId ?? ""} onValueChange={(v) => setForm({ ...form, primaryBeneficiaryMinistryId: v })}>
            <SelectTrigger><SelectValue placeholder="Select ministry" /></SelectTrigger>
            <SelectContent>
              {ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.shortName}</SelectItem>)}
            </SelectContent>
          </Select>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Capital Required</Label>
            <Input value={form.capitalRequired ?? ""} onChange={(e) => setForm({ ...form, capitalRequired: e.target.value })} />
          </div>
          <div>
            <Label>Financing Type</Label>
            <Input value={form.financingType ?? ""} onChange={(e) => setForm({ ...form, financingType: e.target.value })} />
          </div>
        </div>
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
        <div>
          <Label>Document Placeholders</Label>
          <Input
            placeholder="Project Brief, Investor Pack (comma-separated)"
            value={(form.documents ?? []).join(", ")}
            onChange={(e) => setForm({ ...form, documents: e.target.value.split(",").map((d) => d.trim()).filter(Boolean) })}
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
          <Button type="button" variant="secondary" onClick={handleSave}>Save Draft</Button>
          {onSubmit && (
            <Button type="button" onClick={handleSubmit}>Submit for Review</Button>
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
