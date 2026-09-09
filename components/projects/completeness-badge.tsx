"use client";

import { cn } from "@/lib/utils";
import { scoreProjectCompleteness } from "@/lib/governance/project-completeness";
import type { InvestmentProject } from "@/lib/types";

/**
 * Project Data Standardisation, Phase 3 — the completeness score surfaced wherever a reviewer
 * decides whether a project is ready to publish: the Review Queue card and the project detail
 * drawer. A `catalogue_seed` record (see RecordStandardBadge) still shows its real score for
 * transparency, but never in the color that implies it's blocked — the publication gate
 * (lib/governance/project-completeness.ts `meetsPublicationMinimum`, enforced in
 * PATCH /api/projects/[id]) never applies to it.
 */
export function CompletenessBadge({
  project,
  className,
}: {
  project: Partial<InvestmentProject>;
  className?: string;
}) {
  const { score, missing, exemptFromGate } = scoreProjectCompleteness(project);
  const tone = exemptFromGate
    ? { bg: "rgba(255,255,255,0.08)", fg: "var(--color-text-muted)" }
    : score >= 70
      ? { bg: "rgba(34,197,94,0.15)", fg: "#4ade80" }
      : score >= 40
        ? { bg: "rgba(251,191,36,0.15)", fg: "#fbbf24" }
        : { bg: "rgba(248,113,113,0.15)", fg: "#f87171" };

  const title = exemptFromGate
    ? `${score}% complete against the full data standard — exempt from the publication gate as a ZIDA catalogue record.${missing.length ? ` Not stated in source catalogue: ${missing.join(", ")}.` : ""}`
    : `${score}% complete against the full data standard.${missing.length ? ` Missing: ${missing.join(", ")}.` : ""}`;

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold", className)}
      style={{ backgroundColor: tone.bg, color: tone.fg }}
      title={title}
    >
      {score}% complete
    </span>
  );
}

/** Full missing-fields list, for the detail drawer's expanded completeness panel rather than
 *  just the summary badge's tooltip. */
export function CompletenessDetail({ project }: { project: Partial<InvestmentProject> }) {
  const { score, missing, exemptFromGate, filled, total } = scoreProjectCompleteness(project);
  if (missing.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Complete against the full data standard ({filled}/{total} fields).
      </p>
    );
  }
  return (
    <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
      <p className="mb-1">
        {score}% complete ({filled}/{total} fields){exemptFromGate ? " — exempt from the publication gate as a ZIDA catalogue record" : ""}:
      </p>
      <ul className="list-disc list-inside space-y-0.5">
        {missing.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </div>
  );
}
