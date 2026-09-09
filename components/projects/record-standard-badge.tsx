"use client";

import { cn } from "@/lib/utils";
import { isZidaCatalogueRecord } from "@/lib/governance/record-standard";

/**
 * Flags a project as one of the 32 ZIDA catalogue records, so a reader can tell which standard it
 * was captured under without opening the source-reference line. Renders nothing for a project
 * created through the wizard — the full template is the unmarked default, not a second badge to
 * track.
 */
export function RecordStandardBadge({
  sourceReference,
  recordStandard,
  className,
}: {
  sourceReference?: string | null;
  recordStandard?: "catalogue_seed" | "full_template" | null;
  className?: string;
}) {
  if (!isZidaCatalogueRecord({ sourceReference, recordStandard })) return null;

  return (
    <span
      className={cn("status-badge status-badge-pending", className)}
      title="Seeded from the ZIDA 2025 Projects deck and pending official validation — not yet captured against the platform's full project data standard."
    >
      Catalogue Seed
    </span>
  );
}
