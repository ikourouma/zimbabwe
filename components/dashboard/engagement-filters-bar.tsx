"use client";

import { useState } from "react";
import { Archive, ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from "lucide-react";
import type { InvestorEngagement } from "@/lib/types";
import { ENGAGEMENT_STATUS_LABELS, ENGAGEMENT_STATUS_ORDER } from "@/lib/governance/engagement-workflow";
import {
  DEFAULT_ENGAGEMENT_FILTERS,
  matchesEngagementRow,
  type EngagementFilters,
  type EngagementStatusFilter,
} from "@/lib/governance/engagement-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Exported so callers can add their own extraPills sharing the exact same pill styling
 *  (Phase 6's government "My Ministry Only" toggle is the first consumer). */
export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

interface EngagementFiltersBarProps {
  /** The full, unfiltered engagement set this console can see — used to compute every pill's
   *  live count against the search/archived filters (but not against itself). */
  engagements: InvestorEngagement[];
  /** Resolves a project title for search matching — pulled from useProjectStore by the caller. */
  projectTitleOf: (projectId: string) => string;
  statusFilter: EngagementStatusFilter;
  onStatusFilterChange: (v: EngagementStatusFilter) => void;
  filters: EngagementFilters;
  onFiltersChange: (f: EngagementFilters) => void;
  /** Rendered at the end of row 1 (e.g. "New Engagement") — omitted for viewers who can't create. */
  toolbarEnd?: React.ReactNode;
  /** Rendered right-justified on the same row as the status pills — e.g.
   *  `<PipelineViewSwitcher />` — instead of its own isolated row below (Platform Feedback Batch
   *  v4, Phase 1's canonical registry layout). */
  viewSwitcher?: React.ReactNode;
  /** Extra pill(s) appended after the status pills, sharing their row (Phase 6) — e.g. a
   *  `government` viewer's "My Ministry Only" toggle. */
  extraPills?: React.ReactNode;
}

/** Engagements registry's primary utility bar (Platform Feedback Batch v4, Phase 1) — search +
 *  expandable filters + optional CTA on row 1, an "Include archived" toggle in the expandable
 *  drawer, and a live-counted engagement-status pill row always visible below. Mirrors
 *  MouFiltersBar's structure so every registry across the platform shares one filter-bar language. */
export function EngagementFiltersBar({
  engagements,
  projectTitleOf,
  statusFilter,
  onStatusFilterChange,
  filters,
  onFiltersChange,
  toolbarEnd,
  viewSwitcher,
  extraPills,
}: EngagementFiltersBarProps) {
  const [expanded, setExpanded] = useState(false);

  const update = <K extends keyof EngagementFilters>(key: K, value: EngagementFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const countFor = (exclude: Parameters<typeof matchesEngagementRow>[4], predicate: (e: InvestorEngagement) => boolean) =>
    engagements.filter((e) => matchesEngagementRow(e, projectTitleOf(e.projectId), statusFilter, filters, exclude) && predicate(e))
      .length;

  const statusCounts: Record<EngagementStatusFilter, number> = {
    all: countFor("status", () => true),
    ...Object.fromEntries(ENGAGEMENT_STATUS_ORDER.map((s) => [s, countFor("status", (e) => e.status === s)])),
  } as Record<EngagementStatusFilter, number>;

  const hiddenFilterCount = filters.showArchived ? 1 : 0;
  const clearAll = () => onFiltersChange({ ...DEFAULT_ENGAGEMENT_FILTERS, search: filters.search });

  return (
    <div className="space-y-3 mb-4">
      {/* Row 1 — Primary Utility Bar: Search, expandable Filters, CTA. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <Input
            placeholder="Search by investor name, organization, or project title..."
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

        {toolbarEnd}
      </div>

      {/* Row 2 — Expandable filter drawer (collapsed by default). */}
      {expanded && (
        <div className="dashboard-panel space-y-5 rounded-lg p-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-sovereign-border)" }}>
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              <Archive className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} />
              Visibility
            </h3>
            <button type="button" onClick={() => setExpanded(false)} className="rounded p-1 hover:bg-white/10" aria-label="Collapse filters">
              <X className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
            </button>
          </div>

          <div>
            <Label className="mb-1.5 flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showArchived}
                onChange={(e) => update("showArchived", e.target.checked)}
                className="accent-current"
              />
              Include archived engagements
            </Label>
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

      {/* Row 3 — Status pills (left) sharing one row with the view switcher (right), no gap. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill active={statusFilter === "all"} onClick={() => onStatusFilterChange("all")}>
            All ({statusCounts.all})
          </Pill>
          {ENGAGEMENT_STATUS_ORDER.map((status) => (
            <Pill
              key={status}
              active={statusFilter === status}
              onClick={() => onStatusFilterChange(statusFilter === status ? "all" : status)}
            >
              {ENGAGEMENT_STATUS_LABELS[status]} ({statusCounts[status]})
            </Pill>
          ))}
          {extraPills}
        </div>
        {viewSwitcher}
      </div>
    </div>
  );
}
