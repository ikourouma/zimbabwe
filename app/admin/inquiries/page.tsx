"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";

const VIEW_STORAGE_KEY = "zimbabwe.inquiries.admin.view";

/** Distinct queue rather than a new console page (entitlement governance follow-up) — a
 *  qualified-investor application is an access-entitlement request, not an ordinary contact-form
 *  message, so it deserves a countable, one-click view even though it shares this same page and
 *  table. Defaults to "all" so today's view is unchanged. */
type InquiryCategoryFilter = "all" | "investor";

export default function AdminInquiriesPage() {
  const { inquiries, updateInquiryStatus, isLoading } = useLeadCapture();
  const { sectors } = useTaxonomyStore();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InquiryStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<InquiryCategoryFilter>("all");
  const [filters, setFilters] = useState<InquiryFilters>(DEFAULT_INQUIRY_FILTERS);
  const [view, setView] = useState<PipelineView>("kanban");
  const [pendingDecision, setPendingDecision] = useState<{ inquiry: LeadInquiry; action: InquiryDecisionAction } | null>(
    null
  );

  // Deep-link from the analytics "Lead / Pending Inquiries" KPI card (?status=pending). The card's
  // "unassigned" concept maps to our pending state; any unknown value falls back to "all".
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "pending" || status === "approved" || status === "declined" || status === "changes_requested") {
      setStatusFilter(status);
    }
    if (params.get("category") === "investor") setCategoryFilter("investor");
    const savedView = localStorage.getItem(VIEW_STORAGE_KEY) as PipelineView | null;
    if (savedView === "kanban" || savedView === "list" || savedView === "table" || savedView === "matrix") {
      setView(savedView);
    }
  }, []);

  const applyView = (next: PipelineView) => {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  const investorInquiries = useMemo(
    () => inquiries.filter((i) => i.type === "strategic_partnership" && i.engagementType === "investor"),
    [inquiries]
  );

  const categoryScopedInquiries = categoryFilter === "investor" ? investorInquiries : inquiries;

  const filtered = useMemo(
    () => categoryScopedInquiries.filter((i) => matchesInquiryRow(i, statusFilter, filters)),
    [categoryScopedInquiries, statusFilter, filters]
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
    a.download = `zida-${categoryFilter === "investor" ? "investor-applications" : "inquiries"}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
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

  if (!authLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with an admin account to review and action investor inquiries."
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Inquiries</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {categoryFilter === "investor"
              ? `${investorInquiries.length} Qualified Investor applications — approving one grants Deal Room access.`
              : `${inquiries.length} inquiries submitted via Contact Form, Investor Registration, and Strategic Partnership channels.`}
          </p>
        </div>
        <PipelineViewSwitcher view={view} onChange={applyView} />
      </div>

      <div
        className="mb-4 inline-flex items-center gap-0.5 rounded-md p-0.5"
        style={{ border: "1px solid var(--color-sovereign-border)", backgroundColor: "rgba(255,255,255,0.03)" }}
        role="tablist"
        aria-label="Inquiry category"
      >
        <button
          type="button"
          role="tab"
          aria-selected={categoryFilter === "all"}
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "rounded px-3 py-1.5 text-xs font-medium transition-colors",
            categoryFilter === "all"
              ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
              : "text-[var(--color-text-muted)] hover:text-white"
          )}
        >
          All Inquiries
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={categoryFilter === "investor"}
          onClick={() => setCategoryFilter("investor")}
          className={cn(
            "rounded px-3 py-1.5 text-xs font-medium transition-colors",
            categoryFilter === "investor"
              ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
              : "text-[var(--color-text-muted)] hover:text-white"
          )}
        >
          Qualified Investor Applications ({investorInquiries.length})
        </button>
      </div>

      <InquiryFiltersBar
        inquiries={categoryScopedInquiries}
        sectors={sectors}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        filters={filters}
        onFiltersChange={setFilters}
        onExportCsv={exportCsv}
        exportCount={filtered.length}
      />

      {isLoading || authLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="dashboard-panel p-5 space-y-2">
              <div className="dashboard-skeleton h-3.5 w-1/3" />
              <div className="dashboard-skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : categoryScopedInquiries.length === 0 ? (
        <div className="dashboard-panel p-10 text-center" style={{ color: "var(--color-text-muted)" }}>
          {categoryFilter === "investor" ? "No Qualified Investor applications yet." : "No inquiries yet."}
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
        usersHref={(userId) => `/admin/users?userId=${userId}`}
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
