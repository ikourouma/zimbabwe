"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import type { InvestmentProject, ProjectFilters, ProjectStatus } from "@/lib/types";
import { useProjectStore } from "@/context/project-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useAuth } from "@/context/auth-context";
import { roleToWorkflowRole } from "@/lib/auth/role-map";
import { resolveProjectWorkflowRole, type WorkflowRoleActor } from "@/lib/auth/project-workflow-role";
import { filterProjects } from "@/lib/entitlements/visibility";
import { STATUS_LABELS, isInReviewStatus } from "@/lib/governance/project-workflow";
import { projectMatchesMinistry, resolveProjectCaseManager } from "@/lib/entitlements/ministry-scope";
import { paramsToFilters, syncFiltersToUrl } from "@/lib/utils/project-filters-url";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/dashboard/data-table";
import { ProjectDetailDrawer } from "@/components/dashboard/project-detail-drawer";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProjectFiltersBar } from "@/components/projects/project-filters";
import { DealRoomKanban } from "@/components/deal-room/deal-room-kanban";
import { PipelineViewSwitcher, type PipelineView } from "@/components/deal-room/pipeline-view-switcher";
import { PipelineListView } from "@/components/deal-room/pipeline-list-view";
import { PipelineMatrixView } from "@/components/deal-room/pipeline-matrix-view";
import { Button } from "@/components/ui/button";

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
  const router = useRouter();
  const { projects, updateProject, isLoading } = useProjectStore();
  const { sectors, ministries } = useTaxonomyStore();
  const { role, userId, ministryId, isLoading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [investorOnly, setInvestorOnly] = useState(false);
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  // "My Ministry" (Ministry Desk management dashboard plan, Part 2) — ministry_admin sees their own
  // ministry's projects by default, with an opt-in toggle to browse the full national pipeline for
  // context. Defaults true unconditionally (safe for every other role too — this only ever narrows
  // the list when combined with the ministry_admin-gated predicate below, so it's a no-op for
  // admin/super_admin regardless of this initial value). Read-only outside their own ministry either
  // way — resolveProjectWorkflowRole already returns null (no write authority) there.
  const [myMinistryOnly, setMyMinistryOnly] = useState(true);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [view, setView] = useState<PipelineView>("table");
  const mountedRef = useRef(false);
  const viewStorageKey = `zimbabwe.registry.${basePath}.view`;

  // Coarse, viewer-level role — used for the Kanban board's single canDrag/canTransition gate and
  // the drawer's "Edit" button availability. `ministry_admin` (Team Ministry Traceability Batch,
  // Phase 3, item 8; re-tiered to "reviewer" in Platform Feedback Batch v4, Phase 7 — full
  // stewardship of their own ministry's projects through Approved, but Publish is admin/super_admin
  // only) resolves here since /ministry/projects' visibility (isVisibleToMinistryAdmin) already
  // scopes what they see almost entirely to their own ministry — the rare secondary-beneficiary
  // exception is caught by the precise per-project resolution below (drawer) and by the server's
  // own resolveProjectWorkflowRole re-check on every PATCH.
  const workflowRole =
    role === "ministry_admin" ? (ministryId ? "reviewer" : null) : role ? roleToWorkflowRole(role) : null;
  const actor: WorkflowRoleActor | null = role && userId ? { role, userId, ministryId } : null;
  const canCreate = role === "admin" || role === "super_admin" || (role === "ministry_admin" && Boolean(ministryId));
  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;
  // Precise per-project resolution (drawer Actions tab) — matters when a ministry_admin's own
  // ministry is only a *secondary* beneficiary on the selected project (view-only, per the plan).
  const selectedWorkflowRole = selectedProject && actor ? resolveProjectWorkflowRole(actor, selectedProject) : workflowRole;
  const sectorName = useCallback((id: string) => sectors.find((s) => s.id === id)?.name ?? "—", [sectors]);

  // Read the deep-linked ?status= / filter params on mount (from KPI cards, a shared link, or the
  // Taxonomies workspace's linked-project counts) and register the Ctrl/Cmd+N "new project"
  // power-user shortcut — a real navigation to the full-page wizard (Phase 5), same as the topbar's
  // "Create Project" quick action, rather than a `?new=1` param + Dialog (the old flow's "must
  // reload to reopen" bug simply doesn't exist for a real route). Also restores the persisted view
  // preference client-side only, to avoid an SSR/client hydration mismatch (same pattern as
  // /deal-room/pipeline).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status && VALID_FILTERS.has(status)) setStatusFilter(status as StatusFilterValue);

    const restored = paramsToFilters(params);
    if (Object.keys(restored).length > 0) setFilters(restored);

    const savedView = localStorage.getItem(viewStorageKey) as PipelineView | null;
    if (savedView === "kanban" || savedView === "list" || savedView === "table" || savedView === "matrix") {
      setView(savedView);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Project creation is an Admin/Super-Admin capability (see POST /api/projects's role
      // ceiling) — ministry_admin gets read-only access to this shared registry component (Deal
      // Room Feedback Batch v2, Phase 6), so the shortcut is a no-op for them rather than
      // navigating to a wizard whose save would just 403 server-side.
      if (canCreate && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        const target = e.target as HTMLElement | null;
        const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
        if (typing) return;
        e.preventDefault();
        router.push(`${basePath}/new`);
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

  // "My Assigned Projects" (Team Ministry Traceability Batch, Phase 2, item 6) — the signed-in
  // staff member is the *effective* Case Manager (direct project override, or inherited via their
  // primary ministry's default desk officer) for these rows. Same ministry map lookup the
  // ProjectDetailDrawer's CaseManagerSection uses.
  const ministryById = useMemo(() => new Map(ministries.map((m) => [m.id, m])), [ministries]);
  const isAssignedToMe = useCallback(
    (p: InvestmentProject) => {
      if (!userId) return false;
      const ministry = ministryById.get(p.primaryBeneficiaryMinistryId);
      return resolveProjectCaseManager(p, ministry) === userId;
    },
    [ministryById, userId]
  );

  const filteredProjects = useMemo(() => {
    const byStatus =
      statusFilter === "in_review"
        ? taxonomyFilteredProjects.filter((p) => isInReviewStatus(p.projectStatus))
        : statusFilter !== "all"
          ? taxonomyFilteredProjects.filter((p) => p.projectStatus === statusFilter)
          : taxonomyFilteredProjects;
    const byInvestor = investorOnly ? byStatus.filter((p) => p.investorSubmitted) : byStatus;
    const byAssigned = assignedToMeOnly ? byInvestor.filter(isAssignedToMe) : byInvestor;
    return role === "ministry_admin" && myMinistryOnly && ministryId
      ? byAssigned.filter((p) => projectMatchesMinistry(p, ministryId))
      : byAssigned;
  }, [taxonomyFilteredProjects, statusFilter, investorOnly, assignedToMeOnly, isAssignedToMe, role, myMinistryOnly, ministryId]);

  const columns: ColumnDef<InvestmentProject, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            <span className="text-white font-medium">{row.original.title.slice(0, 60)}</span>
            {row.original.investorSubmitted && (
              <span className="status-badge status-badge-info text-[10px]" title="Originated by a qualified investor via Propose a Project">
                Investor
              </span>
            )}
          </span>
        ),
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

  // Full-page wizard replaces the old ProjectForm-in-Dialog popup (Phase 5) — editing now
  // navigates straight to a real route instead of closing the drawer to open a second overlay.
  const openEdit = (project: InvestmentProject) => {
    setSelectedId(null);
    router.push(`${basePath}/${project.id}/edit`);
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
       *  Project" quick action (components/dashboard/dashboard-topbar.tsx) already links straight
       *  to `${basePath}/new`. A second button here was a duplicate CTA. */}
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
          <button
            type="button"
            onClick={() => setInvestorOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              investorOnly
                ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-white"
                : "border-[var(--color-sovereign-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/50"
            )}
            title="Show only projects originated by qualified investors via Propose a Project"
          >
            Investor Proposals ({taxonomyFilteredProjects.filter((p) => p.investorSubmitted).length})
          </button>
          {(role === "admin" || role === "super_admin") && (
            <button
              type="button"
              onClick={() => setAssignedToMeOnly((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                assignedToMeOnly
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-white"
                  : "border-[var(--color-sovereign-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/50"
              )}
              title="Show only projects where you're the effective Case Manager (direct or via ministry default)"
            >
              My Assigned Projects ({taxonomyFilteredProjects.filter(isAssignedToMe).length})
            </button>
          )}
          {role === "ministry_admin" && ministryId && (
            <button
              type="button"
              onClick={() => setMyMinistryOnly((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                myMinistryOnly
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-white"
                  : "border-[var(--color-sovereign-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/50"
              )}
              title="Toggle between your ministry's own projects and the full national pipeline. You can only create/edit/advance your ministry's own projects either way."
            >
              My Ministry Only ({taxonomyFilteredProjects.filter((p) => projectMatchesMinistry(p, ministryId)).length})
            </button>
          )}
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
        workflowRole={selectedWorkflowRole}
        onAction={handleAction}
        onEdit={selectedWorkflowRole ? openEdit : undefined}
      />
    </div>
  );
}
