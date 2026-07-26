"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import type { InvestmentProject, ProjectFilters, ProjectStatus } from "@/lib/types";
import { useProjectStore } from "@/context/project-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useAuth } from "@/context/auth-context";
import { roleToWorkflowRole } from "@/lib/auth/role-map";
import { filterProjects } from "@/lib/entitlements/visibility";
import { STATUS_LABELS, isInReviewStatus } from "@/lib/governance/project-workflow";
import { paramsToFilters, syncFiltersToUrl } from "@/lib/utils/project-filters-url";
import { slugify, cn } from "@/lib/utils";
import { DataTable } from "@/components/dashboard/data-table";
import { ProjectDetailDrawer } from "@/components/dashboard/project-detail-drawer";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProjectFiltersBar } from "@/components/projects/project-filters";
import { ProjectForm } from "@/components/admin/project-form";
import { DealRoomKanban } from "@/components/deal-room/deal-room-kanban";
import { PipelineViewSwitcher, type PipelineView } from "@/components/deal-room/pipeline-view-switcher";
import { PipelineListView } from "@/components/deal-room/pipeline-list-view";
import { PipelineMatrixView } from "@/components/deal-room/pipeline-matrix-view";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** "all" and the synthetic "in_review" grouping sit alongside the concrete ProjectStatus values.
 *  "in_review" is no longer its own pill (see STATUS_CHIPS below) but stays a valid value purely
 *  for the legacy `?status=in_review` deep link from the Overview KPI cards. */
type StatusFilterValue = "all" | "in_review" | ProjectStatus;

// Full 7-stage 1:1 coverage — every real ProjectStatus (including "archived", which the Kanban
// board itself excludes from its columns but the Table/List/Matrix views still surface) gets its
// own pill instead of collapsing submitted_for_review/under_review/changes_requested into one
// grouped "In Review" chip. "Submitted"/"In Review" are deliberately shorter than
// STATUS_LABELS.submitted_for_review/under_review to keep the 8-pill row compact.
const STATUS_CHIPS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: STATUS_LABELS.draft },
  { value: "submitted_for_review", label: "Submitted" },
  { value: "under_review", label: "In Review" },
  { value: "changes_requested", label: STATUS_LABELS.changes_requested },
  { value: "approved", label: STATUS_LABELS.approved },
  { value: "published", label: STATUS_LABELS.published },
  { value: "archived", label: STATUS_LABELS.archived },
];

const VALID_FILTERS = new Set<string>([...STATUS_CHIPS.map((c) => c.value), "in_review"]);

interface ProjectRegistryViewProps {
  /** Base path used for the shareable `?status=` URL (e.g. "/admin/projects"). */
  basePath: string;
}

/**
 * Shared, status-filterable project registry used by both /admin/projects and /super-admin/projects.
 * Reads/writes the `?status=` query param via window.location (matching the no-Suspense pattern in
 * app/deal-room/pipeline and app/projects) so the analytics KPI cards can deep-link into a
 * pre-filtered queue and admins can bookmark/share operational views.
 */
export function ProjectRegistryView({ basePath }: ProjectRegistryViewProps) {
  const { projects, addProject, updateProject, isLoading } = useProjectStore();
  const { sectors } = useTaxonomyStore();
  const { role, isLoading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [view, setView] = useState<PipelineView>("table");
  const mountedRef = useRef(false);
  const viewStorageKey = `zimbabwe.registry.${basePath}.view`;

  const workflowRole = role ? roleToWorkflowRole(role) : null;
  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;
  const sectorName = useCallback((id: string) => sectors.find((s) => s.id === id)?.name ?? "—", [sectors]);

  // Read the deep-linked ?status= / filter params / ?new= on mount (from KPI cards, the topbar
  // quick action, a shared link, or the Taxonomies workspace's linked-project counts) and register
  // the Ctrl/Cmd+N "new project" power-user shortcut. Also restores the persisted view preference
  // client-side only, to avoid an SSR/client hydration mismatch (same pattern as /deal-room/pipeline).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status && VALID_FILTERS.has(status)) setStatusFilter(status as StatusFilterValue);

    const restored = paramsToFilters(params);
    if (Object.keys(restored).length > 0) setFilters(restored);

    if (params.get("new") === "1") {
      setCreateOpen(true);
      params.delete("new");
      const qs = params.toString();
      window.history.replaceState(null, "", `${basePath}${qs ? `?${qs}` : ""}`);
    }

    const savedView = localStorage.getItem(viewStorageKey) as PipelineView | null;
    if (savedView === "kanban" || savedView === "list" || savedView === "table" || savedView === "matrix") {
      setView(savedView);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        const target = e.target as HTMLElement | null;
        const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
        if (typing) return;
        e.preventDefault();
        setCreateOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath]);

  // Two-way sync: mirror the active filter set back onto the URL (preserving ?status=, which isn't
  // part of FILTER_PARAM_KEYS). Skips the first render so the mount-time read above isn't clobbered
  // by an empty write before its setFilters commits — same pattern as /projects and the pipeline.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    syncFiltersToUrl(filters);
  }, [filters]);

  const changeView = (next: PipelineView) => {
    setView(next);
    localStorage.setItem(viewStorageKey, next);
  };

  const applyStatus = (value: StatusFilterValue) => {
    setStatusFilter(value);
    const params = new URLSearchParams(window.location.search);
    if (value === "all") params.delete("status");
    else params.set("status", value);
    const qs = params.toString();
    window.history.replaceState(null, "", `${basePath}${qs ? `?${qs}` : ""}`);
  };

  // "admin" isn't in filterProjects' publish-status-restricted persona list, so the shared filter
  // dimensions apply without also hiding drafts/unpublished projects — staff need to see those here.
  // Kept separate from the statusFilter narrowing below so the stage pills' live counts (e.g.
  // "Draft (1)") react to the taxonomy filters without collapsing to just the selected stage.
  const taxonomyFilteredProjects = useMemo(
    () => filterProjects(projects, filters, "admin"),
    [projects, filters]
  );

  const filteredProjects = useMemo(() => {
    if (statusFilter === "in_review") return taxonomyFilteredProjects.filter((p) => isInReviewStatus(p.projectStatus));
    if (statusFilter !== "all") return taxonomyFilteredProjects.filter((p) => p.projectStatus === statusFilter);
    return taxonomyFilteredProjects;
  }, [taxonomyFilteredProjects, statusFilter]);

  const columns: ColumnDef<InvestmentProject, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <span className="text-white font-medium">{row.original.title.slice(0, 60)}</span>,
      },
      { id: "sector", header: "Sector", accessorFn: (row) => sectorName(row.sectorId) },
      {
        accessorKey: "projectStatus",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.projectStatus} />,
      },
      { accessorKey: "capitalRequired", header: "Capital", cell: ({ row }) => row.original.capitalRequired ?? "—" },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
      },
    ],
    [sectorName]
  );

  const handleCreate = async (partial: Partial<InvestmentProject>, submit = false) => {
    const now = new Date().toISOString();
    const payload: InvestmentProject = {
      id: "",
      title: partial.title!,
      slug: slugify(partial.title!),
      sectorId: partial.sectorId!,
      subsectorId: partial.subsectorId,
      strategicPillarIds: partial.strategicPillarIds ?? [],
      sdgIds: partial.sdgIds ?? [],
      primaryBeneficiaryMinistryId: partial.primaryBeneficiaryMinistryId!,
      secondaryBeneficiaryMinistryIds: partial.secondaryBeneficiaryMinistryIds,
      projectOwner: partial.projectOwner!,
      location: partial.location!,
      province: partial.province,
      capitalRequired: partial.capitalRequired,
      financingType: partial.financingType,
      projectReadiness: partial.projectReadiness!,
      projectStatus: submit ? "submitted_for_review" : "draft",
      visibilityLevel: partial.visibilityLevel ?? "public",
      opportunitySummary: partial.opportunitySummary!,
      description: partial.description!,
      scope: partial.scope ?? [],
      developmentImpact: partial.developmentImpact ?? [],
      documents: partial.documents ?? [],
      dataVerificationStatus: "pending_review",
      sourceReference: "Created via Admin Console",
      createdBy: "Admin Console",
      submittedAt: submit ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const created = await addProject(payload);
      toast.success(submit ? "Project submitted for review" : "Draft saved");
      setCreateOpen(false);
      return created;
    } catch {
      toast.error("Failed to save project");
      return undefined;
    }
  };

  const editProject = projects.find((p) => p.id === editId) ?? null;
  const editRequiresReason =
    editProject != null && (editProject.projectStatus === "approved" || editProject.projectStatus === "published");

  const openEdit = (project: InvestmentProject) => {
    setSelectedId(null);
    setEditReason("");
    setEditId(project.id);
  };

  const handleEdit = async (partial: Partial<InvestmentProject>) => {
    if (!editId) return;
    if (editRequiresReason && !editReason.trim()) {
      toast.error("A reason is required to edit a live project");
      return;
    }
    try {
      await updateProject(editId, { ...partial, reason: editRequiresReason ? editReason.trim() : undefined } as Partial<InvestmentProject>);
      toast.success("Project updated");
      setEditId(null);
      setEditReason("");
    } catch {
      toast.error("Failed to update project");
    }
  };

  const handleAction = async (projectId: string, status: ProjectStatus, notes?: string) => {
    try {
      await updateProject(projectId, { projectStatus: status, reviewerNotes: notes });
      toast.success(`Project moved to ${status.replace(/_/g, " ")}`);
    } catch {
      toast.error("Failed to update project status");
    }
  };

  // Kanban drag-to-transition — same canTransition/workflowRole governance rules as
  // /deal-room/pipeline, just without the reviewer-notes prompt the drawer's action buttons use.
  const handleStatusChange = async (projectId: string, status: ProjectStatus) => {
    try {
      await updateProject(projectId, { projectStatus: status });
    } catch {
      toast.error("Failed to update project status");
    }
  };

  const handleBulkArchive = async (rows: InvestmentProject[], clearSelection: () => void) => {
    let succeeded = 0;
    for (const row of rows) {
      try {
        await updateProject(row.id, { projectStatus: "archived" });
        succeeded += 1;
      } catch {
        /* individual failures reported in the summary toast below */
      }
    }
    clearSelection();
    if (succeeded === rows.length) toast.success(`Archived ${succeeded} project(s)`);
    else toast.warning(`Archived ${succeeded} of ${rows.length} — some transitions aren't allowed from their current status`);
  };

  const countFor = (value: StatusFilterValue) => {
    if (value === "all") return taxonomyFilteredProjects.length;
    if (value === "in_review") return taxonomyFilteredProjects.filter((p) => isInReviewStatus(p.projectStatus)).length;
    return taxonomyFilteredProjects.filter((p) => p.projectStatus === value).length;
  };

  return (
    <div>
      {/* No page-level "New Project" CTA here — the dashboard topbar's persistent gold "Create
       *  Project" quick action (components/dashboard/dashboard-topbar.tsx) already deep-links to
       *  ?new=1, which the mount effect above opens via setCreateOpen. A second button here was a
       *  duplicate CTA. */}
      <div className="mb-4">
        <ProjectFiltersBar
          variant="dashboard"
          projects={projects}
          filters={filters}
          onFiltersChange={setFilters}
          resultCount={filteredProjects.length}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => applyStatus(chip.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === chip.value
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-white"
                  : "border-[var(--color-sovereign-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/50"
              )}
            >
              {chip.label} ({countFor(chip.value)})
            </button>
          ))}
        </div>
        <PipelineViewSwitcher view={view} onChange={changeView} />
      </div>

      {view === "kanban" && (
        <DealRoomKanban
          projects={filteredProjects}
          role={workflowRole}
          onStatusChange={handleStatusChange}
          onCardClick={(project) => setSelectedId(project.id)}
        />
      )}
      {view === "list" && (
        <PipelineListView projects={filteredProjects} onCardClick={(project) => setSelectedId(project.id)} />
      )}
      {view === "matrix" && (
        <PipelineMatrixView projects={filteredProjects} onCardClick={(project) => setSelectedId(project.id)} />
      )}
      {view === "table" && (
        <DataTable
          columns={columns}
          data={filteredProjects}
          isLoading={isLoading || authLoading}
          emptyMessage="No projects match this filter."
          enableRowSelection
          hideSearch
          onRowClick={(row) => setSelectedId(row.id)}
          bulkActions={(rows, clear) => (
            <Button size="sm" variant="destructive" onClick={() => handleBulkArchive(rows, clear)}>
              <Trash2 className="h-3.5 w-3.5" /> Archive selected
            </Button>
          )}
        />
      )}

      <ProjectDetailDrawer
        project={selectedProject}
        onClose={() => setSelectedId(null)}
        workflowRole={workflowRole}
        onAction={handleAction}
        onEdit={workflowRole ? openEdit : undefined}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <ProjectForm mode="create" onSave={(p) => handleCreate(p, false)} onSubmit={(p) => handleCreate(p, true)} />
        </DialogContent>
      </Dialog>

      <Dialog open={editId !== null} onOpenChange={(o) => { if (!o) { setEditId(null); setEditReason(""); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editProject && (
            <>
              {editRequiresReason && (
                <div className="rounded-lg p-3 mb-1" style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#fbbf24" }}>
                    Reason for change (required — this project is {editProject.projectStatus === "published" ? "published" : "approved"})
                  </label>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Corrected capital figure per updated feasibility study"
                    className="dashboard-input w-full"
                  />
                </div>
              )}
              <ProjectForm mode="edit" initial={editProject} onSave={handleEdit} onSubmit={handleEdit} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
