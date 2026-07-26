"use client";

import { useMemo } from "react";
import { MessageCircle } from "lucide-react";
import type { InvestmentProject } from "@/lib/types";
import { StatusBadge } from "@/components/projects/status-badge";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";

interface PipelineMatrixViewProps {
  projects: InvestmentProject[];
  onCardClick: (project: InvestmentProject) => void;
  onMessageClick?: (project: InvestmentProject) => void;
}

const UNCLASSIFIED = "__unclassified__";

/** Sector-column matrix view of the pipeline: one column per sector (Fortune-100 portfolio-by-theme
 *  lens), each holding the projects in that sector across every workflow status. Complements the
 *  status-oriented Kanban/List by exposing sector concentration at a glance. Click-through uses the
 *  same shared ProjectDetailDrawer as the other views. */
export function PipelineMatrixView({ projects, onCardClick, onMessageClick }: PipelineMatrixViewProps) {
  const { sectors, ministries } = useTaxonomyStore();

  const columns = useMemo(() => {
    const bySector = new Map<string, InvestmentProject[]>();
    for (const p of projects) {
      const key = p.sectorId || UNCLASSIFIED;
      const bucket = bySector.get(key);
      if (bucket) bucket.push(p);
      else bySector.set(key, [p]);
    }
    // Preserve the taxonomy's sector order; append any unclassified bucket last.
    const ordered = sectors
      .map((s) => ({ id: s.id, name: s.shortName ?? s.name, items: bySector.get(s.id) ?? [] }))
      .filter((c) => c.items.length > 0);
    const unclassified = bySector.get(UNCLASSIFIED);
    if (unclassified?.length) {
      ordered.push({ id: UNCLASSIFIED, name: "Unclassified", items: unclassified });
    }
    return ordered;
  }, [projects, sectors]);

  if (columns.length === 0) {
    return (
      <p className="text-sm py-10 text-center" style={{ color: "var(--color-text-muted)" }}>
        No projects match the current filters.
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div key={column.id} className="flex w-72 shrink-0 flex-col">
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
            {column.items.map((project) => {
              const ministry = ministries.find((m) => m.id === project.primaryBeneficiaryMinistryId);
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => onCardClick(project)}
                    className="flex w-full flex-col gap-2 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                    style={{ border: "1px solid var(--color-sovereign-border)", backgroundColor: "rgba(255,255,255,0.03)" }}
                  >
                    <p className="text-sm font-medium text-white line-clamp-2">{project.title}</p>
                    <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                      {ministry?.shortName ?? "—"}
                      {project.capitalRequired ? ` · ${project.capitalRequired}` : ""}
                    </p>
                    <div className="flex items-center justify-between gap-2">
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
