"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useProjectStore } from "@/context/project-store-context";
import { roleToWorkflowRole } from "@/lib/auth/role-map";
import type { InvestmentProject, ProjectFilters, ProjectStatus, SavedSearch } from "@/lib/types";
import { STATUS_LABELS, isInReviewStatus } from "@/lib/governance/project-workflow";
import { filterProjects } from "@/lib/entitlements/visibility";
import { paramsToFilters, normalizeFilters, syncFiltersToUrl } from "@/lib/utils/project-filters-url";
import { useSavedSearches } from "@/lib/hooks/use-saved-searches";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { DealRoomKanban } from "@/components/deal-room/deal-room-kanban";
import { PipelineViewSwitcher, type PipelineView } from "@/components/deal-room/pipeline-view-switcher";
import { PipelineListView } from "@/components/deal-room/pipeline-list-view";
import { PipelineTableView } from "@/components/deal-room/pipeline-table-view";
import { PipelineMatrixView } from "@/components/deal-room/pipeline-matrix-view";
import { ProjectDetailDrawer } from "@/components/dashboard/project-detail-drawer";
import { ProjectFiltersBar } from "@/components/projects/project-filters";
import { SaveSearchModal } from "@/components/projects/save-search-modal";
import { cn } from "@/lib/utils";

const VIEW_KEY = "zimbabwe.dealRoom.pipelineView";

/** "in_review" is a synthetic value grouping submitted_for_review/under_review/changes_requested
 *  (mirrors the Overview KPI card and isInReviewStatus) — not a real ProjectStatus. */
type StatusFilterValue = "all" | "in_review" | ProjectStatus;

// 1:1 with DealRoomKanban's BOARD_COLUMNS (draft → submitted_for_review → under_review →
// changes_requested → approved → published) — every real Kanban column gets its own pill instead
// of the old "In Review" grouping, which flattened 3 distinct stages into one. The synthetic
// "in_review" StatusFilterValue itself stays supported below (not as its own pill) purely for the
// legacy ?status=in_review deep link from the Overview KPI cards.
const STATUS_FILTER_CHIPS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: STATUS_LABELS.draft },
  { value: "submitted_for_review", label: STATUS_LABELS.submitted_for_review },
  { value: "under_review", label: STATUS_LABELS.under_review },
  { value: "changes_requested", label: STATUS_LABELS.changes_requested },
  { value: "approved", label: STATUS_LABELS.approved },
  { value: "published", label: STATUS_LABELS.published },
];

export default function DealRoomPipelinePage() {
  const { isQualified, isAuthenticated, isAdmin, isSuperAdmin, role, isLoading: authLoading } = useAuth();
  const { projects, updateProject } = useProjectStore();
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<"overview" | "messages">("overview");
  const [view, setView] = useState<PipelineView>("kanban");
  const [saveOpen, setSaveOpen] = useState(false);
  const mountedRef = useRef(false);
  const { savedSearches, saveSearch, deleteSearch } = useSavedSearches(isAuthenticated);

  const applySavedSearch = (search: SavedSearch) => setFilters(normalizeFilters(search.filters ?? {}));

  // Restore the persisted view preference on mount (same client-only pattern as the ?status= read
  // below, to avoid an SSR/client hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY) as PipelineView | null;
    if (saved === "kanban" || saved === "list" || saved === "table" || saved === "matrix") setView(saved);
  }, []);

  const changeView = (next: PipelineView) => {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  };

  const openOverview = (project: InvestmentProject) => {
    setDrawerInitialTab("overview");
    setSelectedId(project.id);
  };
  const openMessages = (project: InvestmentProject) => {
    setDrawerInitialTab("messages");
    setSelectedId(project.id);
  };

  // Read the ?status= / ?projectId= deep-link params client-side (not via useSearchParams(), which
  // would force this page behind a Suspense boundary — see the same pattern/rationale in
  // app/projects/page.tsx). ?status= lets the Overview KPI cards drill into a pre-filtered pipeline;
  // ?projectId= (from the project page's "Open in Deal Room" / "Access Documents") auto-opens that
  // project's detail workspace. selectedProject is derived from the store each render, so setting the
  // id before projects finish loading still resolves once they arrive.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status) setStatusFilter(status as StatusFilterValue);
    const projectId = params.get("projectId");
    if (projectId) {
      setDrawerInitialTab("overview");
      setSelectedId(projectId);
    }
    const restored = paramsToFilters(params);
    if (Object.keys(restored).length > 0) setFilters(restored);
  }, []);

  // Two-way sync: mirror the active filter set back onto the URL (preserving ?status=/?projectId=,
  // which aren't part of FILTER_PARAM_KEYS). Skips the first render so the mount-time read above
  // isn't clobbered by an empty write before its setFilters commits — same pattern as /projects.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    syncFiltersToUrl(filters);
  }, [filters]);

  const workflowRole = role ? roleToWorkflowRole(role) : null;

  // "admin" persona isn't in filterProjects' publish-status-restricted list, so the shared filter
  // dimensions apply without also hiding non-published projects — this is a governance workflow
  // view where every status must stay visible regardless of the viewer's real role. Kept separate
  // from the statusFilter narrowing below so the stage pills' live counts (e.g. "Draft (1)") react
  // to the taxonomy filters without also collapsing to just the currently-selected stage's count.
  const taxonomyFilteredProjects = useMemo(
    () => filterProjects(projects, filters, "admin"),
    [projects, filters]
  );

  const filteredProjects = useMemo(() => {
    if (statusFilter === "in_review") {
      return taxonomyFilteredProjects.filter((p) => isInReviewStatus(p.projectStatus));
    }
    if (statusFilter !== "all") {
      return taxonomyFilteredProjects.filter((p) => p.projectStatus === statusFilter);
    }
    return taxonomyFilteredProjects;
  }, [taxonomyFilteredProjects, statusFilter]);

  const countFor = (value: StatusFilterValue) => {
    if (value === "all") return taxonomyFilteredProjects.length;
    if (value === "in_review") return taxonomyFilteredProjects.filter((p) => isInReviewStatus(p.projectStatus)).length;
    return taxonomyFilteredProjects.filter((p) => p.projectStatus === value).length;
  };

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;

  const handleStatusChange = async (projectId: string, status: ProjectStatus) => {
    try {
      await updateProject(projectId, { projectStatus: status });
    } catch {
      toast.error("Failed to update project status");
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

  if (!authLoading && !isQualified) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Pipeline</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {isAdmin || isSuperAdmin
            ? "Drag cards to move a project through the governance workflow. Click a card to open its detail workspace."
            : "Explore national investment opportunities across sovereign development stages. Click a card to inspect its data room workspace."}
        </p>
      </div>

      <div className="mb-4">
        <ProjectFiltersBar
          variant="dashboard"
          projects={projects}
          filters={filters}
          onFiltersChange={setFilters}
          resultCount={filteredProjects.length}
          savedSearches={savedSearches}
          onSaveSearch={() => setSaveOpen(true)}
          onApplySavedSearch={applySavedSearch}
          onDeleteSavedSearch={deleteSearch}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setStatusFilter(chip.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                statusFilter === chip.value
                  ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)] border-[var(--color-gold)]/40"
                  : "text-[var(--color-text-muted)] border-[var(--color-sovereign-border)] hover:bg-white/5 hover:text-white"
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
          onCardClick={openOverview}
          onMessageClick={openMessages}
        />
      )}
      {view === "list" && (
        <PipelineListView projects={filteredProjects} onCardClick={openOverview} onMessageClick={openMessages} />
      )}
      {view === "table" && <PipelineTableView projects={filteredProjects} onCardClick={openOverview} />}
      {view === "matrix" && (
        <PipelineMatrixView projects={filteredProjects} onCardClick={openOverview} onMessageClick={openMessages} />
      )}

      <ProjectDetailDrawer
        project={selectedProject}
        onClose={() => setSelectedId(null)}
        workflowRole={workflowRole}
        onAction={handleAction}
        initialTab={drawerInitialTab}
      />

      <SaveSearchModal open={saveOpen} onOpenChange={setSaveOpen} filters={filters} onSaved={saveSearch} />
    </div>
  );
}
