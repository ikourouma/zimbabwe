"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface MobileStatusBoardColumn<T> {
  key: string;
  label: string;
  items: T[];
}

/** Shared mobile (below `lg`) alternative to the fixed-width horizontal-scroll Kanban grid every
 *  board on the platform used — see docs/UAT-Defect-Log.md for the filed defect. Mirrors the
 *  pattern most mobile Kanban apps (Trello included)
 *  land on: a horizontally-scrollable row of status "chips" standing in for the columns, and a
 *  single full-width vertical list showing only the active one at a time.
 *
 *  Deliberately generic over the item type: every board on the platform (projects, engagements,
 *  inquiries, MOUs) already computes the same `{ key, label, items }` column shape for its
 *  existing desktop grid — this component is the one thing that needs to exist per board is the
 *  card renderer, not a second copy of the grouping/columns logic. */
export function MobileStatusBoard<T>({
  columns,
  getId,
  renderCard,
  emptyLabel = "Nothing in this stage.",
}: {
  columns: MobileStatusBoardColumn<T>[];
  getId: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  emptyLabel?: string;
}) {
  const firstNonEmptyKey = columns.find((c) => c.items.length > 0)?.key ?? columns[0]?.key;
  const [activeKey, setActiveKey] = useState(firstNonEmptyKey);
  const active = columns.find((c) => c.key === activeKey) ?? columns[0];

  if (!active) return null;

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" role="tablist">
        {columns.map((column) => (
          <button
            key={column.key}
            type="button"
            role="tab"
            aria-selected={column.key === active.key}
            onClick={() => setActiveKey(column.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
              column.key === active.key
                ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[#061810]"
                : "border-[var(--color-sovereign-border)] text-[var(--color-text-muted)]"
            )}
          >
            {column.label} <span className="opacity-70">{column.items.length}</span>
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {active.items.length > 0 ? (
          active.items.map((item) => <div key={getId(item)}>{renderCard(item)}</div>)
        ) : (
          <p className="py-8 text-center text-xs italic" style={{ color: "var(--color-text-muted)" }}>
            {emptyLabel}
          </p>
        )}
      </div>
    </div>
  );
}
