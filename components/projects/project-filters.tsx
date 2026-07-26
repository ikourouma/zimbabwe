"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp, Bookmark, BookmarkPlus, Trash2, Clock } from "lucide-react";
import type { ProjectFilters, InvestmentProject, Ministry, SavedSearch, CapitalBracket, UpdatedWithin } from "@/lib/types";
import { sectors, strategicPillars, sdgs } from "@/lib/data/taxonomies";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useDemoPersona } from "@/context/demo-persona-context";
import { getUniqueProvinces } from "@/lib/entitlements/visibility";
import { getFinancingBuckets } from "@/lib/utils/financing-type";
import { formatMillions, CAPITAL_BRACKETS } from "@/lib/utils/capital";
import { getSectorIcon } from "@/lib/data/sector-icons";
import { SdgBadge } from "@/components/ui/sdg-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ProjectFiltersBarProps {
  projects: InvestmentProject[];
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  resultCount: number;
  /** Saved-search controls (signed-in users). When omitted, the Save Search UI is hidden. */
  savedSearches?: SavedSearch[];
  onSaveSearch?: () => void;
  onApplySavedSearch?: (search: SavedSearch) => void;
  onDeleteSavedSearch?: (id: string) => void;
  /** "public" (default) is the light marketing-site skin used on /projects, unchanged. "dashboard"
   *  swaps only the pieces hardcoded to that light `zim-*` theme (pills, expanded panel, collapsed
   *  chips, cluster headers) for the dark sovereign dashboard palette, so the identical filter
   *  logic/taxonomy sources can be reused on /deal-room/pipeline and the admin project registries
   *  without a jarring white panel on a dark page. `Select`/`Input`/`Button`/`Badge`/`SdgBadge` are
   *  left as-is in both variants — they're already used at their default light styling inside the
   *  dark dashboard elsewhere (e.g. the pipeline's own Ministry select). */
  variant?: "public" | "dashboard";
}

const UPDATED_WITHIN_PRESETS: { key: UpdatedWithin; label: string }[] = [
  { key: "7d", label: "Past 7 Days" },
  { key: "30d", label: "Past 30 Days" },
  { key: "quarter", label: "This Quarter" },
];

const CAPITAL_BRACKET_LABELS: Record<CapitalBracket, string> = {
  micro: "< $2M",
  growth: "$2M–$10M",
  middle: "$10M–$50M",
  infrastructure: "$50M+",
  assessment_pending: "Assessment Pending",
};

/** A single removable chip. `value` is set for multi-select fields so its X removes only that
 *  one value (leaving the rest of the selection intact) rather than clearing the whole field. */
type FilterChip = { key: keyof ProjectFilters; value?: string; label: string };

function getActiveFilterChips(filters: ProjectFilters, ministries: Ministry[]): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.sectorId) {
    const s = sectors.find((s) => s.id === filters.sectorId);
    if (s) chips.push({ key: "sectorId", label: `Sector: ${s.shortName ?? s.name}` });
  }
  filters.pillarId?.forEach((id) => {
    const p = strategicPillars.find((p) => p.id === id);
    if (p) chips.push({ key: "pillarId", value: id, label: `Pillar: ${p.name.split("&")[0].trim()}` });
  });
  filters.sdgId?.forEach((id) => {
    const s = sdgs.find((s) => s.id === id);
    if (s) chips.push({ key: "sdgId", value: id, label: `SDG ${s.number}` });
  });
  if (filters.ministryId) {
    const m = ministries.find((m) => m.id === filters.ministryId);
    if (m) chips.push({ key: "ministryId", label: `Ministry: ${m.shortName}` });
  }
  if (filters.province) chips.push({ key: "province", label: `Province: ${filters.province}` });
  filters.financingType?.forEach((v) => chips.push({ key: "financingType", value: v, label: `Financing: ${v}` }));
  if (filters.pipelineType) {
    chips.push({
      key: "pipelineType",
      label: filters.pipelineType === "policy_initiative" ? "Illustrative Policy Initiative" : "ZIDA Catalogue",
    });
  }
  if (filters.capitalBracket) {
    chips.push({ key: "capitalBracket", label: `Capital: ${CAPITAL_BRACKET_LABELS[filters.capitalBracket]}` });
  }
  if (filters.minCapitalMillions) {
    chips.push({ key: "minCapitalMillions", label: `Min. ${formatMillions(filters.minCapitalMillions)}` });
  }
  if (filters.maxCapitalMillions) {
    chips.push({ key: "maxCapitalMillions", label: `Max. ${formatMillions(filters.maxCapitalMillions)}` });
  }
  if (filters.updatedWithin) {
    const preset = UPDATED_WITHIN_PRESETS.find((p) => p.key === filters.updatedWithin);
    if (preset) chips.push({ key: "updatedWithin", label: `Updated: ${preset.label}` });
  }
  if (filters.recentDataRoom) {
    chips.push({ key: "recentDataRoom", label: "Recent Data Room" });
  }

  return chips;
}

function FilterPill({
  active,
  onClick,
  icon: Icon,
  variant = "public",
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  variant?: "public" | "dashboard";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        variant === "dashboard"
          ? active
            ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-white"
            : "border-[var(--color-sovereign-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/50"
          : active
            ? "border-zim-green-700 bg-zim-green-700 text-white"
            : "border-zim-border bg-white text-zim-charcoal hover:border-zim-green-700"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/** A labeled section within the expanded filter panel. */
function FilterCluster({
  title,
  variant = "public",
  children,
}: {
  title: string;
  variant?: "public" | "dashboard";
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3
        className={cn("text-[11px] font-semibold uppercase tracking-wider", variant === "public" && "text-zim-muted")}
        style={variant === "dashboard" ? { color: "var(--color-text-muted)" } : undefined}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ProjectFiltersBar({
  projects,
  filters,
  onFiltersChange,
  resultCount,
  savedSearches,
  onSaveSearch,
  onApplySavedSearch,
  onDeleteSavedSearch,
  variant = "public",
}: ProjectFiltersBarProps) {
  const { ministries } = useTaxonomyStore();
  const { isRegistered, isQualified } = useDemoPersona();
  const [expanded, setExpanded] = useState(false);

  const provinces = getUniqueProvinces(projects);
  const financingBuckets = getFinancingBuckets(projects);

  const update = <K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  /** Add/remove a value from a multi-select array field (pillarId, sdgId, financingType),
   *  collapsing to `undefined` when the last value is cleared so chip/URL logic stays clean. */
  const toggleMulti = (key: "pillarId" | "sdgId" | "financingType", value: string) => {
    const current = (filters[key] as string[] | undefined) ?? [];
    const nextArr = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update(key, (nextArr.length ? nextArr : undefined) as ProjectFilters[typeof key]);
  };

  /** Remove a single chip: for multi-select fields drop just that value, otherwise clear the field. */
  const removeChip = (chip: FilterChip) => {
    if (chip.value !== undefined && (chip.key === "pillarId" || chip.key === "sdgId" || chip.key === "financingType")) {
      toggleMulti(chip.key, chip.value);
    } else {
      update(chip.key, undefined);
    }
  };

  /** Capital bracket chips and the custom min/max range are mutually exclusive. */
  const selectBracket = (bracket: CapitalBracket | undefined) => {
    onFiltersChange({
      ...filters,
      capitalBracket: bracket,
      minCapitalMillions: undefined,
      maxCapitalMillions: undefined,
    });
  };

  const setCustomCapital = (key: "minCapitalMillions" | "maxCapitalMillions", value: number | undefined) => {
    onFiltersChange({ ...filters, [key]: value, capitalBracket: undefined });
  };

  const clearAll = () => onFiltersChange({});

  const chips = getActiveFilterChips(filters, ministries);
  const hasFilters = chips.length > 0 || Boolean(filters.search);
  const showSavedSearchUi = Boolean(onSaveSearch);

  const searchInput = (
    <>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zim-muted" />
      <Input
        placeholder="Search by title, location, or project owner..."
        value={filters.search ?? ""}
        onChange={(e) => update("search", e.target.value || undefined)}
        className="pl-9"
      />
    </>
  );

  const filterButtons = (
    <div className="flex flex-wrap items-center gap-2">
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

      {showSavedSearchUi && (
        <>
          <Button type="button" variant="outline" size="sm" onClick={onSaveSearch} className="gap-1.5">
            <BookmarkPlus className="h-3.5 w-3.5" />
            Save Search
          </Button>
          {savedSearches && savedSearches.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="gap-1.5">
                  <Bookmark className="h-3.5 w-3.5" />
                  Saved
                  <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 justify-center px-1.5">
                    {savedSearches.length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Saved searches</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {savedSearches.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onSelect={() => onApplySavedSearch?.(s)}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{s.name}</span>
                      {s.alertEnabled && (
                        <span className="text-[10px] text-zim-muted">Email alerts pending</span>
                      )}
                    </span>
                    {onDeleteSavedSearch && (
                      <button
                        type="button"
                        aria-label={`Delete saved search ${s.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onDeleteSavedSearch(s.id);
                        }}
                        className="shrink-0 text-zim-muted hover:text-zim-alert"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
    </div>
  );

  const resultBadge = (
    <Badge variant="secondary" className="shrink-0">
      {resultCount} project{resultCount !== 1 ? "s" : ""}
    </Badge>
  );

  return (
    <div className="space-y-3">
      {variant === "dashboard" ? (
        // Consolidated single-row utility bar (Search + Filters + Save Search) — tighter than the
        // public two-row layout, since the three dashboard surfaces (pipeline/admin/super-admin
        // registries) sit below a page header that already has its own title/subtext, so there's
        // less vertical room to spare above the fold. No standalone result-count badge here — the
        // caller's own governance-stage pill row (e.g. "All (32)") already carries that number.
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">{searchInput}</div>
          {filterButtons}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {filterButtons}
            {resultBadge}
          </div>
          <div className="relative">{searchInput}</div>
        </>
      )}

      {!expanded && chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={`${chip.key}:${chip.value ?? ""}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                variant === "dashboard"
                  ? "border-[var(--color-sovereign-border)] bg-white/5 text-[var(--color-text-secondary)]"
                  : "border-zim-border bg-zim-off-white text-zim-charcoal"
              )}
            >
              {chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip)}
                aria-label={`Remove ${chip.label} filter`}
                className={variant === "dashboard" ? "hover:text-red-400" : "hover:text-zim-alert"}
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
        <div
          className={cn(
            "space-y-6 rounded-lg p-4",
            variant === "dashboard" ? "dashboard-panel" : "border border-zim-border bg-white"
          )}
        >
          {/* Cluster 1 — Capital & Financing */}
          <FilterCluster title="Capital & Financing" variant={variant}>
            <div>
              <Label className="text-xs mb-1.5 block">Capital Bracket</Label>
              <div className="flex flex-wrap gap-1.5">
                <FilterPill
                  variant={variant}
                  active={!filters.capitalBracket && !filters.minCapitalMillions && !filters.maxCapitalMillions}
                  onClick={() => selectBracket(undefined)}
                >
                  All
                </FilterPill>
                {isQualified &&
                  CAPITAL_BRACKETS.map((b) => (
                    <FilterPill
                      key={b.key}
                      variant={variant}
                      active={filters.capitalBracket === b.key}
                      onClick={() => selectBracket(filters.capitalBracket === b.key ? undefined : b.key)}
                    >
                      {b.chipLabel}
                    </FilterPill>
                  ))}
                {/* Assessment Pending is a concept-stage lead magnet — no figures revealed, shown to all. */}
                <FilterPill
                  variant={variant}
                  active={filters.capitalBracket === "assessment_pending"}
                  onClick={() =>
                    selectBracket(filters.capitalBracket === "assessment_pending" ? undefined : "assessment_pending")
                  }
                >
                  Assessment Pending
                </FilterPill>
              </div>

              {isQualified && (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="w-28">
                    <Label className="text-xs">Min ($M)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="0"
                      value={filters.minCapitalMillions ?? ""}
                      onChange={(e) =>
                        setCustomCapital("minCapitalMillions", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Max ($M)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="Any"
                      value={filters.maxCapitalMillions ?? ""}
                      onChange={(e) =>
                        setCustomCapital("maxCapitalMillions", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {isRegistered && financingBuckets.length > 0 && (
              <div>
                <Label className="text-xs mb-1.5 block">Financing Type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {financingBuckets.map((bucket) => (
                    <FilterPill
                      key={bucket}
                      variant={variant}
                      active={filters.financingType?.includes(bucket) ?? false}
                      onClick={() => toggleMulti("financingType", bucket)}
                    >
                      {bucket}
                    </FilterPill>
                  ))}
                </div>
              </div>
            )}
          </FilterCluster>

          {/* Cluster 2 — Strategic & Geographic Taxonomy */}
          <FilterCluster title="Strategic & Geographic Taxonomy" variant={variant}>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Pipeline Type</Label>
              <div className="flex flex-wrap gap-1.5">
                <FilterPill
                  variant={variant}
                  active={filters.pipelineType === "zida_catalogue"}
                  onClick={() => update("pipelineType", filters.pipelineType === "zida_catalogue" ? undefined : "zida_catalogue")}
                >
                  ZIDA Catalogue
                </FilterPill>
                <FilterPill
                  variant={variant}
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
                    variant={variant}
                    active={filters.pillarId?.includes(p.id) ?? false}
                    onClick={() => toggleMulti("pillarId", p.id)}
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
                  <SdgBadge
                    key={s.id}
                    sdg={s}
                    active={filters.sdgId?.includes(s.id) ?? false}
                    onClick={() => toggleMulti("sdgId", s.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Sector</Label>
              <div className="flex flex-wrap gap-1.5">
                {sectors.map((s) => (
                  <FilterPill
                    key={s.id}
                    variant={variant}
                    icon={getSectorIcon(s.id)}
                    active={filters.sectorId === s.id}
                    onClick={() => update("sectorId", filters.sectorId === s.id ? undefined : s.id)}
                  >
                    {s.shortName ?? s.name}
                  </FilterPill>
                ))}
              </div>
            </div>
          </FilterCluster>

          {/* Cluster 3 — Deal Velocity & Freshness */}
          <FilterCluster title="Deal Velocity & Freshness" variant={variant}>
            <div>
              <Label className="text-xs mb-1.5 block">Last Updated</Label>
              <div className="flex flex-wrap gap-1.5">
                <FilterPill variant={variant} active={!filters.updatedWithin} onClick={() => update("updatedWithin", undefined)}>
                  Anytime
                </FilterPill>
                {UPDATED_WITHIN_PRESETS.map((preset) => (
                  <FilterPill
                    key={preset.key}
                    variant={variant}
                    icon={Clock}
                    active={filters.updatedWithin === preset.key}
                    onClick={() => update("updatedWithin", filters.updatedWithin === preset.key ? undefined : preset.key)}
                  >
                    {preset.label}
                  </FilterPill>
                ))}
              </div>
            </div>

            <div>
              <FilterPill
                variant={variant}
                active={Boolean(filters.recentDataRoom)}
                onClick={() => update("recentDataRoom", filters.recentDataRoom ? undefined : true)}
              >
                Recently Updated Data Room
              </FilterPill>
            </div>
          </FilterCluster>

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
