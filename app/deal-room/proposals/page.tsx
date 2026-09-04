"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FilePlus2, FileText } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useProjectStore } from "@/context/project-store-context";
import { resolveProjectWorkflowRole, type WorkflowRoleActor } from "@/lib/auth/project-workflow-role";
import type { InvestmentProject, ProjectFilters, ProjectStatus } from "@/lib/types";
import { filterProjects } from "@/lib/entitlements/visibility";
import { STATUS_FILTER_CHIPS, isInReviewStatus, type StatusFilterValue } from "@/lib/governance/project-workflow";
import { paramsToFilters, syncFiltersToUrl } from "@/lib/utils/project-filters-url";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { QualificationRequiredNotice } from "@/components/deal-room/qualification-required-notice";
import { ProjectFiltersBar } from "@/components/projects/project-filters";
import { PipelineViewSwitcher, type PipelineView } from "@/components/deal-room/pipeline-view-switcher";
import { DealRoomKanban } from "@/components/deal-room/deal-room-kanban";
import { PipelineListView } from "@/components/deal-room/pipeline-list-view";
import { PipelineTableView } from "@/components/deal-room/pipeline-table-view";
import { PipelineMatrixView } from "@/components/deal-room/pipeline-matrix-view";
import { ProjectDetailDrawer } from "@/components/dashboard/project-detail-drawer";
import { cn } from "@/lib/utils";

const VIEW_KEY = "zimbabwe.dealRoom.proposalsView";

/**
 * "My Proposals" — the qualified investor's own Propose-a-Project submissions (Investor Dashboard
 * Expansion plan, Phase 4), rebuilt (Platform Feedback Batch v4, Phase 1) onto the same registry
 * chrome as /deal-room/pipeline: search + expandable filters (ProjectFiltersBar) on row 1, and
 * Kanban/List/Table/Matrix (PipelineViewSwitcher) on row 2, instead of the old flat list. Reuses
 * the already-visible-to-me project list from useProjectStore (GET /api/projects already scopes
 * an investor's own drafts to themselves — see that route) rather than a dedicated endpoint,
 * filtered down to investorSubmitted + (createdBy === me OR I'm an assigned co-editor).
 *
 * Co-editor inclusion (Reconcile plan + Phase 3, item B4): `teamAssignedUserIds` is already
 * returned by GET /api/projects and not stripped for qualified users — a teammate assigned via
 * the owner's Team roster needs their assigned proposals to actually show up here too, not just
 * the owner's own.
 */
export default function DealRoomProposalsPage() {
  const router = useRouter();
  const { isAuthenticated, isQualified, userId, isLoading: authLoading } = useAuth();
  const { projects, updateProject, isLoading: projectsLoading } = useProjectStore();
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

  const myProposals = useMemo(
    () =>
      projects.filter(
        (p) => p.investorSubmitted && (p.createdBy === userId || (userId && p.teamAssignedUserIds?.includes(userId)))
      ),
    [projects, userId]
  );

  // "admin" persona bypasses filterProjects' published-only restriction — every one of the
  // investor's own drafts/in-review/published proposals must stay visible here regardless of
  // status, same rationale as the Pipeline page's own qualified-investor persona choice.
  const taxonomyFilteredProjects = useMemo(
    () => filterProjects(myProposals, filters, "admin"),
    [myProposals, filters]
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

  const selectedProject: InvestmentProject | null = myProposals.find((p) => p.id === selectedId) ?? null;
  // Resolves to "creator" (never null) for every row here since myProposals is already filtered to
  // `createdBy === userId` — gives the drawer's Actions tab a "Submit for Review"/"Resubmit"
  // shortcut and lights up the "Edit" button, which opens the full wizard for actual field edits.
  const actor: WorkflowRoleActor | null = userId ? { role: "qualified", userId, ministryId: null } : null;
  const selectedWorkflowRole = selectedProject && actor ? resolveProjectWorkflowRole(actor, selectedProject) : null;

  const openEdit = (project: InvestmentProject) => {
    setSelectedId(null);
    router.push(`/deal-room/proposals/${project.id}`);
  };

  const handleAction = async (projectId: string, status: ProjectStatus, notes?: string) => {
    try {
      await updateProject(projectId, { projectStatus: status, reviewerNotes: notes });
      toast.success(`Proposal moved to ${status.replace(/_/g, " ")}`);
    } catch {
      toast.error("Failed to update proposal status");
    }
  };

  if (!authLoading && !isAuthenticated) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }
  if (!authLoading && !isQualified) {
    return (
      <QualificationRequiredNotice
        feature="My Proposals"
        description="Propose your own projects into ZIDA's national pipeline once your investor profile is qualified."
      />
    );
  }

  const isLoading = authLoading || projectsLoading;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">My Proposals</h1>
          <p className="text-sm mt-1 max-w-xl" style={{ color: "var(--color-text-secondary)" }}>
            Projects you&apos;ve originated and submitted into ZIDA&apos;s national investment pipeline.
          </p>
        </div>
        <Link href="/deal-room/proposals/new" className="btn-sovereign text-xs px-4 py-2 whitespace-nowrap">
          <FilePlus2 className="h-4 w-4" /> Propose a Project
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="dashboard-skeleton h-10 w-full max-w-md" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="dashboard-skeleton h-20 rounded-lg" />
            ))}
          </div>
        </div>
      ) : myProposals.length === 0 ? (
        <div className="mx-auto max-w-md text-center py-16">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(255,211,0,0.12)" }}
          >
            <FileText className="h-5 w-5" style={{ color: "var(--color-gold)" }} />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">No proposals yet</h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Have a bankable project idea? Submit it directly into ZIDA&apos;s review pipeline.
          </p>
          <Link href="/deal-room/proposals/new" className="btn-sovereign text-xs px-4 py-2 whitespace-nowrap inline-flex">
            Propose a Project
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <ProjectFiltersBar
              variant="dashboard"
              projects={myProposals}
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
              // Every row on this board is already scoped to `createdBy === userId` above, so
              // "creator" is safe to apply board-wide (unlike the platform-wide Pipeline board,
              // which never assumes a single role for every card) — lets drag-to-submit work here.
              role="creator"
              onStatusChange={async (projectId, status) => {
                try {
                  await updateProject(projectId, { projectStatus: status });
                  toast.success(`Proposal moved to ${status.replace(/_/g, " ")}`);
                } catch {
                  toast.error("Failed to update proposal status");
                }
              }}
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
