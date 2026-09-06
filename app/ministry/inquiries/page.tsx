"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLeadCapture } from "@/context/lead-capture-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useAuth } from "@/context/auth-context";
import { useProjectStore } from "@/context/project-store-context";
import type { LeadInquiry } from "@/lib/types";
import { AccessGate } from "@/components/dashboard/access-gate";
import { InquiryFiltersBar } from "@/components/dashboard/inquiry-filters-bar";
import { InquiryDetailDrawer } from "@/components/dashboard/inquiry-detail-drawer";
import { InquiryLoadError } from "@/components/dashboard/inquiry-load-error";
import { InquiryKanbanView, InquiryListView, InquiryMatrixView, InquiryTableView } from "@/components/dashboard/inquiry-views";
import { PipelineViewSwitcher, type PipelineView } from "@/components/deal-room/pipeline-view-switcher";
import {
  DEFAULT_INQUIRY_FILTERS,
  INQUIRY_STATUS_LABELS,
  matchesInquiryRow,
  type InquiryFilters,
  type InquiryStatusFilter,
} from "@/lib/governance/inquiry-filters";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import { cn } from "@/lib/utils";
import { formatInquiryType } from "@/lib/utils/inquiry-display";

const VIEW_STORAGE_KEY = "zimbabwe.inquiries.ministry.view";

/**
 * Ministry-scoped Inquiries console — same Kanban/List/Table/Matrix switcher as Admin, but
 * decisions stay read-only. Approve auto-upgrades the applicant to Qualified Investor, which
 * remains admin/super_admin-only.
 */
export default function MinistryInquiriesPage() {
  const { inquiries, isLoading, loadFailed } = useLeadCapture();
  const { sectors, ministries, isLoading: taxonomyLoading } = useTaxonomyStore();
  const { isMinistryAdmin, ministryId, isLoading: authLoading } = useAuth();
  const { projects, isLoading: projectsLoading } = useProjectStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InquiryStatusFilter>("all");
  const [filters, setFilters] = useState<InquiryFilters>(DEFAULT_INQUIRY_FILTERS);
  const [myMinistryOnly, setMyMinistryOnly] = useState(true);
  const [view, setView] = useState<PipelineView>("kanban");

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    if (status === "pending" || status === "approved" || status === "declined" || status === "changes_requested") {
      setStatusFilter(status);
    }
    const savedView = localStorage.getItem(VIEW_STORAGE_KEY) as PipelineView | null;
    if (savedView === "kanban" || savedView === "list" || savedView === "table" || savedView === "matrix") {
      setView(savedView);
    }
  }, []);

  const applyView = (next: PipelineView) => {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  const ministry = ministries.find((m) => m.id === ministryId);

  const ministryProjectIds = useMemo(
    () => new Set(ministryId ? projects.filter((p) => projectMatchesMinistry(p, ministryId)).map((p) => p.id) : []),
    [projects, ministryId]
  );

  const isMinistryInquiry = useMemo(
    () => (inq: LeadInquiry) => {
      if (inq.projectId && ministryProjectIds.has(inq.projectId)) return true;
      if (!ministry || !inq.ministryRepresented) return false;
      const rep = inq.ministryRepresented.trim().toLowerCase();
      return rep === ministry.name.toLowerCase() || rep === ministry.shortName.toLowerCase();
    },
    [ministry, ministryProjectIds]
  );

  const filtered = useMemo(
    () => inquiries.filter((i) => matchesInquiryRow(i, statusFilter, filters)),
    [inquiries, statusFilter, filters]
  );

  const visible = useMemo(
    () => (myMinistryOnly ? filtered.filter(isMinistryInquiry) : filtered),
    [filtered, myMinistryOnly, isMinistryInquiry]
  );

  const exportCsv = () => {
    const header = ["Name", "Email", "Phone", "Organization", "Type", "Status", "Submitted At", "Message"];
    const lines = visible.map((i) =>
      [
        i.name,
        i.email,
        i.phone ?? "",
        i.organization ?? "",
        formatInquiryType(i.type),
        INQUIRY_STATUS_LABELS[i.status ?? "pending"],
        new Date(i.createdAt).toISOString(),
        i.message ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ministry-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${visible.length} inquiries`);
  };

  const selected = visible.find((i) => i.id === selectedId) ?? null;
  const loading = isLoading || authLoading || taxonomyLoading || projectsLoading;

  if (!authLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to review strategic inquiries related to your ministry."
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Inquiries</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Read-only visibility into strategic inquiries — decisions (Approve/Request Info/Decline) stay with the ZIDA
            deal team, since approving automatically upgrades the applicant to Qualified Investor.
          </p>
        </div>
        <PipelineViewSwitcher view={view} onChange={applyView} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMyMinistryOnly((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            myMinistryOnly
              ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-white"
              : "border-[var(--color-sovereign-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/50"
          )}
          title="Toggle between inquiries tied to your ministry and every inquiry on the platform"
        >
          My Ministry Only ({filtered.filter(isMinistryInquiry).length})
        </button>
      </div>

      <InquiryFiltersBar
        inquiries={inquiries}
        sectors={sectors}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        filters={filters}
        onFiltersChange={setFilters}
        onExportCsv={exportCsv}
        exportCount={visible.length}
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="dashboard-panel p-5 space-y-2">
              <div className="dashboard-skeleton h-3.5 w-1/3" />
              <div className="dashboard-skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : loadFailed ? (
        <InquiryLoadError />
      ) : visible.length === 0 ? (
        <div className="dashboard-panel p-10 text-center" style={{ color: "var(--color-text-muted)" }}>
          No inquiries match this filter.
        </div>
      ) : (
        <>
          {view === "kanban" && <InquiryKanbanView inquiries={visible} selectedId={selectedId} onCardClick={(i) => setSelectedId(i.id)} />}
          {view === "list" && <InquiryListView inquiries={visible} selectedId={selectedId} onCardClick={(i) => setSelectedId(i.id)} />}
          {view === "table" && <InquiryTableView inquiries={visible} onCardClick={(i) => setSelectedId(i.id)} />}
          {view === "matrix" && <InquiryMatrixView inquiries={visible} selectedId={selectedId} onCardClick={(i) => setSelectedId(i.id)} />}
        </>
      )}

      <InquiryDetailDrawer
        inquiry={selected}
        onClose={() => setSelectedId(null)}
        usersHref={(userId) => `/ministry/users?userId=${userId}`}
      />
    </div>
  );
}
