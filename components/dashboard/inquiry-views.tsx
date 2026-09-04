"use client";

import { useMemo } from "react";
import { ChevronRight, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { LeadInquiry } from "@/lib/types";
import { INQUIRY_STATUS_LABELS, INQUIRY_STATUS_ORDER, INQUIRY_TYPE_ORDER } from "@/lib/governance/inquiry-filters";
import { formatInquiryType, isInquiryKycComplete } from "@/lib/utils/inquiry-display";
import { DataTable } from "@/components/dashboard/data-table";
import { cn } from "@/lib/utils";

/** Same status colors the old master-detail page used — kept as the one shared source now that
 *  four views (not one list) all need to render the same dot. */
function statusDotColor(status: LeadInquiry["status"]) {
  if (status === "approved") return "#4ade80";
  if (status === "declined") return "#9ca3af";
  if (status === "changes_requested") return "#fbbf24";
  return "#fde047";
}

interface InquiryViewProps {
  inquiries: LeadInquiry[];
  selectedId?: string | null;
  onCardClick: (inquiry: LeadInquiry) => void;
}

function InquiryCard({
  inquiry,
  selected,
  onClick,
}: {
  inquiry: LeadInquiry;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "dashboard-panel w-full rounded-md p-3 text-left text-sm hover:ring-2 hover:ring-[var(--color-gold)]/60 transition-shadow",
        selected && "ring-2 ring-[var(--color-gold)]/60"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium leading-snug text-white truncate">{inquiry.name}</p>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusDotColor(inquiry.status) }} />
      </div>
      <p className="mt-1 text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
        {inquiry.email}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          {formatInquiryType(inquiry.type)}
        </span>
        {inquiry.engagementType === "investor" && (
          <span
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
            style={{
              backgroundColor: isInquiryKycComplete(inquiry) ? "rgba(0,100,0,0.15)" : "rgba(248,113,113,0.1)",
              color: isInquiryKycComplete(inquiry) ? "#86efac" : "#f87171",
            }}
          >
            {isInquiryKycComplete(inquiry) ? <ShieldCheck className="h-2.5 w-2.5" /> : <ShieldAlert className="h-2.5 w-2.5" />}
            KYC
          </span>
        )}
      </div>
    </button>
  );
}

/** Kanban board grouped by review status — mirrors MouKanbanView/PipelineTableView's shared
 *  multi-view pattern (Platform Feedback Batch v4, Phase 7), replacing the old fixed
 *  master-detail-only layout on /admin/inquiries and /super-admin/inquiries. */
export function InquiryKanbanView({ inquiries, selectedId, onCardClick }: InquiryViewProps) {
  const columns = useMemo(
    () =>
      INQUIRY_STATUS_ORDER.map((status) => ({
        status,
        items: inquiries.filter((i) => (i.status ?? "pending") === status),
      })),
    [inquiries]
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-4 gap-3 min-w-[880px] lg:min-w-0">
        {columns.map(({ status, items }) => (
          <div
            key={status}
            className="min-w-[180px] rounded-lg p-3"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}
          >
            <div className="mb-3 flex items-center justify-between gap-1">
              <p
                className="text-xs font-semibold uppercase tracking-wide truncate"
                style={{ color: "var(--color-text-muted)" }}
                title={INQUIRY_STATUS_LABELS[status]}
              >
                {INQUIRY_STATUS_LABELS[status]}
              </p>
              <span className="text-xs shrink-0" style={{ color: "var(--color-text-muted)" }}>
                {items.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {items.map((i) => (
                <InquiryCard key={i.id} inquiry={i} selected={i.id === selectedId} onClick={() => onCardClick(i)} />
              ))}
              {items.length === 0 && (
                <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>None</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mobile-friendly, status-grouped list alternative to the Kanban board. */
export function InquiryListView({ inquiries, selectedId, onCardClick }: InquiryViewProps) {
  const groups = useMemo(
    () =>
      INQUIRY_STATUS_ORDER.map((status) => ({
        status,
        items: inquiries.filter((i) => (i.status ?? "pending") === status),
      })).filter((g) => g.items.length > 0),
    [inquiries]
  );

  if (groups.length === 0) {
    return (
      <p className="text-sm py-10 text-center" style={{ color: "var(--color-text-muted)" }}>
        No inquiries match the current filters.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.status}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              {INQUIRY_STATUS_LABELS[group.status]}
            </h3>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {group.items.length}
            </span>
          </div>
          <ul className="space-y-1.5">
            {group.items.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => onCardClick(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]",
                    i.id === selectedId && "bg-white/[0.05]"
                  )}
                  style={{ border: "1px solid var(--color-sovereign-border)", backgroundColor: "rgba(255,255,255,0.02)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{i.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                      {i.email} · {formatInquiryType(i.type)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusDotColor(i.status) }} />
                    <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Channel-column matrix — one column per inquiry type (contact, registration, strategic
 *  partnership, etc.), the orthogonal axis to the status-grouped Kanban/List, so this view answers
 *  "which channel is generating volume" instead of "what's stuck where". */
export function InquiryMatrixView({ inquiries, selectedId, onCardClick }: InquiryViewProps) {
  const columns = useMemo(
    () =>
      INQUIRY_TYPE_ORDER.map((type) => ({
        type,
        items: inquiries.filter((i) => i.type === type),
      })).filter((c) => c.items.length > 0),
    [inquiries]
  );

  if (columns.length === 0) {
    return (
      <p className="text-sm py-10 text-center" style={{ color: "var(--color-text-muted)" }}>
        No inquiries match the current filters.
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div key={column.type} className="flex w-72 shrink-0 flex-col">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide truncate" style={{ color: "var(--color-text-secondary)" }}>
              {formatInquiryType(column.type)}
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--color-text-muted)" }}
            >
              {column.items.length}
            </span>
          </div>
          <ul
            className="space-y-2 rounded-lg p-2"
            style={{ border: "1px solid var(--color-sovereign-border)", backgroundColor: "rgba(255,255,255,0.02)" }}
          >
            {column.items.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => onCardClick(i)}
                  className={cn(
                    "flex w-full flex-col gap-1.5 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]",
                    i.id === selectedId && "bg-white/[0.05]"
                  )}
                  style={{ border: "1px solid var(--color-sovereign-border)", backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <p className="text-sm font-medium text-white truncate">{i.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                    {i.email}
                  </p>
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: statusDotColor(i.status) }}
                  >
                    {INQUIRY_STATUS_LABELS[i.status ?? "pending"]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Spreadsheet-style view over the same inquiry data, reusing the shared DataTable (search, sort,
 *  pagination) with the same detail-drawer click-through as the other three views. */
export function InquiryTableView({ inquiries, onCardClick }: InquiryViewProps) {
  const columns: ColumnDef<LeadInquiry, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="text-white font-medium">{row.original.name}</span>,
      },
      { accessorKey: "email", header: "Email" },
      {
        id: "type",
        header: "Type",
        accessorFn: (row) => formatInquiryType(row.type),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => INQUIRY_STATUS_LABELS[row.status ?? "pending"],
      },
      {
        accessorKey: "createdAt",
        header: "Submitted",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={inquiries}
      emptyMessage="No inquiries match the current filters."
      onRowClick={onCardClick}
      getRowId={(row) => row.id}
      hideSearch
    />
  );
}
