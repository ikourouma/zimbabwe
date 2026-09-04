"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Download, FileSignature, Search, SlidersHorizontal, X } from "lucide-react";
import type { InvestorEngagement } from "@/lib/types";
import { ENGAGEMENT_STATUS_LABELS, ENGAGEMENT_STATUS_ORDER } from "@/lib/governance/engagement-workflow";
import {
  DEFAULT_MOU_FILTERS,
  MOU_STAGE_LABELS,
  MOU_STAGE_ORDER,
  matchesMouRow,
  type MouFilters,
  type MouStageFilter,
} from "@/lib/governance/mou-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

interface MouFiltersBarProps {
  /** The full, unfiltered engagement set this console can see — used to compute every pill's
   *  live count against the taxonomy/search filters (but not against itself). */
  engagements: InvestorEngagement[];
  /** Resolves a project title for search matching — pulled from useProjectStore by the caller. */
  projectTitleOf: (projectId: string) => string;
  stageFilter: MouStageFilter;
  onStageFilterChange: (v: MouStageFilter) => void;
  filters: MouFilters;
  onFiltersChange: (f: MouFilters) => void;
  onExportCsv: () => void;
  exportCount: number;
  /** Rendered right-justified on the same row as the stage pills (Platform Feedback Batch v4,
   *  Phase 1) — e.g. `<PipelineViewSwitcher />` — instead of its own isolated row below, closing
   *  the vertical-gap/misplacement complaint shared by every console that renders this bar. */
  viewSwitcher?: React.ReactNode;
}

/** MOU registry's primary utility bar (Platform Feedback Batch v3, Phase 8) — search + expandable
 *  filters + export on row 1, engagement-status/archived toggles in the expandable drawer, and a
 *  live-counted MOU-stage pill row always visible below. Mirrors InquiryFiltersBar's structure so
 *  every registry across the platform now shares one filter-bar language. */
export function MouFiltersBar({
  engagements,
  projectTitleOf,
  stageFilter,
  onStageFilterChange,
  filters,
  onFiltersChange,
  onExportCsv,
  exportCount,
  viewSwitcher,
}: MouFiltersBarProps) {
  const [expanded, setExpanded] = useState(false);

  const update = <K extends keyof MouFilters>(key: K, value: MouFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const countFor = (exclude: Parameters<typeof matchesMouRow>[4], predicate: (e: InvestorEngagement) => boolean) =>
    engagements.filter((e) => matchesMouRow(e, projectTitleOf(e.projectId), stageFilter, filters, exclude) && predicate(e))
      .length;

  const stageCounts: Record<MouStageFilter, number> = {
    all: countFor("stage", () => true),
    ...Object.fromEntries(
      MOU_STAGE_ORDER.map((stage) => [
        stage,
        countFor("stage", (e) => (e.mouStatus ?? "none") === stage),
      ])
    ),
  } as Record<MouStageFilter, number>;

  const hiddenFilterCount = [filters.engagementStatus !== "all", filters.showArchived].filter(Boolean).length;
  const clearAll = () => onFiltersChange({ ...DEFAULT_MOU_FILTERS, search: filters.search });

  return (
    <div className="space-y-3 mb-4">
      {/* Row 1 — Primary Utility Bar: Search, expandable Filters, Export. */}
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

        <Button type="button" variant="outline" size="sm" onClick={onExportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export MOUs (CSV) ({exportCount})
        </Button>
      </div>

      {/* Row 2 — Expandable filter drawer (collapsed by default). */}
      {expanded && (
        <div className="dashboard-panel space-y-5 rounded-lg p-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-sovereign-border)" }}>
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              <FileSignature className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} />
              Engagement Status &amp; Visibility
            </h3>
            <button type="button" onClick={() => setExpanded(false)} className="rounded p-1 hover:bg-white/10" aria-label="Collapse filters">
              <X className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
            </button>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Underlying Engagement Status</Label>
            <Select value={filters.engagementStatus} onValueChange={(v) => update("engagementStatus", v as MouFilters["engagementStatus"])}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ENGAGEMENT_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ENGAGEMENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      {/* Row 3 — MOU stage pills (left) sharing one row with the view switcher (right), no gap. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill active={stageFilter === "all"} onClick={() => onStageFilterChange("all")}>
            All ({stageCounts.all})
          </Pill>
          {MOU_STAGE_ORDER.map((stage) => (
            <Pill key={stage} active={stageFilter === stage} onClick={() => onStageFilterChange(stageFilter === stage ? "all" : stage)}>
              {MOU_STAGE_LABELS[stage]} ({stageCounts[stage]})
            </Pill>
          ))}
        </div>
        {viewSwitcher}
      </div>
    </div>
  );
}
