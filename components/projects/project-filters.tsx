"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import type { ProjectFilters, InvestmentProject, Ministry } from "@/lib/types";
import { sectors, strategicPillars, sdgs } from "@/lib/data/taxonomies";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useDemoPersona } from "@/context/demo-persona-context";
import { getUniqueProvinces } from "@/lib/entitlements/visibility";
import { getFinancingBuckets } from "@/lib/utils/financing-type";
import { parseCapitalTotalMillions, formatMillions } from "@/lib/utils/capital";
import { getSectorIcon } from "@/lib/data/sector-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectFiltersBarProps {
  projects: InvestmentProject[];
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  resultCount: number;
}

function getActiveFilterChips(
  filters: ProjectFilters,
  ministries: Ministry[]
): { key: keyof ProjectFilters; label: string }[] {
  const chips: { key: keyof ProjectFilters; label: string }[] = [];

  if (filters.sectorId) {
    const s = sectors.find((s) => s.id === filters.sectorId);
    if (s) chips.push({ key: "sectorId", label: `Sector: ${s.shortName ?? s.name}` });
  }
  if (filters.pillarId) {
    const p = strategicPillars.find((p) => p.id === filters.pillarId);
    if (p) chips.push({ key: "pillarId", label: `Pillar: ${p.name.split("&")[0].trim()}` });
  }
  if (filters.sdgId) {
    const s = sdgs.find((s) => s.id === filters.sdgId);
    if (s) chips.push({ key: "sdgId", label: `SDG ${s.number}` });
  }
  if (filters.ministryId) {
    const m = ministries.find((m) => m.id === filters.ministryId);
    if (m) chips.push({ key: "ministryId", label: `Ministry: ${m.shortName}` });
  }
  if (filters.province) chips.push({ key: "province", label: `Province: ${filters.province}` });
  if (filters.financingType) chips.push({ key: "financingType", label: `Financing: ${filters.financingType}` });
  if (filters.pipelineType) {
    chips.push({
      key: "pipelineType",
      label: filters.pipelineType === "policy_initiative" ? "Illustrative Policy Initiative" : "ZIDA Catalogue",
    });
  }
  if (filters.minCapitalMillions) {
    chips.push({ key: "minCapitalMillions", label: `Min. ${formatMillions(filters.minCapitalMillions)}` });
  }

  return chips;
}

function FilterPill({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-zim-green-700 bg-zim-green-700 text-white"
          : "border-zim-border bg-white text-zim-charcoal hover:border-zim-green-700"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/** Rounds a slider's max bound up to a "nice" step so the handle doesn't land on an ugly number
 *  like $1,168M — coarser granularity above $500M since capital figures at that scale are rarely
 *  meaningfully distinguished project-to-project at single-digit-million precision. */
function roundUpSliderMax(valueMillions: number): number {
  if (valueMillions <= 0) return 100;
  const step = valueMillions > 500 ? 250 : 50;
  return Math.ceil(valueMillions / step) * step;
}

export function ProjectFiltersBar({ projects, filters, onFiltersChange, resultCount }: ProjectFiltersBarProps) {
  const { ministries } = useTaxonomyStore();
  const { isRegistered, isQualified } = useDemoPersona();
  const [expanded, setExpanded] = useState(false);

  const provinces = getUniqueProvinces(projects);
  const financingBuckets = getFinancingBuckets(projects);

  const capitalValues = projects
    .map((p) => parseCapitalTotalMillions(p.capitalRequired))
    .filter((n): n is number => n !== null);
  const sliderMax = roundUpSliderMax(capitalValues.length > 0 ? Math.max(...capitalValues) : 0);
  const sliderStep = sliderMax > 500 ? 25 : 5;

  const update = <K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAll = () => onFiltersChange({});

  const chips = getActiveFilterChips(filters, ministries);
  const hasFilters = chips.length > 0 || Boolean(filters.search);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant={expanded ? "default" : "secondary"}
          size="sm"
          onClick={() => setExpanded((e) => !e)}
          className="gap-1.5"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {chips.length > 0 && (
            <Badge variant={expanded ? "secondary" : "default"} className="ml-0.5 h-5 min-w-5 justify-center px-1.5">
              {chips.length}
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
        <Badge variant="secondary">
          {resultCount} project{resultCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zim-muted" />
        <Input
          placeholder="Search by title, location, or project owner..."
          value={filters.search ?? ""}
          onChange={(e) => update("search", e.target.value || undefined)}
          className="pl-9"
        />
      </div>

      {!expanded && chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-zim-border bg-zim-off-white px-2.5 py-1 text-xs text-zim-charcoal"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => update(chip.key, undefined)}
                aria-label={`Remove ${chip.label} filter`}
                className="hover:text-zim-alert"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 px-2 text-xs">
            Clear all
          </Button>
        </div>
      )}

      {expanded && (
        <div className="space-y-5 rounded-lg border border-zim-border bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-xs">Province</Label>
              <Select value={filters.province ?? "all"} onValueChange={(v) => update("province", v === "all" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="All provinces" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All provinces</SelectItem>
                  {provinces.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Beneficiary Ministry</Label>
              <Select value={filters.ministryId ?? "all"} onValueChange={(v) => update("ministryId", v === "all" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="All ministries" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ministries</SelectItem>
                  {ministries.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.shortName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isRegistered && (
              <div>
                <Label className="text-xs mb-1.5 block">Financing Type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {financingBuckets.map((bucket) => (
                    <FilterPill
                      key={bucket}
                      active={filters.financingType === bucket}
                      onClick={() => update("financingType", filters.financingType === bucket ? undefined : bucket)}
                    >
                      {bucket}
                    </FilterPill>
                  ))}
                </div>
              </div>
            )}

            {isQualified && (
              <div>
                <Label className="text-xs mb-1.5 block">Min. Capital Required</Label>
                <Slider
                  value={[filters.minCapitalMillions ?? 0]}
                  max={sliderMax}
                  step={sliderStep}
                  onValueChange={(v) => update("minCapitalMillions", v[0] || undefined)}
                  className="mt-2.5"
                />
                <p className="mt-1.5 text-xs text-zim-muted">
                  {filters.minCapitalMillions ? `${formatMillions(filters.minCapitalMillions)}+` : "No minimum"}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Pipeline Type</Label>
            <div className="flex flex-wrap gap-1.5">
              <FilterPill
                active={filters.pipelineType === "zida_catalogue"}
                onClick={() => update("pipelineType", filters.pipelineType === "zida_catalogue" ? undefined : "zida_catalogue")}
              >
                ZIDA Catalogue
              </FilterPill>
              <FilterPill
                active={filters.pipelineType === "policy_initiative"}
                onClick={() => update("pipelineType", filters.pipelineType === "policy_initiative" ? undefined : "policy_initiative")}
              >
                Illustrative Policy Initiative
              </FilterPill>
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Strategic Pillar</Label>
            <div className="flex flex-wrap gap-1.5">
              {strategicPillars.map((p) => (
                <FilterPill
                  key={p.id}
                  active={filters.pillarId === p.id}
                  onClick={() => update("pillarId", filters.pillarId === p.id ? undefined : p.id)}
                >
                  {p.name.split("&")[0].trim()}
                </FilterPill>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">SDG Alignment</Label>
            <div className="flex flex-wrap gap-1.5">
              {sdgs.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={`SDG ${s.number}: ${s.name}`}
                  onClick={() => update("sdgId", filters.sdgId === s.id ? undefined : s.id)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white transition-all",
                    filters.sdgId === s.id ? "ring-2 ring-offset-2 ring-zim-charcoal" : "opacity-80 hover:opacity-100"
                  )}
                  style={{ backgroundColor: s.colorToken }}
                >
                  {s.number}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Sector</Label>
            <div className="flex flex-wrap gap-1.5">
              {sectors.map((s) => (
                <FilterPill
                  key={s.id}
                  icon={getSectorIcon(s.id)}
                  active={filters.sectorId === s.id}
                  onClick={() => update("sectorId", filters.sectorId === s.id ? undefined : s.id)}
                >
                  {s.shortName ?? s.name}
                </FilterPill>
              ))}
            </div>
          </div>

          {hasFilters && (
            <div className="border-t border-zim-border pt-3">
              <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1">
                <X className="h-3 w-3" /> Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
