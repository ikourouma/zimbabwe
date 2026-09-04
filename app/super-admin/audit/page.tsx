"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AuditLogEntry } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useAuditLogs } from "@/lib/hooks/use-audit-logs";
import { DEFAULT_AUDIT_FILTERS, matchesAuditFilters, entityTypeLabel } from "@/lib/governance/audit-taxonomy";
import { ROLE_LABELS } from "@/components/dashboard/role-change-modal";
import { AccessGate } from "@/components/dashboard/access-gate";
import { DataTable } from "@/components/dashboard/data-table";
import { AuditLogFiltersBar } from "@/components/dashboard/audit-log-filters";
import { AuditDetailDrawer } from "@/components/dashboard/audit-detail-drawer";

export default function SuperAdminAuditLogPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const { entries, isLoading } = useAuditLogs();
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  // Deep-link entry point from the Taxonomies workspace's per-row "View history" action — pre-fills
  // the Sovereign Telemetry & Audit Filter Bar's search field with the record's id, surfacing just
  // that record's history without a separate query param/filter path.
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_AUDIT_FILTERS,
    search: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("entityId") ?? "" : "",
  }));

  const filteredEntries = useMemo(() => entries.filter((e) => matchesAuditFilters(e, filters)), [entries, filters]);

  const columns: ColumnDef<AuditLogEntry, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "When",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
      { id: "actor", header: "Actor", accessorFn: (row) => row.actorName ?? "Unknown" },
      {
        id: "actorRole",
        header: "Role",
        cell: ({ row }) => (row.original.actorRole ? ROLE_LABELS[row.original.actorRole] : "—"),
      },
      { accessorKey: "action", header: "Action", cell: ({ row }) => row.original.action.replace(/\./g, " → ") },
      {
        accessorKey: "entityType",
        header: "Entity",
        cell: ({ row }) => entityTypeLabel(row.original.entityType),
      },
      {
        accessorKey: "entityId",
        header: "Entity ID",
        cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.entityId}</span>,
      },
      {
        id: "details",
        header: "Details",
        cell: ({ row }) => {
          const meta = row.original.metadata;
          if (!meta) return "—";
          const entries = Object.entries(meta).filter(([key]) => key !== "actorName");
          if (entries.length === 0) return "—";
          return (
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}
            </span>
          );
        },
      },
    ],
    []
  );

  const exportCsv = () => {
    const header = ["When", "Actor", "Role", "Action", "Entity", "Entity ID", "Details"];
    const lines = filteredEntries.map((e) => {
      const meta = e.metadata ? Object.entries(e.metadata).filter(([key]) => key !== "actorName") : [];
      return [
        new Date(e.createdAt).toISOString(),
        e.actorName ?? "Unknown",
        e.actorRole ? ROLE_LABELS[e.actorRole] : "—",
        e.action,
        entityTypeLabel(e.entityType),
        e.entityId,
        meta.map(([key, value]) => `${key}: ${String(value)}`).join(" · "),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `zida-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with a super admin account to view the governance audit trail."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Audit Log</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Every approve/publish/override/status-change mutation across the platform, most recent first.
        </p>
      </div>

      <AuditLogFiltersBar
        entries={entries}
        filters={filters}
        onFiltersChange={setFilters}
        onExportCsv={exportCsv}
        exportCount={filteredEntries.length}
      />

      <DataTable
        columns={columns}
        data={filteredEntries}
        isLoading={isLoading || authLoading}
        emptyMessage="No audit events match this filter."
        pageSize={20}
        onRowClick={(row) => setSelected(row)}
        hideSearch
      />

      <AuditDetailDrawer entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
