"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { InvestorEngagement } from "@/lib/types";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { useProjectStore } from "@/context/project-store-context";
import { useAuth } from "@/context/auth-context";
import { EngagementStatusPill } from "@/components/deal-room/engagement-status-pill";
import { EngagementDetailDrawer } from "@/components/deal-room/engagement-detail-drawer";
import { DataTable } from "@/components/dashboard/data-table";
import { MouFiltersBar } from "@/components/dashboard/mou-filters-bar";
import { MouKanbanView, MouListView, MouMatrixView } from "@/components/dashboard/mou-views";
import { PipelineViewSwitcher, type PipelineView } from "@/components/deal-room/pipeline-view-switcher";
import { DEFAULT_MOU_FILTERS, MOU_STAGE_LABELS, matchesMouRow, mouStageOf, type MouFilters, type MouStageFilter } from "@/lib/governance/mou-filters";

interface MouRegistryViewProps {
  /** Base path used for the persisted view-preference key (e.g. "/admin/mou"). */
  basePath: string;
}

/**
 * Shared MOU registry (Platform Feedback Batch v3, Phase 8) used across /admin/mou,
 * /super-admin/mou, /ministry/mou, and /deal-room/mou — the underlying data is always
 * GET /api/engagements (already role-scoped server-side: full visibility for admin/super_admin,
 * own-ministry for ministry_admin, own-engagements-only for qualified), this component just adds
 * the Kanban/List/Table/Matrix chrome grouped by MOU lifecycle stage instead of project status.
 * Row click opens the existing EngagementDetailDrawer straight to its MOU tab — no MOU UI is
 * rebuilt here, only surfaced through a new list.
 */
export function MouRegistryView({ basePath }: MouRegistryViewProps) {
  const { engagements, isLoading, refresh } = useDealRoomStore();
  const { getProject } = useProjectStore();
  const { role, isLoading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<MouStageFilter>("all");
  const [filters, setFilters] = useState<MouFilters>(DEFAULT_MOU_FILTERS);
  const [view, setView] = useState<PipelineView>("table");
  const mountedRef = useRef(false);
  const viewStorageKey = `zimbabwe.registry.${basePath}.view`;

  // ministry_admin gets the same MOU tab access as staff (read-only oversight — MouPanel already
  // degrades gracefully since canEditMouContent/isZidaApproverRole exclude them), but Messages
  // becomes readOnly instead of the "isStaff" composer, per the Subject Dropdown + Ministry
  // Engagements plan, Part B.
  const isZidaStaff = role === "admin" || role === "super_admin" || role === "government";
  const isMinistryAdmin = role === "ministry_admin";

  const projectTitleOf = useCallback((projectId: string) => getProject(projectId)?.title ?? "Unknown project", [getProject]);

  useEffect(() => {
    if (!mountedRef.current) mountedRef.current = true;
    const savedView = localStorage.getItem(viewStorageKey) as PipelineView | null;
    if (savedView === "kanban" || savedView === "list" || savedView === "table" || savedView === "matrix") {
      setView(savedView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeView = (next: PipelineView) => {
    setView(next);
    localStorage.setItem(viewStorageKey, next);
  };

  const filteredEngagements = useMemo(
    () => engagements.filter((e) => matchesMouRow(e, projectTitleOf(e.projectId), stageFilter, filters)),
    [engagements, projectTitleOf, stageFilter, filters]
  );

  const selectedEngagement = engagements.find((e) => e.id === selectedId) ?? null;

  const exportCsv = () => {
    const header = ["Investor", "Organization", "Project", "Engagement Status", "MOU Stage", "Ticket Size", "Updated At"];
    const lines = filteredEngagements.map((e) =>
      [
        e.investorName,
        e.investorOrganization ?? "",
        projectTitleOf(e.projectId),
        e.status,
        MOU_STAGE_LABELS[mouStageOf(e)],
        e.ticketSize ?? "",
        new Date(e.updatedAt).toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `zida-mou-registry-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredEngagements.length} MOU record(s)`);
  };

  const columns: ColumnDef<InvestorEngagement, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "investorName",
        header: "Investor",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[200px]">
            <p className="truncate text-white font-medium">{row.original.investorName}</p>
            {row.original.investorOrganization && (
              <p className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                {row.original.investorOrganization}
              </p>
            )}
          </div>
        ),
      },
      { id: "project", header: "Project", accessorFn: (row) => projectTitleOf(row.projectId) },
      {
        accessorKey: "status",
        header: "Engagement Status",
        cell: ({ row }) => <EngagementStatusPill status={row.original.status} />,
      },
      {
        id: "mouStage",
        header: "MOU Stage",
        accessorFn: (row) => MOU_STAGE_LABELS[mouStageOf(row)],
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

  return (
    <div>
      <MouFiltersBar
        engagements={engagements}
        projectTitleOf={projectTitleOf}
        stageFilter={stageFilter}
        onStageFilterChange={setStageFilter}
        filters={filters}
        onFiltersChange={setFilters}
        onExportCsv={exportCsv}
        exportCount={filteredEngagements.length}
        viewSwitcher={<PipelineViewSwitcher view={view} onChange={changeView} />}
      />

      {view === "kanban" && (
        <MouKanbanView engagements={filteredEngagements} projectTitleOf={projectTitleOf} onCardClick={(e) => setSelectedId(e.id)} />
      )}
      {view === "list" && (
        <MouListView engagements={filteredEngagements} projectTitleOf={projectTitleOf} onCardClick={(e) => setSelectedId(e.id)} />
      )}
      {view === "matrix" && (
        <MouMatrixView engagements={filteredEngagements} projectTitleOf={projectTitleOf} onCardClick={(e) => setSelectedId(e.id)} />
      )}
      {view === "table" && (
        <DataTable
          columns={columns}
          data={filteredEngagements}
          isLoading={isLoading || authLoading}
          emptyMessage="No MOUs match this filter."
          hideSearch
          onRowClick={(row) => setSelectedId(row.id)}
        />
      )}

      <EngagementDetailDrawer
        engagement={selectedEngagement}
        projectTitle={selectedEngagement ? projectTitleOf(selectedEngagement.projectId) : undefined}
        onClose={() => setSelectedId(null)}
        isStaff={isZidaStaff}
        readOnly={isMinistryAdmin}
        canMessage={isMinistryAdmin}
        onUpdated={refresh}
        defaultTab="mou"
      />
    </div>
  );
}
