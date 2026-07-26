"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Download, Inbox, Search, SlidersHorizontal, X } from "lucide-react";
import type { LeadInquiry, Sector } from "@/lib/types";
import {
  DEFAULT_INQUIRY_FILTERS,
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUS_ORDER,
  INQUIRY_TYPE_ORDER,
  matchesInquiryRow,
  type InquiryFilters,
  type InquiryStatusFilter,
} from "@/lib/governance/inquiry-filters";
import { formatInquiryType } from "@/lib/utils/inquiry-display";
import { TIME_HORIZON_LABELS, type TimeHorizon } from "@/lib/utils/time-horizon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TIME_HORIZON_ORDER: TimeHorizon[] = ["all", "today", "24h", "7d", "30d", "custom"];

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
        active
          ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-white"
          : "border-[var(--color-sovereign-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/50"
      )}
    >
      {children}
    </button>
  );
}

interface InquiryFiltersBarProps {
  /** The full, unfiltered inbox (e.g. every inquiry on /admin/inquiries, or just the executive
   *  subset on /super-admin/inquiries) — used to compute every pill's own live count. */
  inquiries: LeadInquiry[];
  sectors: Sector[];
  statusFilter: InquiryStatusFilter;
  onStatusFilterChange: (v: InquiryStatusFilter) => void;
  filters: InquiryFilters;
  onFiltersChange: (f: InquiryFilters) => void;
  onExportCsv: () => void;
  exportCount: number;
}

export function InquiryFiltersBar({
  inquiries,
  sectors,
  statusFilter,
  onStatusFilterChange,
  filters,
  onFiltersChange,
  onExportCsv,
  exportCount,
}: InquiryFiltersBarProps) {
  const [expanded, setExpanded] = useState(false);

  const update = <K extends keyof InquiryFilters>(key: K, value: InquiryFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Every pill/button computes its own count against "everything except itself" — same live-count
  // pattern as the audit log filter bar and the project registries' governance-stage pills.
  const countFor = (exclude: Parameters<typeof matchesInquiryRow>[3], predicate: (i: LeadInquiry) => boolean) =>
    inquiries.filter((i) => matchesInquiryRow(i, statusFilter, filters, exclude) && predicate(i)).length;

  const statusCounts: Record<InquiryStatusFilter, number> = {
    all: countFor("status", () => true),
    pending: countFor("status", (i) => (i.status ?? "pending") === "pending"),
    approved: countFor("status", (i) => i.status === "approved"),
    declined: countFor("status", (i) => i.status === "declined"),
  };

  const hiddenFilterCount = [filters.type !== "all", filters.timeHorizon !== "all", filters.sectorId !== "all"].filter(
    Boolean
  ).length;

  const clearAll = () => onFiltersChange({ ...DEFAULT_INQUIRY_FILTERS, search: filters.search });

  return (
    <div className="space-y-3 mb-4">
      {/* Row 1 — Primary Utility Bar: Search, expandable Filters, Export. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <Input
            placeholder="Search by sender name, corporate email, organization, or subject..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="pl-9"
          />
        </div>

        <Button type="button" variant={expanded ? "default" : "secondary"} size="sm" onClick={() => setExpanded((e) => !e)} className="gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hiddenFilterCount > 0 && (
            <Badge variant={expanded ? "secondary" : "default"} className="ml-0.5 h-5 min-w-5 justify-center px-1.5">
              {hiddenFilterCount}
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={onExportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export Inquiries (CSV) ({exportCount})
        </Button>
      </div>

      {/* Row 2 — Expandable Inquiry Taxonomy Drawer (collapsed by default). */}
      {expanded && (
        <div className="dashboard-panel space-y-5 rounded-lg p-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-sovereign-border)" }}>
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              <Inbox className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} />
              Inquiry Origin &amp; Time Horizon
            </h3>
            <button type="button" onClick={() => setExpanded(false)} className="rounded p-1 hover:bg-white/10" aria-label="Collapse filters">
              <X className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
            </button>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Channel Origin</Label>
            <Select value={filters.type} onValueChange={(v) => update("type", v as InquiryFilters["type"])}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {INQUIRY_TYPE_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    {formatInquiryType(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Submission Time Horizon</Label>
            <div className="flex flex-wrap gap-1.5">
              {TIME_HORIZON_ORDER.map((h) => (
                <Pill key={h} active={filters.timeHorizon === h} onClick={() => update("timeHorizon", h)}>
                  {TIME_HORIZON_LABELS[h]}
                </Pill>
              ))}
            </div>
            {filters.timeHorizon === "custom" && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={filters.customFrom ?? ""} onChange={(e) => update("customFrom", e.target.value || undefined)} />
                </div>
                <div className="w-40">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={filters.customTo ?? ""} onChange={(e) => update("customTo", e.target.value || undefined)} />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Target Sector Interest</Label>
            <Select value={filters.sectorId} onValueChange={(v) => update("sectorId", v)}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Only Strategic Partnership submissions capture a sector today — other channels will show no matches.
            </p>
          </div>

          {hiddenFilterCount > 0 && (
            <div className="border-t pt-3" style={{ borderColor: "var(--color-sovereign-border)" }}>
              <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1">
                <X className="h-3 w-3" /> Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Row 3 — Status filter pills, always visible, live dynamic counts. Only the three states
          the schema actually supports (pending/approved/declined) — no "Under Review"/"Archived". */}
      <div className="flex flex-wrap items-center gap-2">
        <Pill active={statusFilter === "all"} onClick={() => onStatusFilterChange("all")}>
          All ({statusCounts.all})
        </Pill>
        {INQUIRY_STATUS_ORDER.map((s) => (
          <Pill key={s} active={statusFilter === s} onClick={() => onStatusFilterChange(statusFilter === s ? "all" : s)}>
            {INQUIRY_STATUS_LABELS[s]} ({statusCounts[s]})
          </Pill>
        ))}
      </div>
    </div>
  );
}
