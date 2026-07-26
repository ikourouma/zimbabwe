"use client";

import { KanbanSquare, List, Table2, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineView = "kanban" | "list" | "table" | "matrix";

const OPTIONS: { value: PipelineView; label: string; icon: typeof List }[] = [
  { value: "kanban", label: "Kanban", icon: KanbanSquare },
  { value: "list", label: "List", icon: List },
  { value: "table", label: "Table", icon: Table2 },
  { value: "matrix", label: "Matrix", icon: LayoutGrid },
];

/** Kanban / List / Table toggle above the Pipeline board — matches the multi-view pattern of
 *  Jira/Monday/MS Project. Persistence is handled by the parent (localStorage). */
export function PipelineViewSwitcher({
  view,
  onChange,
}: {
  view: PipelineView;
  onChange: (view: PipelineView) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-md p-0.5"
      style={{ border: "1px solid var(--color-sovereign-border)", backgroundColor: "rgba(255,255,255,0.03)" }}
      role="tablist"
      aria-label="Pipeline view"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = view === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]" : "text-[var(--color-text-muted)] hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
