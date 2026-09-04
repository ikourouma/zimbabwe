"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { InvestmentProject } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/governance/project-workflow";
import { StatusBadge } from "@/components/projects/status-badge";
import { DataTable } from "@/components/dashboard/data-table";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { getSectorById } from "@/lib/data/taxonomies";

interface PipelineTableViewProps {
  projects: InvestmentProject[];
  onCardClick: (project: InvestmentProject) => void;
}

/** Spreadsheet-style view over the same pipeline data, reusing the shared DataTable (search,
 *  sort, pagination) with the same detail-drawer click-through as the Kanban and List views. */
export function PipelineTableView({ projects, onCardClick }: PipelineTableViewProps) {
  const { ministries } = useTaxonomyStore();

  const columns: ColumnDef<InvestmentProject, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Project",
        cell: ({ row }) => <span className="text-white font-medium">{row.original.title}</span>,
      },
      {
        id: "ministry",
        header: "Ministry",
        accessorFn: (row) => ministries.find((m) => m.id === row.primaryBeneficiaryMinistryId)?.shortName ?? "—",
      },
      {
        id: "sector",
        header: "Sector",
        accessorFn: (row) => getSectorById(row.sectorId)?.shortName ?? getSectorById(row.sectorId)?.name ?? "—",
      },
      {
        accessorKey: "projectStatus",
        header: "Status",
        accessorFn: (row) => STATUS_LABELS[row.projectStatus],
        cell: ({ row }) => <StatusBadge status={row.original.projectStatus} />,
      },
      {
        accessorKey: "capitalRequired",
        header: "Capital",
        cell: ({ row }) => row.original.capitalRequired ?? "—",
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
      },
    ],
    [ministries]
  );

  return (
    <DataTable
      columns={columns}
      data={projects}
      emptyMessage="No projects match the current filters."
      onRowClick={onCardClick}
      getRowId={(row) => row.id}
      hideSearch
    />
  );
}
