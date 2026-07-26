"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, Search, ShieldAlert, SlidersHorizontal, X } from "lucide-react";
import type { AuditLogEntry } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";
import {
  AUDIT_CATEGORY_LABELS,
  AUDIT_CATEGORY_ORDER,
  AUDIT_TIME_HORIZON_LABELS,
  DEFAULT_AUDIT_FILTERS,
  entityTypeLabel,
  categorizeEntityType,
  isWithinTimeHorizon,
  matchesAuditFilters,
  type AuditCategoryKey,
  type AuditFilters,
  type AuditTimeHorizon,
} from "@/lib/governance/audit-taxonomy";
import { ROLE_LABELS } from "@/components/dashboard/role-change-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ACTOR_ROLE_ORDER: AccountRole[] = ["registered", "qualified", "government", "admin", "super_admin"];
const TIME_HORIZON_ORDER: AuditTimeHorizon[] = ["all", "today", "24h", "7d", "custom"];

interface AuditLogFiltersBarProps {
  /** The full, unfiltered feed — used to compute every pill/button's own live count. */
  entries: AuditLogEntry[];
  filters: AuditFilters;
  onFiltersChange: (filters: AuditFilters) => void;
  onExportCsv: () => void;
  exportCount: number;
}

/** Dashboard-themed pill button — same gold/border treatment as the project registries' stage
 *  pills and ProjectFiltersBar's dashboard-variant FilterPill (kept local here rather than
 *  imported since that component isn't exported outside project-filters.tsx). */
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

export function AuditLogFiltersBar({ entries, filters, onFiltersChange, onExportCsv, exportCount }: AuditLogFiltersBarProps) {
  const [expanded, setExpanded] = useState(false);

  const update = <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const entityTypeOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.entityType))).sort((a, b) => entityTypeLabel(a).localeCompare(entityTypeLabel(b))),
    [entries]
  );

  // Each pill/button group computes its own count against "everything except itself" — the same
  // live-count pattern used by the project registries' governance-stage pills — so switching one
  // filter never makes a sibling pill's number look stale.
  const baseForCategory = useMemo(() => entries.filter((e) => matchesAuditFilters(e, filters, "category")), [entries, filters]);
  const countForCategory = (key: AuditCategoryKey | "all") =>
    key === "all" ? baseForCategory.length : baseForCategory.filter((e) => categorizeEntityType(e.entityType) === key).length;

  const baseForTime = useMemo(() => entries.filter((e) => matchesAuditFilters(e, filters, "time")), [entries, filters]);
  const countForHorizon = (h: AuditTimeHorizon) =>
    baseForTime.filter((e) => isWithinTimeHorizon(e.createdAt, h, filters.customFrom, filters.customTo)).length;

  // The badge on the "Filters" button only reflects dimensions hidden behind the collapsible
  // drawer (time horizon, actor role, entity type) — category has its own always-visible pill row
  // below, so it isn't double-counted as a "hidden" filter.
  const hiddenFilterCount = [filters.timeHorizon !== "all", filters.actorRole !== "all", filters.entityType !== "all"].filter(
    Boolean
  ).length;

  const clearAll = () => onFiltersChange(DEFAULT_AUDIT_FILTERS);
  const hasAnyFilter =
    hiddenFilterCount > 0 || filters.category !== "all" || Boolean(filters.search);

  return (
    <div className="space-y-3 mb-4">
      {/* Row 1 — Primary Utility Bar: Search, expandable Filters, Export. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <Input
            placeholder="Search actions, actors, entity IDs, or details..."
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
          Export CSV ({exportCount})
        </Button>
      </div>

      {/* Row 2 — Expandable Audit Taxonomy Drawer (collapsed by default). */}
      {expanded && (
        <div className="dashboard-panel space-y-5 rounded-lg p-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-sovereign-border)" }}>
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              <ShieldAlert className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} />
              Audit Taxonomy &amp; Actor Filters
            </h3>
            <button type="button" onClick={() => setExpanded(false)} className="rounded p-1 hover:bg-white/10" aria-label="Collapse filters">
              <X className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
            </button>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Time Horizon</Label>
            <div className="flex flex-wrap gap-1.5">
              {TIME_HORIZON_ORDER.map((h) => (
                <Pill key={h} active={filters.timeHorizon === h} onClick={() => update("timeHorizon", h)}>
                  {AUDIT_TIME_HORIZON_LABELS[h]}
                  {h !== "custom" && ` (${countForHorizon(h)})`}
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
            <Label className="mb-1.5 block text-xs">Actor Role Scope</Label>
            <div className="flex flex-wrap gap-1.5">
              <Pill active={filters.actorRole === "all"} onClick={() => update("actorRole", "all")}>
                All Actors
              </Pill>
              {ACTOR_ROLE_ORDER.map((role) => (
                <Pill key={role} active={filters.actorRole === role} onClick={() => update("actorRole", role)}>
                  {ROLE_LABELS[role]}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Target Entity Class</Label>
            <div className="flex flex-wrap gap-1.5">
              <Pill active={filters.entityType === "all"} onClick={() => update("entityType", "all")}>
                All Entities
              </Pill>
              {entityTypeOptions.map((type) => (
                <Pill key={type} active={filters.entityType === type} onClick={() => update("entityType", type)}>
                  {entityTypeLabel(type)}
                </Pill>
              ))}
            </div>
          </div>

          {hasAnyFilter && (
            <div className="border-t pt-3" style={{ borderColor: "var(--color-sovereign-border)" }}>
              <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1">
                <X className="h-3 w-3" /> Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Row 3 — Quick Audit Category Pills, always visible, live dynamic counts. */}
      <div className="flex flex-wrap items-center gap-2">
        <Pill active={filters.category === "all"} onClick={() => update("category", "all")}>
          All ({countForCategory("all")})
        </Pill>
        {AUDIT_CATEGORY_ORDER.map((key) => (
          <Pill key={key} active={filters.category === key} onClick={() => update("category", filters.category === key ? "all" : key)}>
            {AUDIT_CATEGORY_LABELS[key]} ({countForCategory(key)})
          </Pill>
        ))}
      </div>
    </div>
  );
}
