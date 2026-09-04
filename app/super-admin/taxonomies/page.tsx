"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Check, FileSignature, History, Trash2 } from "lucide-react";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useProjectStore } from "@/context/project-store-context";
import { useAuth } from "@/context/auth-context";
import { useMinistryOfficialCounts } from "@/lib/hooks/use-ministry-official-counts";
import { AccessGate } from "@/components/dashboard/access-gate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaxonomyFiltersBar } from "@/components/dashboard/taxonomy-filters";
import { AddTaxonomyTermModal } from "@/components/dashboard/add-taxonomy-term-modal";
import {
  DEFAULT_TAXONOMY_FILTERS,
  matchesTaxonomyRow,
  TAXONOMY_CATEGORY_LABELS,
  type TaxonomyCategory,
  type TaxonomyFilters as TaxonomyFilterState,
} from "@/lib/governance/taxonomy-filters";
import { getSectorStats, getSubsectorStats, getPillarStats, getMinistryStats, getSdgStats } from "@/lib/data/site-stats";
import type { MouTemplateDefaults } from "@/lib/types";

/** Deliberately a count, never a named individual — see the no-named-officials policy on the
 *  `ministries` table (lib/db/schema/taxonomies.ts). Links to the Users &amp; Roles workspace
 *  pre-filtered to this ministry's government accounts. */
function MinistryOfficialsCount({ ministryId }: { ministryId: string }) {
  const { counts } = useMinistryOfficialCounts();
  const count = counts[ministryId] ?? 0;
  if (count === 0) {
    return <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Unassigned</span>;
  }
  return (
    // This page is super-admin-only (gated below), so the drill-down always targets the
    // super-admin Users & Roles workspace.
    <Link href={`/super-admin/users?ministry=${ministryId}`} className="text-xs hover:underline" style={{ color: "var(--color-gold)" }}>
      {count} Official{count === 1 ? "" : "s"}
    </Link>
  );
}

/** Per-row link to this record's slice of the audit trail (already logged on every taxonomy
 *  mutation — see app/api/taxonomies/route.ts). */
function HistoryLink({ entityId }: { entityId: string }) {
  return (
    <Button size="sm" variant="ghost" asChild title="View change history">
      <Link href={`/super-admin/audit?entityId=${entityId}`}>
        <History className="h-4 w-4" />
      </Link>
    </Button>
  );
}

/** Small linked-project count chip reused across taxonomy tabs. */
function CountChip({ total, published }: { total: number; published: number }) {
  return (
    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
      <span className="text-white font-medium">{total}</span> project{total === 1 ? "" : "s"}
      {published > 0 && <span className="ml-1 opacity-70">({published} live)</span>}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const pending = status === "pending_validation";
  const active = status === "active";
  const color = pending ? "#fbbf24" : active ? "#4ade80" : "var(--color-text-muted)";
  const bg = pending ? "rgba(251,191,36,0.12)" : active ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)";
  const border = pending ? "rgba(251,191,36,0.3)" : active ? "rgba(74,222,128,0.2)" : "var(--color-sovereign-border)";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
      style={{ color, backgroundColor: bg, border: `1px solid ${border}` }}
    >
      {pending ? "Pending Review" : (status ?? "—").replace(/_/g, " ")}
    </span>
  );
}

/** Archive (soft-disable) / Restore + hard-Delete controls shared by the editable taxonomy tabs.
 *  Delete is always attempted; the server's referential-integrity guard blocks it with a clear
 *  message when linked records exist. */
function RowActions({
  status,
  onApprove,
  onArchive,
  onRestore,
  onDelete,
  linked,
  entityId,
}: {
  status?: string;
  /** Only rendered when set — the "Pending Review" -> "active" promotion is currently unique to
   *  subsector suggestions submitted via the Propose-Project wizard's "Other (not listed)" path. */
  onApprove?: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  linked: number;
  /** When set, renders a "View history" link into this record's slice of the audit trail. */
  entityId?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {entityId && <HistoryLink entityId={entityId} />}
      {status === "active" ? (
        <Button size="sm" variant="ghost" onClick={onArchive} title="Archive (hide from new pickers)">
          <Archive className="h-4 w-4" />
        </Button>
      ) : status === "pending_validation" && onApprove ? (
        <Button size="sm" variant="ghost" onClick={onApprove} title="Approve — makes it selectable platform-wide">
          <Check className="h-4 w-4" style={{ color: "#4ade80" }} />
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={onRestore} title="Restore to active">
          <ArchiveRestore className="h-4 w-4" />
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        title={linked > 0 ? `Blocked: ${linked} linked record(s) — archive instead` : "Delete permanently"}
        className={linked > 0 ? "opacity-40" : ""}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Editor for the sector/ministry-level MOU starting-draft defaults consumed by
 *  getOrCreateMouForEngagement (lib/db/queries/mous.ts) — a Dialog rather than an inline column
 *  since it's edited far less often than name/description and would otherwise blow out row height. */
function MouTemplateButton({
  entityLabel,
  entityName,
  value,
  onSave,
}: {
  entityLabel: string;
  entityName: string;
  value?: MouTemplateDefaults | null;
  onSave: (terms: MouTemplateDefaults) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [termBulletsText, setTermBulletsText] = useState((value?.termBullets ?? []).join("\n"));
  const [specialConditions, setSpecialConditions] = useState(value?.specialConditions ?? "");
  const [saving, setSaving] = useState(false);
  const hasDefaults = Boolean((value?.termBullets?.length ?? 0) > 0 || value?.specialConditions);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        title={hasDefaults ? "Edit default MOU terms" : "Add default MOU terms"}
        onClick={() => {
          setTermBulletsText((value?.termBullets ?? []).join("\n"));
          setSpecialConditions(value?.specialConditions ?? "");
          setOpen(true);
        }}
      >
        <FileSignature className="h-4 w-4" style={hasDefaults ? { color: "var(--color-gold)" } : undefined} />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Default MOU Terms — {entityName}</DialogTitle>
          </DialogHeader>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Pre-fills a new MOU&apos;s term bullets and special conditions the moment an engagement tied to this {entityLabel}
            is first approved. ZIDA staff still review, edit, and submit through the normal MOU lifecycle — nothing here is
            ever auto-finalized.
          </p>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>
              Default Term Bullets (one per line)
            </label>
            <textarea
              value={termBulletsText}
              onChange={(e) => setTermBulletsText(e.target.value)}
              rows={5}
              className="dashboard-input min-h-[110px]"
              placeholder={"ZIDA facilitates land allocation within 90 days\nInvestor commits indicative capital within 12 months"}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>
              Default Special Conditions
            </label>
            <textarea
              value={specialConditions}
              onChange={(e) => setSpecialConditions(e.target.value)}
              rows={2}
              className="dashboard-input"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave({
                    termBullets: termBulletsText.split("\n").map((s) => s.trim()).filter(Boolean),
                    specialConditions: specialConditions.trim(),
                  });
                  toast.success("Default MOU terms saved");
                  setOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to save");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save Defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SuperAdminTaxonomiesPage() {
  const {
    sectors,
    pillars,
    ministries,
    contactReasons,
    provinces,
    sdgs,
    isLoading,
    updateSector,
    archiveSector,
    removeSector,
    updateSubsector,
    approveSubsector,
    archiveSubsector,
    removeSubsector,
    updatePillar,
    archivePillar,
    removePillar,
    updateMinistry,
    archiveMinistry,
    removeMinistry,
    updateContactReason,
    archiveContactReason,
    removeContactReason,
    renameProvince,
    removeProvince,
    resetTaxonomies,
  } = useTaxonomyStore();
  const { projects } = useProjectStore();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const { counts: ministryOfficialCounts } = useMinistryOfficialCounts();

  const [activeCategory, setActiveCategory] = useState<TaxonomyCategory>("sectors");
  const [filters, setFilters] = useState<TaxonomyFilterState>(DEFAULT_TAXONOMY_FILTERS);
  const [addTermOpen, setAddTermOpen] = useState(false);

  // Wraps a store mutation so the linked-record delete guard's specific 409 message (or any
  // server error) surfaces as a toast instead of an unhandled rejection.
  const run = async (fn: () => Promise<void>, success: string) => {
    try {
      await fn();
      toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  };

  // Every category's rows are projected into the shared { searchText, isActive, linkedCount }
  // shape (lib/governance/taxonomy-filters.ts) so one predicate drives both the segmented pill
  // counts (Row 3) and each tab's visible rows — replaces the old per-tab `matches()` search-only
  // helper with the full search + status + linked-project-coverage filter set.
  const sectorRows = useMemo(
    () =>
      sectors.map((s) => ({
        item: s,
        row: {
          searchText: `${s.name} ${s.shortName ?? ""} ${s.description ?? ""}`,
          isActive: s.status === "active",
          linkedCount: getSectorStats(s.id, projects).total,
        },
      })),
    [sectors, projects]
  );
  // Flattened from sectors[].subsectors (fetchTaxonomies nests them per-sector — see
  // lib/db/queries/taxonomies.ts) with the parent sector's name carried along for display since
  // this tab lists every subsector across every sector in one table.
  const subsectorRows = useMemo(
    () =>
      sectors.flatMap((sector) =>
        (sector.subsectors ?? []).map((sub) => ({
          item: { ...sub, sectorName: sector.name },
          row: {
            searchText: `${sub.name} ${sector.name}`,
            isActive: sub.status === "active",
            linkedCount: getSubsectorStats(sub.id, projects).total,
          },
        }))
      ),
    [sectors, projects]
  );
  const ministryRows = useMemo(
    () =>
      ministries.map((m) => ({
        item: m,
        row: {
          searchText: `${m.name} ${m.shortName}`,
          isActive: m.status === "active",
          linkedCount: getMinistryStats(m.id, projects).total,
        },
      })),
    [ministries, projects]
  );
  // Provinces are plain strings (no id) — the original array index is carried through so
  // renameProvince/removeProvince (which are index-addressed) still work after filtering.
  const provinceRows = useMemo(
    () =>
      provinces.map((name, index) => ({
        item: { name, index },
        row: { searchText: name, isActive: true, linkedCount: projects.filter((p) => p.province === name).length },
      })),
    [provinces, projects]
  );
  const pillarRows = useMemo(
    () =>
      pillars.map((p) => ({
        item: p,
        row: {
          searchText: `${p.name} ${p.description ?? ""}`,
          isActive: p.status === "active",
          linkedCount: getPillarStats(p.id, projects).total,
        },
      })),
    [pillars, projects]
  );
  // SDGs have no archive/inactive concept (fixed global standard, read-only) — always "active".
  const sdgRows = useMemo(
    () =>
      sdgs.map((s) => ({
        item: s,
        row: { searchText: `${s.name} sdg ${s.number}`, isActive: true, linkedCount: getSdgStats(s.id, projects).total },
      })),
    [sdgs, projects]
  );
  // Contact reasons never link to projects in this domain model — never fabricated as >0.
  const contactRows = useMemo(
    () =>
      contactReasons.map((cr) => ({
        item: cr,
        row: { searchText: `${cr.label} ${cr.routingCategory ?? ""}`, isActive: cr.status === "active", linkedCount: 0 },
      })),
    [contactReasons]
  );

  const filteredSectors = useMemo(() => sectorRows.filter(({ row }) => matchesTaxonomyRow(row, filters)).map(({ item }) => item), [sectorRows, filters]);
  const filteredSubsectors = useMemo(
    () => subsectorRows.filter(({ row }) => matchesTaxonomyRow(row, filters)).map(({ item }) => item),
    [subsectorRows, filters]
  );
  const pendingSubsectorCount = useMemo(() => subsectorRows.filter(({ item }) => item.status === "pending_validation").length, [subsectorRows]);
  const filteredMinistries = useMemo(
    () => ministryRows.filter(({ row }) => matchesTaxonomyRow(row, filters)).map(({ item }) => item),
    [ministryRows, filters]
  );
  const filteredProvinces = useMemo(
    () => provinceRows.filter(({ row }) => matchesTaxonomyRow(row, filters)).map(({ item }) => item),
    [provinceRows, filters]
  );
  const filteredPillars = useMemo(() => pillarRows.filter(({ row }) => matchesTaxonomyRow(row, filters)).map(({ item }) => item), [pillarRows, filters]);
  const filteredSdgs = useMemo(() => sdgRows.filter(({ row }) => matchesTaxonomyRow(row, filters)).map(({ item }) => item), [sdgRows, filters]);
  const filteredContactReasons = useMemo(
    () => contactRows.filter(({ row }) => matchesTaxonomyRow(row, filters)).map(({ item }) => item),
    [contactRows, filters]
  );

  const counts: Record<TaxonomyCategory, number> = {
    sectors: filteredSectors.length,
    subsectors: filteredSubsectors.length,
    ministries: filteredMinistries.length,
    provinces: filteredProvinces.length,
    pillars: filteredPillars.length,
    sdgs: filteredSdgs.length,
    contact: filteredContactReasons.length,
  };

  const exportCsv = () => {
    let header: string[] = [];
    let lines: string[][] = [];
    switch (activeCategory) {
      case "sectors":
        header = ["Name", "Short Name", "Description", "Linked Projects", "Status"];
        lines = filteredSectors.map((s) => [s.name, s.shortName ?? "", s.description, String(getSectorStats(s.id, projects).total), s.status]);
        break;
      case "subsectors":
        header = ["Subsector Name", "Parent Sector", "Linked Projects", "Status"];
        lines = filteredSubsectors.map((s) => [s.name, s.sectorName, String(getSubsectorStats(s.id, projects).total), s.status]);
        break;
      case "ministries":
        header = ["Ministry Name", "Short Name", "Linked Projects", "Officials", "Status"];
        lines = filteredMinistries.map((m) => [
          m.name,
          m.shortName,
          String(getMinistryStats(m.id, projects).total),
          String(ministryOfficialCounts[m.id] ?? 0),
          m.status,
        ]);
        break;
      case "provinces":
        header = ["Name", "Linked Projects"];
        lines = filteredProvinces.map((p) => [p.name, String(projects.filter((pr) => pr.province === p.name).length)]);
        break;
      case "pillars":
        header = ["Pillar Name", "Description", "Linked Projects", "Status"];
        lines = filteredPillars.map((p) => [p.name, p.description, String(getPillarStats(p.id, projects).total), p.status]);
        break;
      case "sdgs":
        header = ["Number", "Name", "Linked Projects"];
        lines = filteredSdgs.map((s) => [String(s.number), s.name, String(getSdgStats(s.id, projects).total)]);
        break;
      case "contact":
        header = ["Label", "Routing Category", "Status"];
        lines = filteredContactReasons.map((cr) => [cr.label, cr.routingCategory ?? "", cr.status]);
        break;
    }
    const csv = [header, ...lines].map((cells) => cells.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `zida-taxonomy-${activeCategory}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${lines.length} ${TAXONOMY_CATEGORY_LABELS[activeCategory].toLowerCase()}`);
  };

  if (!authLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with a super admin account to manage sectors, ministries, provinces, SDGs, and contact reasons."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Taxonomies</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Canonical classifications used across the platform. Platform Admin edits are authoritative; standard Admins see
            these read-only.
          </p>
        </div>
      </div>

      <TaxonomyFiltersBar
        counts={counts}
        pendingCounts={{ subsectors: pendingSubsectorCount }}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={() => {
          void resetTaxonomies();
          toast.success("Taxonomies refreshed from the database");
        }}
        onExportCsv={exportCsv}
        onAddTerm={() => setAddTermOpen(true)}
        addTermDisabled={activeCategory === "sdgs"}
      />

      {/* Sectors */}
      {activeCategory === "sectors" && (
        <section className="dashboard-panel p-5">
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description (public sector page)</th>
                  <th>Linked Projects</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading || authLoading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="dashboard-skeleton h-4 w-full" />
                    </td>
                  </tr>
                ) : (
                  filteredSectors.map((s) => {
                    const stats = getSectorStats(s.id, projects);
                    return (
                      <tr key={s.id} className={s.status !== "active" ? "opacity-60" : ""}>
                        <td>
                          <input
                            defaultValue={s.name}
                            onBlur={(e) => e.target.value !== s.name && run(() => updateSector(s.id, { name: e.target.value }), "Sector saved")}
                            className="dashboard-input h-8"
                          />
                        </td>
                        <td className="min-w-[280px]">
                          <textarea
                            defaultValue={s.description ?? ""}
                            onBlur={(e) =>
                              e.target.value !== (s.description ?? "") &&
                              run(() => updateSector(s.id, { description: e.target.value }), "Description saved")
                            }
                            rows={2}
                            placeholder="Shown on the public /sectors/[sector] page…"
                            className="dashboard-input min-h-[52px] text-xs w-full"
                          />
                        </td>
                        <td>
                          <Link href={`/super-admin/projects?sectorId=${s.id}`} className="hover:underline">
                            <CountChip total={stats.total} published={stats.published} />
                          </Link>
                        </td>
                        <td><StatusBadge status={s.status} /></td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <MouTemplateButton
                              entityLabel="sector"
                              entityName={s.name}
                              value={s.defaultMouTerms}
                              onSave={(terms) => updateSector(s.id, { defaultMouTerms: terms })}
                            />
                            <RowActions
                              status={s.status}
                              linked={stats.total}
                              entityId={s.id}
                              onArchive={() => run(() => archiveSector(s.id), `"${s.name}" archived`)}
                              onRestore={() => run(() => updateSector(s.id, { status: "active" }), `"${s.name}" restored`)}
                              onDelete={() => run(() => removeSector(s.id), `"${s.name}" deleted`)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Subsectors — includes investor-suggested "Other (not listed)" entries awaiting review
       *  (Deal Room Feedback Batch v2, item 7); those land here as "Pending Review" until a
       *  super_admin approves them, at which point they become selectable platform-wide. */}
      {activeCategory === "subsectors" && (
        <section className="dashboard-panel p-5">
          <p className="text-xs mb-3 max-w-2xl" style={{ color: "var(--color-text-muted)" }}>
            Second-level classification nested under a sector. Entries submitted by investors via the Propose-Project
            wizard&apos;s &quot;Other (not listed)&quot; option arrive here as <strong>Pending Review</strong> and stay
            invisible to other investors until approved.
          </p>
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Subsector Name</th>
                  <th>Parent Sector</th>
                  <th>Linked Projects</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading || authLoading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="dashboard-skeleton h-4 w-full" />
                    </td>
                  </tr>
                ) : filteredSubsectors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-xs py-6" style={{ color: "var(--color-text-muted)" }}>
                      No subsectors match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredSubsectors.map((s) => {
                    const stats = getSubsectorStats(s.id, projects);
                    return (
                      <tr key={s.id} className={s.status === "inactive" ? "opacity-60" : ""}>
                        <td>
                          <input
                            defaultValue={s.name}
                            onBlur={(e) => e.target.value !== s.name && run(() => updateSubsector(s.id, { name: e.target.value }), "Subsector saved")}
                            className="dashboard-input h-8 min-w-[220px]"
                          />
                        </td>
                        <td className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          {s.sectorName}
                        </td>
                        <td>
                          <Link href={`/super-admin/projects?subsectorId=${s.id}`} className="hover:underline">
                            <CountChip total={stats.total} published={stats.published} />
                          </Link>
                        </td>
                        <td><StatusBadge status={s.status} /></td>
                        <td>
                          <RowActions
                            status={s.status}
                            linked={stats.total}
                            entityId={s.id}
                            onApprove={() => run(() => approveSubsector(s.id), `"${s.name}" approved — now selectable platform-wide`)}
                            onArchive={() => run(() => archiveSubsector(s.id), `"${s.name}" archived`)}
                            onRestore={() => run(() => updateSubsector(s.id, { status: "active" }), `"${s.name}" restored`)}
                            onDelete={() => run(() => removeSubsector(s.id), `"${s.name}" deleted`)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ministries */}
      {activeCategory === "ministries" && (
        <section className="dashboard-panel p-5">
          <p className="text-xs mb-3 max-w-2xl" style={{ color: "var(--color-text-muted)" }}>
            Every project aligns to at least one beneficiary ministry. Ministry names only — no named officials are ever
            stored or displayed publicly.
          </p>
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Ministry Name</th>
                  <th>Short Name</th>
                  <th>Linked Projects</th>
                  <th>Officials</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredMinistries.map((m) => {
                  const stats = getMinistryStats(m.id, projects);
                  return (
                    <tr key={m.id} className={m.status !== "active" ? "opacity-60" : ""}>
                      <td>
                        <input
                          defaultValue={m.name}
                          onBlur={(e) => e.target.value !== m.name && run(() => updateMinistry(m.id, { name: e.target.value }), "Ministry saved")}
                          className="dashboard-input h-8 min-w-[240px]"
                        />
                      </td>
                      <td>
                        <input
                          defaultValue={m.shortName}
                          onBlur={(e) => e.target.value !== m.shortName && run(() => updateMinistry(m.id, { shortName: e.target.value }), "Ministry saved")}
                          className="dashboard-input h-8 w-28"
                        />
                      </td>
                      <td>
                        <Link href={`/super-admin/projects?ministryId=${m.id}`} className="hover:underline">
                          <CountChip total={stats.total} published={stats.published} />
                        </Link>
                      </td>
                      <td>
                        <MinistryOfficialsCount ministryId={m.id} />
                      </td>
                      <td><StatusBadge status={m.status} /></td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <MouTemplateButton
                            entityLabel="ministry"
                            entityName={m.name}
                            value={m.defaultMouTerms}
                            onSave={(terms) => updateMinistry(m.id, { defaultMouTerms: terms })}
                          />
                          <RowActions
                            status={m.status}
                            linked={stats.total}
                            entityId={m.id}
                            onArchive={() => run(() => archiveMinistry(m.id), `"${m.name}" archived`)}
                            onRestore={() => run(() => updateMinistry(m.id, { status: "active" }), `"${m.name}" restored`)}
                            onDelete={() => run(() => removeMinistry(m.id), `"${m.name}" deleted`)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Provinces */}
      {activeCategory === "provinces" && (
        <section className="dashboard-panel p-5">
          <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
            Canonical province registry — drives the province count shown platform-wide.
          </p>
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Linked Projects</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredProvinces.map(({ name, index }) => (
                  <tr key={`${name}-${index}`}>
                    <td>
                      <input defaultValue={name} onBlur={(e) => renameProvince(index, e.target.value)} className="dashboard-input h-8" />
                    </td>
                    <td>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {projects.filter((p) => p.province === name).length}
                      </span>
                    </td>
                    <td>
                      <Button size="sm" variant="ghost" onClick={() => run(() => removeProvince(index), `"${name}" removed`)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Pillars */}
      {activeCategory === "pillars" && (
        <section className="dashboard-panel p-5">
          <p className="text-xs mb-3 max-w-2xl" style={{ color: "var(--color-text-muted)" }}>
            Strategic pillars anchor each project to a national development priority. Editing the name or description
            updates it everywhere the pillar is referenced.
          </p>
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Pillar Name</th>
                  <th>Description</th>
                  <th>Linked Projects</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredPillars.map((p) => {
                  const stats = getPillarStats(p.id, projects);
                  return (
                    <tr key={p.id} className={p.status !== "active" ? "opacity-60" : ""}>
                      <td>
                        <input
                          defaultValue={p.name}
                          onBlur={(e) => e.target.value !== p.name && run(() => updatePillar(p.id, { name: e.target.value }), "Pillar saved")}
                          className="dashboard-input h-8 min-w-[200px]"
                        />
                      </td>
                      <td>
                        <input
                          defaultValue={p.description}
                          onBlur={(e) => e.target.value !== p.description && run(() => updatePillar(p.id, { description: e.target.value }), "Pillar saved")}
                          className="dashboard-input h-8 min-w-[280px]"
                        />
                      </td>
                      <td>
                        <Link href={`/super-admin/projects?pillarId=${p.id}`} className="hover:underline">
                          <CountChip total={stats.total} published={stats.published} />
                        </Link>
                      </td>
                      <td><StatusBadge status={p.status} /></td>
                      <td>
                        <RowActions
                          status={p.status}
                          linked={stats.total}
                          entityId={p.id}
                          onArchive={() => run(() => archivePillar(p.id), `"${p.name}" archived`)}
                          onRestore={() => run(() => updatePillar(p.id, { status: "active" }), `"${p.name}" restored`)}
                          onDelete={() => run(() => removePillar(p.id), `"${p.name}" deleted`)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* UN SDGs */}
      {activeCategory === "sdgs" && (
        <section className="dashboard-panel p-5">
          <p className="text-xs mb-4 max-w-2xl" style={{ color: "var(--color-text-muted)" }}>
            The 17 UN Sustainable Development Goals are a fixed global standard (read-only). Counts show how many
            registry projects map to each goal.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSdgs.map((s) => {
              const stats = getSdgStats(s.id, projects);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg p-3"
                  style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
                    style={{ backgroundColor: s.colorToken }}
                  >
                    {s.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate" title={s.name}>
                      {s.name}
                    </p>
                    <Link href={`/super-admin/projects?sdgId=${s.id}`} className="hover:underline">
                      <CountChip total={stats.total} published={stats.published} />
                    </Link>
                  </div>
                  {/* Sub-target/indicator mapping is a large dataset — deferred. */}
                  <span
                    className="text-[10px] uppercase tracking-wide opacity-50"
                    style={{ color: "var(--color-text-muted)" }}
                    title="SDG sub-target mapping is planned"
                  >
                    Targets ·
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Contact Reasons */}
      {activeCategory === "contact" && (
        <section className="dashboard-panel p-5">
          <p className="text-xs mb-3 max-w-2xl" style={{ color: "var(--color-text-muted)" }}>
            Contact reasons drive inbound routing. Editing a label updates the option shown on public contact forms.
          </p>
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Routing Category</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredContactReasons.map((cr) => (
                  <tr key={cr.id} className={cr.status !== "active" ? "opacity-60" : ""}>
                    <td>
                      <input
                        defaultValue={cr.label}
                        onBlur={(e) => e.target.value !== cr.label && run(() => updateContactReason(cr.id, { label: e.target.value }), "Reason saved")}
                        className="dashboard-input h-8 min-w-[240px]"
                      />
                    </td>
                    <td className="capitalize">{cr.routingCategory?.replace(/_/g, " ") ?? "—"}</td>
                    <td><StatusBadge status={cr.status} /></td>
                    <td>
                      <RowActions
                        status={cr.status}
                        linked={0}
                        entityId={cr.id}
                        onArchive={() => run(() => archiveContactReason(cr.id), `"${cr.label}" archived`)}
                        onRestore={() => run(() => updateContactReason(cr.id, { status: "active" }), `"${cr.label}" restored`)}
                        onDelete={() => run(() => removeContactReason(cr.id), `"${cr.label}" deleted`)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <AddTaxonomyTermModal category={activeCategory} open={addTermOpen} onOpenChange={setAddTermOpen} />
    </div>
  );
}
