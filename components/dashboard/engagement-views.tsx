"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { InvestorEngagement } from "@/lib/types";
import { EngagementStatusPill } from "@/components/deal-room/engagement-status-pill";
import { ENGAGEMENT_STATUS_LABELS, ENGAGEMENT_STATUS_ORDER } from "@/lib/governance/engagement-workflow";

interface EngagementViewProps {
  engagements: InvestorEngagement[];
  projectTitleOf: (projectId: string) => string;
  onCardClick: (engagement: InvestorEngagement) => void;
}

function EngagementCard({
  engagement,
  projectTitle,
  onClick,
}: {
  engagement: InvestorEngagement;
  projectTitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="dashboard-panel w-full rounded-md p-3 text-left text-sm hover:ring-2 hover:ring-[var(--color-gold)]/60 transition-shadow"
    >
      <p className="font-medium leading-snug text-white line-clamp-2">{engagement.investorName}</p>
      <p className="mt-1 text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
        {engagement.investorOrganization ? `${engagement.investorOrganization} · ` : ""}
        {projectTitle}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <EngagementStatusPill status={engagement.status} />
        {engagement.ticketSize && (
          <span className="text-[11px] shrink-0" style={{ color: "var(--color-text-muted)" }}>
            {engagement.ticketSize}
          </span>
        )}
      </div>
    </button>
  );
}

/** Kanban board grouped by engagement status (Platform Feedback Batch v4, Phase 1) — mirrors
 *  MouKanbanView's shape. Read-only (no drag-to-transition): the Table view's status dropdown and
 *  the drawer's own actions already govern real transitions (canTransitionEngagement) — this
 *  board's only job is to surface where every engagement stands. */
export function EngagementKanbanView({ engagements, projectTitleOf, onCardClick }: EngagementViewProps) {
  const columns = useMemo(
    () =>
      ENGAGEMENT_STATUS_ORDER.map((status) => ({
        status,
        items: engagements.filter((e) => e.status === status),
      })),
    [engagements]
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-5 gap-3 min-w-[900px] lg:min-w-0">
        {columns.map(({ status, items }) => (
          <div
            key={status}
            className="min-w-[160px] rounded-lg p-3"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}
          >
            <div className="mb-3 flex items-center justify-between gap-1">
              <p
                className="text-xs font-semibold uppercase tracking-wide truncate"
                style={{ color: "var(--color-text-muted)" }}
                title={ENGAGEMENT_STATUS_LABELS[status]}
              >
                {ENGAGEMENT_STATUS_LABELS[status]}
              </p>
              <span className="text-xs shrink-0" style={{ color: "var(--color-text-muted)" }}>
                {items.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {items.map((e) => (
                <EngagementCard key={e.id} engagement={e} projectTitle={projectTitleOf(e.projectId)} onClick={() => onCardClick(e)} />
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
export function EngagementListView({ engagements, projectTitleOf, onCardClick }: EngagementViewProps) {
  const groups = useMemo(
    () =>
      ENGAGEMENT_STATUS_ORDER.map((status) => ({
        status,
        items: engagements.filter((e) => e.status === status),
      })).filter((g) => g.items.length > 0),
    [engagements]
  );

  if (groups.length === 0) {
    return (
      <p className="text-sm py-10 text-center" style={{ color: "var(--color-text-muted)" }}>
        No engagements match the current filters.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.status}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              {ENGAGEMENT_STATUS_LABELS[group.status]}
            </h3>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {group.items.length}
            </span>
          </div>
          <ul className="space-y-1.5">
            {group.items.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onCardClick(e)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                  style={{ border: "1px solid var(--color-sovereign-border)", backgroundColor: "rgba(255,255,255,0.02)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{e.investorName}</p>
                    <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                      {e.investorOrganization ? `${e.investorOrganization} · ` : ""}
                      {projectTitleOf(e.projectId)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <EngagementStatusPill status={e.status} />
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

const UNCLASSIFIED = "__unclassified__";

/** Organization-column matrix — one column per investor organization, holding every engagement
 *  status for that organization (complements the status-oriented Kanban/List with a "who has how
 *  many engagements in flight" concentration view). */
export function EngagementMatrixView({ engagements, projectTitleOf, onCardClick }: EngagementViewProps) {
  const columns = useMemo(() => {
    const byOrg = new Map<string, InvestorEngagement[]>();
    for (const e of engagements) {
      const key = e.investorOrganization?.trim() || UNCLASSIFIED;
      const bucket = byOrg.get(key);
      if (bucket) bucket.push(e);
      else byOrg.set(key, [e]);
    }
    return [...byOrg.entries()]
      .map(([name, items]) => ({ name: name === UNCLASSIFIED ? "Unclassified" : name, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [engagements]);

  if (columns.length === 0) {
    return (
      <p className="text-sm py-10 text-center" style={{ color: "var(--color-text-muted)" }}>
        No engagements match the current filters.
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div key={column.name} className="flex w-72 shrink-0 flex-col">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide truncate" style={{ color: "var(--color-text-secondary)" }}>
              {column.name}
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
            {column.items.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onCardClick(e)}
                  className="flex w-full flex-col gap-2 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                  style={{ border: "1px solid var(--color-sovereign-border)", backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <p className="text-sm font-medium text-white line-clamp-2">{e.investorName}</p>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                    {projectTitleOf(e.projectId)}
                  </p>
                  <EngagementStatusPill status={e.status} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
