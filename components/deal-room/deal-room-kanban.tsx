"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { InvestmentProject, ProjectStatus } from "@/lib/types";
import type { WorkflowRole } from "@/lib/governance/project-workflow";
import { canTransition, STATUS_LABELS } from "@/lib/governance/project-workflow";
import { StatusBadge } from "@/components/projects/status-badge";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Every status the workflow can hold, archived included. Archived used to be left off to keep the
 *  board focused on active deals, but the status pills above it count archived projects in their
 *  All total, so the board displayed one fewer card than the row above it claimed — and selecting
 *  the Archived pill on the registry views produced an empty board rather than the closed records
 *  it named. A column that is usually empty costs less than a board that cannot show what the
 *  filter above it selects. */
const BOARD_COLUMNS: ProjectStatus[] = [
  "draft",
  "submitted_for_review",
  "under_review",
  "changes_requested",
  "approved",
  "published",
  "archived",
];

interface DealRoomKanbanProps {
  projects: InvestmentProject[];
  /** null means read-only (no drag) — e.g. a qualified investor viewing the board. */
  role: WorkflowRole | null;
  onStatusChange: (projectId: string, status: ProjectStatus) => void;
  /** Opens the shared project detail drawer (components/dashboard/project-detail-drawer.tsx). */
  onCardClick?: (project: InvestmentProject) => void;
  /** Communication Hub entry point — opens the drawer straight to its Messages tab (see the
   *  Deal Room Engagement and MOU Upgrade plan's "ask ZIDA a question" entry points). */
  onMessageClick?: (project: InvestmentProject) => void;
}

export function DealRoomKanban({ projects, role, onStatusChange, onCardClick, onMessageClick }: DealRoomKanbanProps) {
  const { ministries } = useTaxonomyStore();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);

  const getMinistryById = (id: string) => ministries.find((m) => m.id === id);

  const canDrag = role !== null;

  const handleDrop = (column: ProjectStatus) => {
    setDragOverColumn(null);
    if (!draggedId || !role) return;
    const project = projects.find((p) => p.id === draggedId);
    setDraggedId(null);
    if (!project || project.projectStatus === column) return;

    if (!canTransition(project.projectStatus, column, role)) {
      toast.error(
        `Can't move "${project.title.slice(0, 40)}" from ${STATUS_LABELS[project.projectStatus]} to ${STATUS_LABELS[column]} with this role.`
      );
      return;
    }
    onStatusChange(project.id, column);
    toast.success(`${project.title.slice(0, 40)} moved to ${STATUS_LABELS[column]}`);
  };

  return (
    <div>
      {/* Fluid 7-up grid at lg+ so every stage is visible without scrolling (see the Phase 6
       *  "columns cut off" fix) — falls back to a horizontally-scrollable fixed-width row below
       *  that breakpoint, where 7 comfortably-readable columns can't fit regardless of layout. */}
      <div className="overflow-x-auto pb-2 lg:overflow-visible">
        <div className="grid grid-cols-7 gap-3 min-w-[1050px] lg:min-w-0">
          {BOARD_COLUMNS.map((column) => {
            const columnProjects = projects.filter((p) => p.projectStatus === column);
            return (
              <div
                key={column}
                className={cn(
                  "min-w-[140px] lg:min-w-0 rounded-lg p-3 transition-colors",
                  dragOverColumn === column && canDrag && "ring-2 ring-[var(--color-gold)]"
                )}
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--color-sovereign-border)",
                }}
                onDragOver={(e) => {
                  if (!canDrag) return;
                  e.preventDefault();
                  setDragOverColumn(column);
                }}
                onDragLeave={() => setDragOverColumn((c) => (c === column ? null : c))}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(column);
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-1">
                  <p
                    className="text-xs font-semibold uppercase tracking-wide truncate"
                    style={{ color: "var(--color-text-muted)" }}
                    title={STATUS_LABELS[column]}
                  >
                    {STATUS_LABELS[column]}
                  </p>
                  <span className="text-xs shrink-0" style={{ color: "var(--color-text-muted)" }}>
                    {columnProjects.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {columnProjects.map((project) => (
                    <div
                      key={project.id}
                      draggable={canDrag}
                      onDragStart={() => setDraggedId(project.id)}
                      onDragEnd={() => setDraggedId(null)}
                      onClick={() => onCardClick?.(project)}
                      className={cn(
                        "dashboard-panel rounded-md p-3 text-sm",
                        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                        onCardClick && "hover:ring-2 hover:ring-[var(--color-gold)]/60 transition-shadow"
                      )}
                    >
                      {/* Three lines rather than two, and the full title on hover. At two lines in a
                       *  seven-column grid every card read "Goromonzi Agro…", "Mossfield Crop…",
                       *  "CICADA Macadamia…" — no card on the board showed a complete project name,
                       *  which is the one thing a card exists to communicate. */}
                      <p className="font-medium leading-snug text-white line-clamp-3" title={project.title}>
                        {project.title}
                      </p>
                      <p className="mt-1 text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                        {(() => {
                          const ministry = getMinistryById(project.primaryBeneficiaryMinistryId);
                          if (!ministry) return "Unassigned";
                          return ministry.representativeTitle
                            ? `${ministry.shortName} · ${ministry.representativeTitle}`
                            : ministry.shortName;
                        })()}
                      </p>
                      {/* The capital requirement gets a line of its own. Appended to the ministry
                       *  line it was always the part that fell off the end of the truncation
                       *  ("Agriculture · US$36…"), which is the wrong half to lose: the figure is
                       *  the one number released to every tier, and the whole reason an investor
                       *  can size an opportunity before pursuing it. */}
                      {project.capitalRequired && (
                        // Clamped to two lines, and titled with the full value. A handful of
                        // records carry a whole validation note in this field rather than a figure
                        // ("Multiple estimated project costs listed in source deck: US$81.6m, …;
                        // components require validation"), which unclamped turned one card into a
                        // column of prose. Truncating a paragraph is right; truncating a figure was
                        // not, which is why it no longer shares a line with the ministry name.
                        <p
                          className="mt-0.5 text-xs font-medium line-clamp-2"
                          style={{ color: "var(--color-gold)" }}
                          title={project.capitalRequired}
                        >
                          {project.capitalRequired}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <StatusBadge status={project.projectStatus} />
                        {onMessageClick && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMessageClick(project);
                            }}
                            title="Ask ZIDA a question"
                            className="rounded-full p-1 hover:bg-white/10 transition-colors shrink-0"
                          >
                            <MessageCircle className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {columnProjects.length === 0 && (
                    <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>No projects</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!canDrag && (
        <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Qualified investors have read-only visibility into deal status.
        </p>
      )}
    </div>
  );
}
