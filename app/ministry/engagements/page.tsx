"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { InvestorEngagement } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { useProjectStore } from "@/context/project-store-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import {
  DEFAULT_ENGAGEMENT_FILTERS,
  matchesEngagementRow,
  type EngagementFilters,
  type EngagementStatusFilter,
} from "@/lib/governance/engagement-filters";
import { EngagementStatusPill as StatusPill } from "@/components/deal-room/engagement-status-pill";
import { EngagementDetailDrawer } from "@/components/deal-room/engagement-detail-drawer";
import { EngagementFiltersBar } from "@/components/dashboard/engagement-filters-bar";
import { EngagementKanbanView, EngagementListView, EngagementMatrixView } from "@/components/dashboard/engagement-views";
import { PipelineViewSwitcher, type PipelineView } from "@/components/deal-room/pipeline-view-switcher";
import { DataTable } from "@/components/dashboard/data-table";

const VIEW_KEY = "zimbabwe.ministry.engagementsView";

/**
 * Ministry-scoped Engagements registry (Subject Dropdown + Ministry Engagements plan, Part B) —
 * read-only oversight into every investor engagement tied to the ministry_admin's own ministry's
 * projects. GET /api/engagements already ministry-scopes server-side for this role (see
 * app/api/engagements/route.ts), so no separate data-fetch scoping is needed here. Deliberately no
 * "New Engagement" button, no status-change dropdown, and the drawer opens read-only — engagement
 * creation and lifecycle decisions stay with the investor/ZIDA deal team, not the ministry.
 */
export default function MinistryEngagementsPage() {
  const { isMinistryAdmin, isLoading: authLoading } = useAuth();
  const { engagements, refresh, isLoading } = useDealRoomStore();
  const { getProject } = useProjectStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EngagementStatusFilter>("all");
  const [filters, setFilters] = useState<EngagementFilters>(DEFAULT_ENGAGEMENT_FILTERS);
  const [view, setView] = useState<PipelineView>("table");

  // GET /api/engagements excludes archived rows by default — the "Include archived" filter needs
  // its own archived-inclusive fetch, mirroring /deal-room/engagements.
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

  const projectTitleOf = useCallback((projectId: string) => getProject(projectId)?.title ?? "Unknown project", [getProject]);

  const allEngagements = useMemo(() => [...engagements, ...archivedOnly], [engagements, archivedOnly]);
  const filteredEngagements = useMemo(
    () => allEngagements.filter((e) => matchesEngagementRow(e, projectTitleOf(e.projectId), statusFilter, filters)),
    [allEngagements, projectTitleOf, statusFilter, filters]
  );

  const columns: ColumnDef<InvestorEngagement, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "investorName",
        header: "Investor",
        cell: ({ row }) => (
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
        cell: ({ row }) => projectTitleOf(row.original.projectId).slice(0, 50),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      { accessorKey: "ticketSize", header: "Ticket Size", cell: ({ row }) => row.original.ticketSize ?? "—" },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
      },
    ],
    [projectTitleOf]
  );

  if (!authLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to view investor engagements on your ministry's projects."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Engagements</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {engagements.length} investor engagement{engagements.length === 1 ? "" : "s"} tracked on your ministry&apos;s
          projects. Read-only — engagement creation and status changes stay with the investor and the ZIDA deal team.
        </p>
      </div>

      <EngagementFiltersBar
        engagements={allEngagements}
        projectTitleOf={projectTitleOf}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        filters={filters}
        onFiltersChange={setFilters}
        viewSwitcher={<PipelineViewSwitcher view={view} onChange={changeView} />}
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
          emptyMessage="No investor engagements recorded on your ministry's projects yet."
          onRowClick={(row) => setSelectedId(row.id)}
          hideSearch
        />
      )}

      <EngagementDetailDrawer
        engagement={filteredEngagements.find((e) => e.id === selectedId) ?? allEngagements.find((e) => e.id === selectedId) ?? null}
        projectTitle={selectedId ? projectTitleOf(allEngagements.find((e) => e.id === selectedId)?.projectId ?? "") : undefined}
        onClose={() => setSelectedId(null)}
        isStaff={false}
        readOnly
        canMessage
        onUpdated={refreshAll}
      />
    </div>
  );
}
