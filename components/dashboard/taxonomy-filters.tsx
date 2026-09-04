"use client";

import { useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Download,
  Globe2,
  Landmark,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  DEFAULT_TAXONOMY_FILTERS,
  TAXONOMY_CATEGORY_LABELS,
  TAXONOMY_CATEGORY_ORDER,
  type TaxonomyCategory,
  type TaxonomyFilters,
} from "@/lib/governance/taxonomy-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<TaxonomyCategory, LucideIcon> = {
  sectors: Layers,
  subsectors: Tags,
  ministries: Building2,
  provinces: MapPin,
  pillars: Landmark,
  sdgs: Globe2,
  contact: Mail,
};

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

interface TaxonomyFiltersBarProps {
  counts: Record<TaxonomyCategory, number>;
  /** Per-category count of rows awaiting super_admin review (currently only non-zero for
   *  "subsectors" — investor "Other (not listed)" suggestions land as pending_validation).
   *  Surfaced as an amber badge on the category pill so it's noticeable without opening the tab. */
  pendingCounts?: Partial<Record<TaxonomyCategory, number>>;
  activeCategory: TaxonomyCategory;
  onSelectCategory: (category: TaxonomyCategory) => void;
  filters: TaxonomyFilters;
  onFiltersChange: (filters: TaxonomyFilters) => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  onAddTerm: () => void;
  /** True for the read-only UN SDGs category — a fixed global standard with no add affordance. */
  addTermDisabled?: boolean;
}

export function TaxonomyFiltersBar({
  counts,
  pendingCounts,
  activeCategory,
  onSelectCategory,
  filters,
  onFiltersChange,
  onRefresh,
  onExportCsv,
  onAddTerm,
  addTermDisabled,
}: TaxonomyFiltersBarProps) {
  const [expanded, setExpanded] = useState(false);

  const update = <K extends keyof TaxonomyFilters>(key: K, value: TaxonomyFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hiddenFilterCount = [filters.status !== "all", filters.coverage !== "all"].filter(Boolean).length;

  const clearAll = () => onFiltersChange({ ...DEFAULT_TAXONOMY_FILTERS, search: filters.search });

  return (
    <div className="space-y-3 mb-4">
      {/* Row 1 — Primary Utility Bar: Search, expandable Filters, Refresh, Export, Add Term. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <Input
            placeholder="Search taxonomy terms, descriptions, or linked project references..."
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

        <Button type="button" variant="secondary" size="sm" onClick={onRefresh} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={onExportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>

        <Button type="button" size="sm" onClick={onAddTerm} disabled={addTermDisabled} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Term
        </Button>
      </div>

      {/* Row 2 — Expandable Taxonomy Status & Coverage Drawer (collapsed by default). */}
      {expanded && (
        <div className="dashboard-panel space-y-5 rounded-lg p-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-sovereign-border)" }}>
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} />
              Taxonomy Status &amp; Usage Coverage
            </h3>
            <button type="button" onClick={() => setExpanded(false)} className="rounded p-1 hover:bg-white/10" aria-label="Collapse filters">
              <X className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs">Taxonomy Status</Label>
              <Select value={filters.status} onValueChange={(v) => update("status", v as TaxonomyFilters["status"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">🟢 Active</SelectItem>
                  <SelectItem value="archived">⚪ Archived / Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Linked Project Coverage</Label>
              <Select value={filters.coverage} onValueChange={(v) => update("coverage", v as TaxonomyFilters["coverage"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  <SelectItem value="linked">🔗 Linked to Projects (&gt;0)</SelectItem>
                  <SelectItem value="unlinked">⚠️ Unlinked (0 Projects)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

      {/* Row 3 — Unified category segmented strip (replaces the old separate KPI cards + tabs). */}
      <div className="flex flex-wrap items-center gap-2">
        {TAXONOMY_CATEGORY_ORDER.map((key) => {
          const Icon = CATEGORY_ICONS[key];
          const active = activeCategory === key;
          const pending = pendingCounts?.[key] ?? 0;
          return (
            <Pill key={key} active={active} onClick={() => onSelectCategory(key)}>
              <Icon className="h-3.5 w-3.5" style={active ? { color: "var(--color-gold)" } : undefined} />
              {TAXONOMY_CATEGORY_LABELS[key]} ({counts[key]})
              {pending > 0 && (
                <span
                  className="ml-0.5 inline-flex items-center rounded-full px-1.5 text-[10px] font-semibold"
                  style={{ backgroundColor: "rgba(251,191,36,0.18)", color: "#fbbf24" }}
                  title={`${pending} awaiting super_admin review`}
                >
                  {pending} pending
                </span>
              )}
            </Pill>
          );
        })}
      </div>
    </div>
  );
}
