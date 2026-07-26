"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ShieldAlert, X } from "lucide-react";
import { useLeadCapture } from "@/context/lead-capture-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useAuth } from "@/context/auth-context";
import type { LeadInquiry } from "@/lib/types";
import { AccessGate } from "@/components/dashboard/access-gate";
import { Button } from "@/components/ui/button";
import { InquiryFiltersBar } from "@/components/dashboard/inquiry-filters-bar";
import {
  DEFAULT_INQUIRY_FILTERS,
  INQUIRY_STATUS_LABELS,
  matchesInquiryRow,
  type InquiryFilters,
  type InquiryStatusFilter,
} from "@/lib/governance/inquiry-filters";
import { cn } from "@/lib/utils";
import { formatInquiryType } from "@/lib/utils/inquiry-display";

/** Routing category that marks a contact reason as addressed straight to the platform owner
 *  (Super Admin) rather than the shared ZIDA admin queue — see "Platform / Executive Escalation"
 *  in lib/data/taxonomies.ts. Super admin sees these in a dedicated inbox, distinct from
 *  /admin/inquiries (which shows every inquiry, including these). */
const EXECUTIVE_ROUTING_CATEGORY = "executive";

function statusDotColor(status: LeadInquiry["status"]) {
  if (status === "approved") return "#4ade80";
  if (status === "declined") return "#9ca3af";
  return "#fde047";
}

/**
 * Super Admin's dedicated inbox for inquiries specifically addressed to the platform owner
 * (Afronovation) — filtered to the "Platform / Executive Escalation" contact reason (or any future
 * contact reason tagged with the same "executive" routing category), so board-level or
 * platform-governance matters don't get lost in the shared ZIDA admin inquiries queue.
 */
export default function SuperAdminInquiriesPage() {
  const { inquiries, updateInquiryStatus, isLoading } = useLeadCapture();
  const { contactReasons, sectors, isLoading: taxonomyLoading } = useTaxonomyStore();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InquiryStatusFilter>("all");
  const [filters, setFilters] = useState<InquiryFilters>(DEFAULT_INQUIRY_FILTERS);

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

  const selected = filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null;

  const handleStatus = async (id: string, status: NonNullable<LeadInquiry["status"]>) => {
    try {
      await updateInquiryStatus(id, status);
      toast.success(status === "approved" ? "Inquiry approved" : status === "declined" ? "Inquiry declined" : "Status reset");
    } catch {
      toast.error("Failed to update inquiry");
    }
  };

  if (!authLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a super admin pilot account to review inquiries addressed to the platform owner."
      />
    );
  }

  const busy = isLoading || authLoading || taxonomyLoading;

  return (
    <div>
      <div className="mb-6 flex items-start gap-3">
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
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="dashboard-panel p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="dashboard-skeleton h-3.5 w-2/3" />
                <div className="dashboard-skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
          <div className="dashboard-panel p-6 space-y-3">
            <div className="dashboard-skeleton h-5 w-1/3" />
            <div className="dashboard-skeleton h-3.5 w-full" />
          </div>
        </div>
      ) : executiveInquiries.length === 0 ? (
        <div className="dashboard-panel p-10 text-center" style={{ color: "var(--color-text-muted)" }}>
          No inquiries have been addressed to the Platform Admin yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="dashboard-panel overflow-hidden">
            <ul className="max-h-[640px] overflow-y-auto">
              {filtered.map((inq) => (
                <li key={inq.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(inq.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b transition-colors hover:bg-white/5",
                      selected?.id === inq.id && "bg-white/5"
                    )}
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">{inq.name}</p>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusDotColor(inq.status) }} />
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {inq.email}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(inq.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="dashboard-panel p-6">
            {!selected ? (
              <p style={{ color: "var(--color-text-muted)" }}>No inquiry matches your search.</p>
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selected.name}</h2>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {selected.email}
                      {selected.phone ? ` · ${selected.phone}` : ""}
                      {selected.organization ? ` · ${selected.organization}` : ""}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{
                      backgroundColor:
                        selected.status === "approved"
                          ? "rgba(0,100,0,0.2)"
                          : selected.status === "declined"
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(255,211,0,0.15)",
                      color:
                        selected.status === "approved" ? "#86efac" : selected.status === "declined" ? "#d1d5db" : "#fde047",
                    }}
                  >
                    {(selected.status ?? "pending").toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                      Type
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                      {formatInquiryType(selected.type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                      Submitted
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                      {new Date(selected.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selected.message && (
                  <div className="mb-4">
                    <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>
                      Message
                    </p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {selected.message}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {(selected.status ?? "pending") === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => handleStatus(selected.id, "approved")}>
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatus(selected.id, "declined")}>
                        <X className="h-3.5 w-3.5" /> Decline
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => handleStatus(selected.id, "pending")}>
                      Reset to pending
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
