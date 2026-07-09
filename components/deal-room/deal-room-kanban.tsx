"use client";

import { useState } from "react";
import type { InvestmentProject, ProjectStatus } from "@/lib/types";
import type { WorkflowRole } from "@/lib/governance/project-workflow";
import { canTransition, STATUS_LABELS } from "@/lib/governance/project-workflow";
import { StatusBadge } from "@/components/projects/status-badge";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Archived projects are intentionally excluded from the board to keep it focused on active deals. */
const BOARD_COLUMNS: ProjectStatus[] = [
  "draft",
  "submitted_for_review",
  "under_review",
  "changes_requested",
  "approved",
  "published",
];

interface DealRoomKanbanProps {
  projects: InvestmentProject[];
  /** null means read-only (no drag) — e.g. a qualified investor viewing the board. */
  role: WorkflowRole | null;
  onStatusChange: (projectId: string, status: ProjectStatus) => void;
}

export function DealRoomKanban({ projects, role, onStatusChange }: DealRoomKanbanProps) {
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
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-[960px]">
          {BOARD_COLUMNS.map((column) => {
            const columnProjects = projects.filter((p) => p.projectStatus === column);
            return (
              <div
                key={column}
                className={cn(
                  "flex-1 min-w-[220px] rounded-lg border bg-zim-off-white/40 p-3 transition-colors",
                  dragOverColumn === column && canDrag && "ring-2 ring-zim-gold"
                )}
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
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zim-muted">
                    {STATUS_LABELS[column]}
                  </p>
                  <span className="text-xs text-zim-muted">{columnProjects.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {columnProjects.map((project) => (
                    <div
                      key={project.id}
                      draggable={canDrag}
                      onDragStart={() => setDraggedId(project.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className={cn(
                        "rounded-md border bg-white p-3 shadow-sm text-sm",
                        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                      )}
                    >
                      <p className="font-medium leading-snug">{project.title}</p>
                      <p className="mt-1 text-xs text-zim-muted">
                        {(() => {
                          const ministry = getMinistryById(project.primaryBeneficiaryMinistryId);
                          if (!ministry) return "Unassigned";
                          return ministry.representativeTitle
                            ? `${ministry.shortName} · ${ministry.representativeTitle}`
                            : ministry.shortName;
                        })()}
                        {project.capitalRequired ? ` · ${project.capitalRequired}` : ""}
                      </p>
                      <div className="mt-2">
                        <StatusBadge status={project.projectStatus} />
                      </div>
                    </div>
                  ))}
                  {columnProjects.length === 0 && (
                    <p className="text-xs text-zim-muted/70 italic">No projects</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!canDrag && (
        <p className="mt-3 text-xs text-zim-muted">
          Qualified investors have read-only visibility into deal status. Switch to a Government or
          Admin demo persona in the header to move cards between stages.
        </p>
      )}
    </div>
  );
}
