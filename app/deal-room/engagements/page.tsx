"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, Plus } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { useProjectStore } from "@/context/project-store-context";
import { roleToWorkflowRole } from "@/lib/auth/role-map";
import type { InvestorEngagement } from "@/lib/types";
import {
  ENGAGEMENT_STATUS_LABELS,
  getAvailableEngagementActions,
} from "@/lib/governance/engagement-workflow";
import {
  DEFAULT_ENGAGEMENT_FILTERS,
  matchesEngagementRow,
  type EngagementFilters,
  type EngagementStatusFilter,
} from "@/lib/governance/engagement-filters";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { QualificationRequiredNotice } from "@/components/deal-room/qualification-required-notice";
import { EngagementStatusPill as StatusPill } from "@/components/deal-room/engagement-status-pill";
import { EngagementDetailDrawer } from "@/components/deal-room/engagement-detail-drawer";
import { NewEngagementWizard } from "@/components/deal-room/new-engagement-wizard";
import { EngagementFiltersBar, Pill } from "@/components/dashboard/engagement-filters-bar";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import { EngagementKanbanView, EngagementListView, EngagementMatrixView } from "@/components/dashboard/engagement-views";
import { PipelineViewSwitcher, type PipelineView } from "@/components/deal-room/pipeline-view-switcher";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const VIEW_KEY = "zimbabwe.dealRoom.engagementsView";

export default function DealRoomEngagementsPage() {
  const { isAuthenticated, isQualified, role, name, ministryId, isLoading: authLoading } = useAuth();
  const { engagements, updateEngagementStatus, addEngagement, refresh, isLoading } = useDealRoomStore();
  const { projects, getProject } = useProjectStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EngagementStatusFilter>("all");
  const [filters, setFilters] = useState<EngagementFilters>(DEFAULT_ENGAGEMENT_FILTERS);
  const [view, setView] = useState<PipelineView>("table");
  // Government Reviewer ministry-scoping (Platform Feedback Batch v4, Phase 6) — additive,
  // off-by-default narrowing to engagements on their own ministry's projects; see the identical
  // convention/rationale on /deal-room/pipeline.
  const [myMinistryOnly, setMyMinistryOnly] = useState(false);

  // GET /api/engagements excludes archived rows by default (they're hidden from every other
  // pipeline view too) — this page's "Include archived" filter needs its own archived-inclusive
  // fetch rather than the shared store's default-filtered list.
  const [archivedOnly, setArchivedOnly] = useState<InvestorEngagement[]>([]);
  const loadArchived = useCallback(async () => {
    try {
      const res = await fetch("/api/engagements?includeArchived=true");
      if (!res.ok) return;
      const all = (await res.json()) as InvestorEngagement[];
      setArchivedOnly(all.filter((e) => e.archivedAt));
    } catch {
      /* keep last known archived count on transient failure */
    }
  }, []);
  useEffect(() => {
    void loadArchived();
  }, [loadArchived]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), loadArchived()]);
  }, [refresh, loadArchived]);

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY) as PipelineView | null;
    if (saved === "kanban" || saved === "list" || saved === "table" || saved === "matrix") setView(saved);
  }, []);

  const changeView = (next: PipelineView) => {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  };

  const workflowRole = role ? roleToWorkflowRole(role) : null;
  const canManage = workflowRole !== null;
  const canSelfInitiate = role === "qualified";

  // POST /api/engagements admits admin, super_admin and qualified only, so anyone else offered the
  // control gets a 403 for their trouble. `canManage` is true for government reviewers, who can
  // advance an engagement someone else raised but cannot open one — an engagement is an investor's
  // approach, and a reviewer creating one would be inventing the investor's interest.
  const canCreate = role === "qualified" || role === "admin" || role === "super_admin";

  const projectTitleOf = useCallback((projectId: string) => getProject(projectId)?.title ?? "Unknown project", [getProject]);

  // Superset the store's default (archived-excluded) list with the archived-inclusive fetch, then
  // let matchesEngagementRow apply search/status/archived-visibility uniformly — same two-source
  // pattern the previous flat table used, just shared across every view now instead of one table.
  const allEngagements = useMemo(() => [...engagements, ...archivedOnly], [engagements, archivedOnly]);
  const filteredEngagements = useMemo(() => {
    const matched = allEngagements.filter((e) => matchesEngagementRow(e, projectTitleOf(e.projectId), statusFilter, filters));
    if (role !== "government" || !myMinistryOnly || !ministryId) return matched;
    return matched.filter((e) => {
      const project = getProject(e.projectId);
      return project ? projectMatchesMinistry(project, ministryId) : false;
    });
  }, [allEngagements, projectTitleOf, statusFilter, filters, role, myMinistryOnly, ministryId, getProject]);

  const columns: ColumnDef<InvestorEngagement, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "investorName",
        header: "Investor",
        cell: ({ row }) => (
          // Bounded width + truncate on both lines — an unconstrained stacked name/org pair can
          // otherwise force the whole table wider than its panel (same fix as the Users workspace
          // and ReportStat's overflow bug).
          <div className="min-w-0 max-w-[200px]">
            <p className="truncate text-white font-medium" title={row.original.investorName}>
              {row.original.investorName}
            </p>
            {row.original.investorOrganization && (
              <p className="truncate text-xs" style={{ color: "var(--color-text-muted)" }} title={row.original.investorOrganization}>
                {row.original.investorOrganization}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "project",
        header: "Project",
        accessorFn: (row) => projectTitleOf(row.projectId),
        // Truncation belongs to the column, not to the string. Slicing at 50 characters cut
        // "Goromonzi Agro Processing Industrial Park (Special Economic Zone)" to "…Park (Special"
        // — mid-parenthesis, with no ellipsis to signal that anything had been removed, and it cut
        // at the same point whether the column was wide or narrow. This lets the cell take the room
        // it has, marks the cut, and keeps the full title on hover.
        cell: ({ row }) => {
          const title = projectTitleOf(row.original.projectId);
          return (
            <span className="block max-w-[22rem] truncate" title={title}>
              {title}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const engagement = row.original;
          if (!canManage) return <StatusPill status={engagement.status} />;
          const actions = getAvailableEngagementActions(engagement.status);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                  disabled={actions.length === 0}
                >
                  <StatusPill status={engagement.status} />
                  {actions.length > 0 && <ChevronDown className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />}
                </button>
              </DropdownMenuTrigger>
              {actions.length > 0 && (
                <DropdownMenuContent align="start">
                  {actions.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={async () => {
                        try {
                          await updateEngagementStatus(engagement.id, status);
                          toast.success(`Moved to ${ENGAGEMENT_STATUS_LABELS[status]}`);
                        } catch {
                          toast.error("Failed to update engagement");
                        }
                      }}
                    >
                      Move to {ENGAGEMENT_STATUS_LABELS[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          );
        },
      },
      { accessorKey: "notes", header: "Notes", cell: ({ row }) => row.original.notes ?? "—" },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
      },
    ],
    [canManage, projectTitleOf, updateEngagementStatus]
  );

  // Publish (draft -> submitted) helper handed to the wizard, mirroring the drawer's publish call.
  const publishEngagement = async (id: string, payload: Record<string, unknown>): Promise<boolean> => {
    const res = await fetch(`/api/engagements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not publish the engagement.");
      return false;
    }
    await refreshAll();
    return true;
  };

  if (!authLoading && !isAuthenticated) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }
  if (!authLoading && !isQualified) {
    return (
      <QualificationRequiredNotice
        feature="Engagements"
        description="Track and log formal investor engagements on active projects once your investor profile is qualified."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Engagements</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {engagements.length} investor engagements tracked across the pipeline.
        </p>
      </div>

      <EngagementFiltersBar
        engagements={allEngagements}
        projectTitleOf={projectTitleOf}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        filters={filters}
        onFiltersChange={setFilters}
        toolbarEnd={
          canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Engagement
            </Button>
          )
        }
        viewSwitcher={<PipelineViewSwitcher view={view} onChange={changeView} />}
        extraPills={
          role === "government" &&
          ministryId && (
            <Pill active={myMinistryOnly} onClick={() => setMyMinistryOnly((v) => !v)}>
              My Ministry Only (
              {allEngagements.filter((e) => {
                const project = getProject(e.projectId);
                return project ? projectMatchesMinistry(project, ministryId) : false;
              }).length}
              )
            </Pill>
          )
        }
      />

      {view === "kanban" && (
        <EngagementKanbanView
          engagements={filteredEngagements}
          projectTitleOf={projectTitleOf}
          onCardClick={(e) => setSelectedId(e.id)}
        />
      )}
      {view === "list" && (
        <EngagementListView
          engagements={filteredEngagements}
          projectTitleOf={projectTitleOf}
          onCardClick={(e) => setSelectedId(e.id)}
        />
      )}
      {view === "matrix" && (
        <EngagementMatrixView
          engagements={filteredEngagements}
          projectTitleOf={projectTitleOf}
          onCardClick={(e) => setSelectedId(e.id)}
        />
      )}
      {view === "table" && (
        <DataTable
          columns={columns}
          data={filteredEngagements}
          isLoading={isLoading || authLoading}
          emptyMessage="No investor engagements recorded yet."
          onRowClick={(row) => setSelectedId(row.id)}
          hideSearch
        />
      )}

      <EngagementDetailDrawer
        engagement={filteredEngagements.find((e) => e.id === selectedId) ?? allEngagements.find((e) => e.id === selectedId) ?? null}
        projectTitle={selectedId ? projectTitleOf(allEngagements.find((e) => e.id === selectedId)?.projectId ?? "") : undefined}
        onClose={() => setSelectedId(null)}
        isStaff={canManage}
        onUpdated={refreshAll}
      />

      <NewEngagementWizard
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects.map((p) => ({ id: p.id, title: p.title }))}
        defaultInvestorName={name ?? ""}
        canSelfInitiate={canSelfInitiate && !canManage}
        addEngagement={addEngagement}
        publishEngagement={publishEngagement}
        onCreated={(created) => setSelectedId(created.id)}
      />
    </div>
  );
}
