"use client";

import { ChevronRight, MessageCircle } from "lucide-react";
import type { InvestmentProject, ProjectStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/governance/project-workflow";
import { StatusBadge } from "@/components/projects/status-badge";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";

const GROUP_ORDER: ProjectStatus[] = [
  "draft",
  "submitted_for_review",
  "under_review",
  "changes_requested",
  "approved",
  "published",
  "archived",
];

interface PipelineListViewProps {
  projects: InvestmentProject[];
  onCardClick: (project: InvestmentProject) => void;
  onMessageClick?: (project: InvestmentProject) => void;
}

/** Mobile-friendly, status-grouped list alternative to the Kanban board (same click-through to
 *  the shared ProjectDetailDrawer). */
export function PipelineListView({ projects, onCardClick, onMessageClick }: PipelineListViewProps) {
  const { ministries } = useTaxonomyStore();
  const groups = GROUP_ORDER.map((status) => ({
    status,
    items: projects.filter((p) => p.projectStatus === status),
  })).filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <p className="text-sm py-10 text-center" style={{ color: "var(--color-text-muted)" }}>
        No projects match the current filters.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.status}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              {STATUS_LABELS[group.status]}
            </h3>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {group.items.length}
            </span>
          </div>
          <ul className="space-y-1.5">
            {group.items.map((project) => {
              const ministry = ministries.find((m) => m.id === project.primaryBeneficiaryMinistryId);
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => onCardClick(project)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                    style={{ border: "1px solid var(--color-sovereign-border)", backgroundColor: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{project.title}</p>
                      <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                        {ministry?.shortName ?? "—"}
                        {project.capitalRequired ? ` · ${project.capitalRequired}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={project.projectStatus} />
                      {onMessageClick && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMessageClick(project);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              onMessageClick(project);
                            }
                          }}
                          title="Ask ZIDA a question"
                          className="rounded-full p-1 hover:bg-white/10 transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
                        </span>
                      )}
                      <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
