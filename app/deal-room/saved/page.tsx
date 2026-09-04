"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useProjectStore } from "@/context/project-store-context";
import { useWatchlist } from "@/lib/hooks/use-watchlist";
import type { DemoPersona, InvestmentProject, ProjectFilters } from "@/lib/types";
import { filterProjects } from "@/lib/entitlements/visibility";
import { STATUS_FILTER_CHIPS, isInReviewStatus, type StatusFilterValue } from "@/lib/governance/project-workflow";
import { paramsToFilters, syncFiltersToUrl } from "@/lib/utils/project-filters-url";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { ProjectFiltersBar } from "@/components/projects/project-filters";
import { PipelineViewSwitcher, type PipelineView } from "@/components/deal-room/pipeline-view-switcher";
import { DealRoomKanban } from "@/components/deal-room/deal-room-kanban";
import { PipelineListView } from "@/components/deal-room/pipeline-list-view";
import { PipelineTableView } from "@/components/deal-room/pipeline-table-view";
import { PipelineMatrixView } from "@/components/deal-room/pipeline-matrix-view";
import { ProjectDetailDrawer } from "@/components/dashboard/project-detail-drawer";
import { cn } from "@/lib/utils";

const VIEW_KEY = "zimbabwe.dealRoom.savedView";

/**
 * Saved Projects — the qualified/government investor's personal watchlist, rebuilt (Platform
 * Feedback Batch v4, Phase 1) onto the same registry chrome as /deal-room/pipeline: search +
 * expandable filters (ProjectFiltersBar) on row 1, and Kanban/List/Table/Matrix (PipelineViewSwitcher)
 * on row 2, instead of the old static card grid. Clicking an item opens the shared
 * ProjectDetailDrawer in place (read-only workflowRole, same as Pipeline for a non-staff viewer)
 * rather than navigating away to the public opportunity page.
 */
export default function DealRoomSavedPage() {
  const { isAuthenticated, isQualified, isLoading: authLoading } = useAuth();
  const { projects, isLoading: projectsLoading } = useProjectStore();
  const { entries, isLoading: watchlistLoading } = useWatchlist(isAuthenticated);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<PipelineView>("table");
  const mountedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restored = paramsToFilters(params);
    if (Object.keys(restored).length > 0) setFilters(restored);

    const saved = localStorage.getItem(VIEW_KEY) as PipelineView | null;
    if (saved === "kanban" || saved === "list" || saved === "table" || saved === "matrix") setView(saved);
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    syncFiltersToUrl(filters);
  }, [filters]);

  const changeView = (next: PipelineView) => {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  };

  const savedProjects = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    return entries.map((e) => byId.get(e.projectId)).filter((p): p is InvestmentProject => Boolean(p));
  }, [entries, projects]);

  // Mirrors /deal-room/pipeline's own persona choice — a qualified/government viewer already sees
  // every workflow status on the pipeline, so a watchlisted non-published project shouldn't vanish
  // here just because filterProjects' default persona hides anything but "published".
  const savedPersona: DemoPersona = isQualified ? "admin" : "registered";
  const taxonomyFilteredProjects = useMemo(
    () => filterProjects(savedProjects, filters, savedPersona),
    [savedProjects, filters, savedPersona]
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

  const selectedProject = savedProjects.find((p) => p.id === selectedId) ?? null;
  const isLoading = authLoading || projectsLoading || watchlistLoading;

  if (!authLoading && !isAuthenticated) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Saved Projects</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Your personal watchlist of investment opportunities. Save a project from its detail page or card to track it here.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="dashboard-skeleton h-10 w-full max-w-md" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="dashboard-skeleton h-40 rounded-lg" />
            ))}
          </div>
        </div>
      ) : savedProjects.length === 0 ? (
        <div className="mx-auto max-w-md text-center py-16">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(255,211,0,0.12)" }}
          >
            <Bookmark className="h-5 w-5" style={{ color: "var(--color-gold)" }} />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">No saved projects yet</h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Browse the pipeline and click &ldquo;Save&rdquo; on any project to build your watchlist.
          </p>
          <Link href="/deal-room/pipeline" className="btn-sovereign text-xs px-4 py-2 whitespace-nowrap inline-flex">
            Browse Pipeline
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <ProjectFiltersBar
              variant="dashboard"
              projects={savedProjects}
              filters={filters}
              onFiltersChange={setFilters}
              resultCount={filteredProjects.length}
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
              role={null}
              onStatusChange={() => {}}
              onCardClick={(project) => setSelectedId(project.id)}
            />
          )}
          {view === "list" && (
            <PipelineListView projects={filteredProjects} onCardClick={(project) => setSelectedId(project.id)} />
          )}
          {view === "table" && (
            <PipelineTableView projects={filteredProjects} onCardClick={(project) => setSelectedId(project.id)} />
          )}
          {view === "matrix" && (
            <PipelineMatrixView projects={filteredProjects} onCardClick={(project) => setSelectedId(project.id)} />
          )}
        </>
      )}

      <ProjectDetailDrawer project={selectedProject} onClose={() => setSelectedId(null)} workflowRole={null} />
    </div>
  );
}
