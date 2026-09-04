"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { useLeadCapture } from "@/context/lead-capture-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useAuth } from "@/context/auth-context";
import type { LeadInquiry } from "@/lib/types";
import { AccessGate } from "@/components/dashboard/access-gate";
import { InquiryFiltersBar } from "@/components/dashboard/inquiry-filters-bar";
import { InquiryDecisionModal, type InquiryDecisionAction } from "@/components/dashboard/inquiry-decision-modal";
import { InquiryDetailDrawer } from "@/components/dashboard/inquiry-detail-drawer";
import { InquiryKanbanView, InquiryListView, InquiryMatrixView, InquiryTableView } from "@/components/dashboard/inquiry-views";
import { PipelineViewSwitcher, type PipelineView } from "@/components/deal-room/pipeline-view-switcher";
import {
  DEFAULT_INQUIRY_FILTERS,
  INQUIRY_STATUS_LABELS,
  matchesInquiryRow,
  type InquiryFilters,
  type InquiryStatusFilter,
} from "@/lib/governance/inquiry-filters";
import { formatInquiryType, isInquiryKycComplete } from "@/lib/utils/inquiry-display";

/** Routing category that marks a contact reason as addressed straight to the platform owner
 *  (Super Admin) rather than the shared ZIDA admin queue — see "Platform / Executive Escalation"
 *  in lib/data/taxonomies.ts. Super admin sees these in a dedicated inbox, distinct from
 *  /admin/inquiries (which shows every inquiry, including these). */
const EXECUTIVE_ROUTING_CATEGORY = "executive";

const VIEW_STORAGE_KEY = "zimbabwe.inquiries.super-admin.view";

/**
 * Super Admin's dedicated inbox for inquiries specifically addressed to the platform owner
 * (Afronovation) — filtered to the "Platform / Executive Escalation" contact reason (or any future
 * contact reason tagged with the same "executive" routing category), so board-level or
 * platform-governance matters don't get lost in the shared ZIDA admin inquiries queue. Same
 * Kanban/List/Table/Matrix view switcher + detail drawer as /admin/inquiries (Platform Feedback
 * Batch v4, Phase 7) — the two pages share InquiryDetailDrawer/inquiry-views.tsx, differing only in
 * this page's own executive-only pre-filter and its own Users & Roles link base path.
 */
export default function SuperAdminInquiriesPage() {
  const { inquiries, updateInquiryStatus, isLoading } = useLeadCapture();
  const { contactReasons, sectors, isLoading: taxonomyLoading } = useTaxonomyStore();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InquiryStatusFilter>("all");
  const [filters, setFilters] = useState<InquiryFilters>(DEFAULT_INQUIRY_FILTERS);
  const [view, setView] = useState<PipelineView>("kanban");
  const [pendingDecision, setPendingDecision] = useState<{ inquiry: LeadInquiry; action: InquiryDecisionAction } | null>(
    null
  );

  useEffect(() => {
    const savedView = localStorage.getItem(VIEW_STORAGE_KEY) as PipelineView | null;
    if (savedView === "kanban" || savedView === "list" || savedView === "table" || savedView === "matrix") {
      setView(savedView);
    }
  }, []);

  const applyView = (next: PipelineView) => {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  const executiveReasonIds = useMemo(
    () => new Set(contactReasons.filter((cr) => cr.routingCategory === EXECUTIVE_ROUTING_CATEGORY).map((cr) => cr.id)),
    [contactReasons]
  );

  const executiveInquiries = useMemo(
    () => inquiries.filter((i) => i.contactReasonId && executiveReasonIds.has(i.contactReasonId)),
    [inquiries, executiveReasonIds]
  );

  const filtered = useMemo(
    () => executiveInquiries.filter((i) => matchesInquiryRow(i, statusFilter, filters)),
    [executiveInquiries, statusFilter, filters]
  );

  const exportCsv = () => {
    const header = ["Name", "Email", "Phone", "Organization", "Type", "Status", "Submitted At", "Message"];
    const lines = filtered.map((i) =>
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
    a.download = `zida-executive-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} inquiries`);
  };

  const selected = filtered.find((i) => i.id === selectedId) ?? null;

  const resetToPending = async (id: string) => {
    try {
      await updateInquiryStatus(id, "pending");
      toast.success("Status reset");
    } catch {
      toast.error("Failed to update inquiry");
    }
  };

  const confirmDecision = async (reason: string) => {
    if (!pendingDecision) return;
    try {
      await updateInquiryStatus(pendingDecision.inquiry.id, pendingDecision.action, reason);
      toast.success(
        pendingDecision.action === "approved"
          ? "Inquiry approved"
          : pendingDecision.action === "declined"
            ? "Inquiry declined"
            : "Request for more information sent"
      );
      setPendingDecision(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update inquiry");
    }
  };

  if (!authLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with a super admin account to review inquiries addressed to the platform owner."
      />
    );
  }

  const busy = isLoading || authLoading || taxonomyLoading;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,211,0,0.12)" }}>
            <ShieldAlert className="h-4.5 w-4.5" style={{ color: "var(--color-gold)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Platform Admin Inquiries</h1>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {executiveInquiries.length} inquiries submitted under &ldquo;Platform / Executive Escalation&rdquo; — addressed
              directly to the platform owner, separate from the shared ZIDA admin queue.
            </p>
          </div>
        </div>
        <PipelineViewSwitcher view={view} onChange={applyView} />
      </div>

      <InquiryFiltersBar
        inquiries={executiveInquiries}
        sectors={sectors}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        filters={filters}
        onFiltersChange={setFilters}
        onExportCsv={exportCsv}
        exportCount={filtered.length}
      />

      {busy ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="dashboard-panel p-5 space-y-2">
              <div className="dashboard-skeleton h-3.5 w-1/3" />
              <div className="dashboard-skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : executiveInquiries.length === 0 ? (
        <div className="dashboard-panel p-10 text-center" style={{ color: "var(--color-text-muted)" }}>
          No inquiries have been addressed to the Platform Admin yet.
        </div>
      ) : (
        <>
          {view === "kanban" && <InquiryKanbanView inquiries={filtered} selectedId={selectedId} onCardClick={(i) => setSelectedId(i.id)} />}
          {view === "list" && <InquiryListView inquiries={filtered} selectedId={selectedId} onCardClick={(i) => setSelectedId(i.id)} />}
          {view === "table" && <InquiryTableView inquiries={filtered} onCardClick={(i) => setSelectedId(i.id)} />}
          {view === "matrix" && <InquiryMatrixView inquiries={filtered} selectedId={selectedId} onCardClick={(i) => setSelectedId(i.id)} />}
        </>
      )}

      <InquiryDetailDrawer
        inquiry={selected}
        onClose={() => setSelectedId(null)}
        usersHref={(userId) => `/super-admin/users?userId=${userId}`}
        onDecide={(inquiry, action) => setPendingDecision({ inquiry, action })}
        onResetToPending={resetToPending}
      />

      <InquiryDecisionModal
        inquiry={pendingDecision?.inquiry ?? null}
        action={pendingDecision?.action ?? null}
        kycComplete={pendingDecision ? isInquiryKycComplete(pendingDecision.inquiry) : true}
        onConfirm={confirmDecision}
        onCancel={() => setPendingDecision(null)}
      />
    </div>
  );
}
