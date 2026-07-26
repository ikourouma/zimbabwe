"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Archive, ChevronDown, Plus } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { useProjectStore } from "@/context/project-store-context";
import { roleToWorkflowRole } from "@/lib/auth/role-map";
import type { InvestorEngagement } from "@/lib/types";
import {
  ENGAGEMENT_STATUS_LABELS,
  getAvailableEngagementActions,
} from "@/lib/governance/engagement-workflow";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { EngagementStatusPill as StatusPill } from "@/components/deal-room/engagement-status-pill";
import { EngagementDetailDrawer } from "@/components/deal-room/engagement-detail-drawer";
import { NewEngagementWizard } from "@/components/deal-room/new-engagement-wizard";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function DealRoomEngagementsPage() {
  const { isQualified, isAuthenticated, role, name, isLoading: authLoading } = useAuth();
  const { engagements, updateEngagementStatus, addEngagement, refresh, isLoading } = useDealRoomStore();
  const { projects, getProject } = useProjectStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // GET /api/engagements excludes archived rows by default (they're hidden from every other
  // pipeline view too) — this page's "Show archived" toggle needs its own archived-inclusive
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

  const workflowRole = role ? roleToWorkflowRole(role) : null;
  const canManage = workflowRole !== null;
  const canSelfInitiate = role === "qualified";

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
            <p className="flex items-center gap-1.5 text-white font-medium">
              <span className="truncate" title={row.original.investorName}>
                {row.original.investorName}
              </span>
              {row.original.archivedAt && (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: "rgba(148,163,184,0.15)", color: "var(--color-text-muted)" }}
                >
                  <Archive className="h-2.5 w-2.5" /> Archived
                </span>
              )}
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
        accessorFn: (row) => getProject(row.projectId)?.title ?? "Unknown project",
        cell: ({ row }) => (getProject(row.original.projectId)?.title ?? "Unknown project").slice(0, 50),
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
    [canManage, getProject, updateEngagementStatus]
  );

  const visibleEngagements = useMemo(
    () => (showArchived ? [...engagements, ...archivedOnly] : engagements),
    [engagements, archivedOnly, showArchived]
  );
  const archivedCount = archivedOnly.length;

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

  if (!authLoading && !isQualified) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Engagements</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {engagements.length} investor engagements tracked across the pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {archivedCount > 0 && (
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--color-text-muted)" }}>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="accent-current"
              />
              Show archived ({archivedCount})
            </label>
          )}
          {(canManage || canSelfInitiate) && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Engagement
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={visibleEngagements}
        isLoading={isLoading || authLoading}
        searchPlaceholder="Search engagements…"
        emptyMessage="No investor engagements recorded yet."
        onRowClick={(row) => setSelectedId(row.id)}
      />

      <EngagementDetailDrawer
        engagement={visibleEngagements.find((e) => e.id === selectedId) ?? null}
        projectTitle={
          selectedId ? getProject(visibleEngagements.find((e) => e.id === selectedId)?.projectId ?? "")?.title : undefined
        }
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
