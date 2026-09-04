"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { InvestorEngagement } from "@/lib/types";
import { EngagementStatusPill } from "@/components/deal-room/engagement-status-pill";
import { MOU_STAGE_LABELS, MOU_STAGE_ORDER, mouStageOf, type MouStageFilter } from "@/lib/governance/mou-filters";

interface MouViewProps {
  engagements: InvestorEngagement[];
  projectTitleOf: (projectId: string) => string;
  onCardClick: (engagement: InvestorEngagement) => void;
}

function MouCard({ engagement, projectTitle, onClick }: { engagement: InvestorEngagement; projectTitle: string; onClick: () => void }) {
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

/** Kanban board grouped by MOU lifecycle stage instead of project status (Platform Feedback Batch
 *  v3, Phase 8) — read-only (no drag-to-transition): the dual-approval/finalize/execute gates
 *  live in the MOU tab itself (see mou-workflow.ts's canTransitionMou), so this board's only job
 *  is to surface where every MOU stands, not to mutate it. */
export function MouKanbanView({ engagements, projectTitleOf, onCardClick }: MouViewProps) {
  const columns = useMemo(
    () =>
      MOU_STAGE_ORDER.map((stage) => ({
        stage,
        items: engagements.filter((e) => mouStageOf(e) === stage),
      })),
    [engagements]
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-6 gap-3 min-w-[1080px] lg:min-w-0">
        {columns.map(({ stage, items }) => (
          <div
            key={stage}
            className="min-w-[160px] rounded-lg p-3"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-sovereign-border)" }}
          >
            <div className="mb-3 flex items-center justify-between gap-1">
              <p
                className="text-xs font-semibold uppercase tracking-wide truncate"
                style={{ color: "var(--color-text-muted)" }}
                title={MOU_STAGE_LABELS[stage]}
              >
                {MOU_STAGE_LABELS[stage]}
              </p>
              <span className="text-xs shrink-0" style={{ color: "var(--color-text-muted)" }}>
                {items.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {items.map((e) => (
                <MouCard key={e.id} engagement={e} projectTitle={projectTitleOf(e.projectId)} onClick={() => onCardClick(e)} />
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

/** Mobile-friendly, stage-grouped list alternative to the Kanban board. */
export function MouListView({ engagements, projectTitleOf, onCardClick }: MouViewProps) {
  const groups = useMemo(
    () =>
      MOU_STAGE_ORDER.map((stage) => ({
        stage,
        items: engagements.filter((e) => mouStageOf(e) === stage),
      })).filter((g) => g.items.length > 0),
    [engagements]
  );

  if (groups.length === 0) {
    return (
      <p className="text-sm py-10 text-center" style={{ color: "var(--color-text-muted)" }}>
        No MOUs match the current filters.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.stage}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              {MOU_STAGE_LABELS[group.stage]}
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

/** Organization-column matrix — one column per investor organization, holding every MOU stage
 *  for that organization (complements the stage-oriented Kanban/List with a "who has how many
 *  MOUs in flight" concentration view). */
export function MouMatrixView({ engagements, projectTitleOf, onCardClick }: MouViewProps) {
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
        No MOUs match the current filters.
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
                  <div className="flex items-center justify-between gap-2">
                    <EngagementStatusPill status={e.status} />
                    <span className="text-[11px]" style={{ color: "var(--color-gold)" }}>
                      {MOU_STAGE_LABELS[mouStageOf(e)]}
                    </span>
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
