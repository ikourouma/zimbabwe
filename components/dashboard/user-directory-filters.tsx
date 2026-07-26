"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import type { AdminUserRecord, Ministry } from "@/lib/types";
import {
  ACCREDITATION_LABELS,
  DEFAULT_USER_COMPLIANCE_FILTERS,
  MFA_POSTURE_LABELS,
  NDA_STATUS_LABELS,
  matchesUserRow,
  type AccreditationStatus,
  type MfaPosture,
  type NdaStatus,
  type RoleFilter,
  type StatusFilter,
  type UserComplianceFilters,
} from "@/lib/governance/user-directory-filters";
import { ROLE_LABELS } from "@/components/dashboard/role-change-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<AdminUserRecord["accountStatus"], string> = {
  active: "Active",
  suspended: "Suspended",
  pending: "Pending",
  deactivated: "Deactivated",
};

const ROLE_ORDER = Object.keys(ROLE_LABELS) as AdminUserRecord["role"][];
const STATUS_ORDER: AdminUserRecord["accountStatus"][] = ["active", "suspended", "pending", "deactivated"];
const NDA_ORDER: Exclude<NdaStatus, "all">[] = ["signed", "pending"];
const ACCREDITATION_ORDER: Exclude<AccreditationStatus, "all">[] = ["verified", "pending"];
const MFA_ORDER: Exclude<MfaPosture, "all">[] = ["enforced", "optional"];

interface UserDirectoryFiltersBarProps {
  /** The full, unfiltered directory — used to compute every pill's own live count. */
  users: AdminUserRecord[];
  ministries: Ministry[];
  roleFilter: RoleFilter;
  onRoleFilterChange: (v: RoleFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  filters: UserComplianceFilters;
  onFiltersChange: (f: UserComplianceFilters) => void;
}

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

export function UserDirectoryFiltersBar({
  users,
  ministries,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  filters,
  onFiltersChange,
}: UserDirectoryFiltersBarProps) {
  const [expanded, setExpanded] = useState(false);

  const update = <K extends keyof UserComplianceFilters>(key: K, value: UserComplianceFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Every pill/button computes its own count against "everything except itself" — same live-count
  // pattern as the audit log filter bar and the project registries' governance-stage pills — so
  // switching one filter never leaves a sibling pill's number looking stale.
  const countFor = (exclude: Parameters<typeof matchesUserRow>[4], predicate: (u: AdminUserRecord) => boolean) =>
    users.filter((u) => matchesUserRow(u, roleFilter, statusFilter, filters, exclude) && predicate(u)).length;

  const roleCounts = useMemo(() => {
    const counts: Partial<Record<RoleFilter, number>> = { all: countFor("role", () => true) };
    for (const r of ROLE_ORDER) counts[r] = countFor("role", (u) => u.role === r);
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, roleFilter, statusFilter, filters]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<StatusFilter, number>> = { all: countFor("status", () => true) };
    for (const s of STATUS_ORDER) counts[s] = countFor("status", (u) => u.accountStatus === s);
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, roleFilter, statusFilter, filters]);

  const ndaCounts: Record<NdaStatus, number> = {
    all: countFor("ndaStatus", () => true),
    signed: countFor("ndaStatus", (u) => Boolean(u.ndaAcceptedAt)),
    pending: countFor("ndaStatus", (u) => !u.ndaAcceptedAt),
  };

  const accreditationCounts: Record<AccreditationStatus, number> = {
    all: countFor("accreditation", () => true),
    verified: countFor("accreditation", (u) => u.hasCompletedKyc),
    pending: countFor("accreditation", (u) => !u.hasCompletedKyc),
  };

  // "MFA Enforced" is always 0 platform-wide (see lib/governance/user-directory-filters.ts) — still
  // computed through the same live-count machinery rather than hardcoded, so it stays honest the
  // day real per-user MFA enforcement lands.
  const mfaCounts: Record<MfaPosture, number> = {
    all: countFor("mfaPosture", () => true),
    enforced: 0,
    optional: countFor("mfaPosture", () => true),
  };

  const hiddenFilterCount = [
    statusFilter !== "all",
    filters.ndaStatus !== "all",
    filters.accreditation !== "all",
    filters.mfaPosture !== "all",
    filters.ministryId !== "all",
  ].filter(Boolean).length;

  const clearDrawerFilters = () => {
    onStatusFilterChange("all");
    onFiltersChange({ ...DEFAULT_USER_COMPLIANCE_FILTERS, search: filters.search });
  };

  return (
    <div className="space-y-3 mb-4">
      {/* Row 1 — Primary Utility Bar: Search + expandable Filters. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <Input
            placeholder="Search by name, email, account ID, or organization..."
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
      </div>

      {/* Row 2 — Expandable Compliance & Identity Drawer (collapsed by default). */}
      {expanded && (
        <div className="dashboard-panel space-y-5 rounded-lg p-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-sovereign-border)" }}>
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} />
              Sovereign Compliance &amp; Vetting Filters
            </h3>
            <button type="button" onClick={() => setExpanded(false)} className="rounded p-1 hover:bg-white/10" aria-label="Collapse filters">
              <X className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
            </button>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Account Status</Label>
            <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses ({statusCounts.all})</SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]} ({statusCounts[s]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">NDA Attestation Status</Label>
            <div className="flex flex-wrap gap-1.5">
              <Pill active={filters.ndaStatus === "all"} onClick={() => update("ndaStatus", "all")}>
                All ({ndaCounts.all})
              </Pill>
              {NDA_ORDER.map((v) => (
                <Pill key={v} active={filters.ndaStatus === v} onClick={() => update("ndaStatus", filters.ndaStatus === v ? "all" : v)}>
                  {NDA_STATUS_LABELS[v]} ({ndaCounts[v]})
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Institutional Accreditation (KYC)</Label>
            <div className="flex flex-wrap gap-1.5">
              <Pill active={filters.accreditation === "all"} onClick={() => update("accreditation", "all")}>
                All ({accreditationCounts.all})
              </Pill>
              {ACCREDITATION_ORDER.map((v) => (
                <Pill
                  key={v}
                  active={filters.accreditation === v}
                  onClick={() => update("accreditation", filters.accreditation === v ? "all" : v)}
                >
                  {ACCREDITATION_LABELS[v]} ({accreditationCounts[v]})
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">MFA Posture</Label>
            <div className="flex flex-wrap gap-1.5">
              <Pill active={filters.mfaPosture === "all"} onClick={() => update("mfaPosture", "all")}>
                All ({mfaCounts.all})
              </Pill>
              {MFA_ORDER.map((v) => (
                <Pill key={v} active={filters.mfaPosture === v} onClick={() => update("mfaPosture", filters.mfaPosture === v ? "all" : v)}>
                  {MFA_POSTURE_LABELS[v]} ({mfaCounts[v]})
                </Pill>
              ))}
            </div>
            <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              No account has platform MFA enforced yet — see the MFA Compliance KPI above.
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Ministry Mapping</Label>
            <Select value={filters.ministryId} onValueChange={(v) => update("ministryId", v)}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="All ministries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ministries</SelectItem>
                {ministries.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hiddenFilterCount > 0 && (
            <div className="border-t pt-3" style={{ borderColor: "var(--color-sovereign-border)" }}>
              <Button variant="ghost" size="sm" onClick={clearDrawerFilters} className="gap-1">
                <X className="h-3 w-3" /> Clear compliance filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Row 3 — Single Role filter pill bar, always visible, live dynamic counts. Account Status
          now lives in the drawer above, alongside the other compliance/security postures. */}
      <div className="flex flex-wrap items-center gap-2">
        <Pill active={roleFilter === "all"} onClick={() => onRoleFilterChange("all")}>
          All Roles ({roleCounts.all})
        </Pill>
        {ROLE_ORDER.map((r) => (
          <Pill key={r} active={roleFilter === r} onClick={() => onRoleFilterChange(roleFilter === r ? "all" : r)}>
            {ROLE_LABELS[r]} ({roleCounts[r]})
          </Pill>
        ))}
      </div>
    </div>
  );
}
