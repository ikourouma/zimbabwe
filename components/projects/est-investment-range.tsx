"use client";

import { useDemoPersona } from "@/context/demo-persona-context";
import { cn } from "@/lib/utils";

interface EstInvestmentRangeProps {
  /** Pre-computed aggregate range (e.g. from getSectorStats/getPillarStats), already `null` when
   *  there's no published project behind it. */
  capitalRange: string | null;
  /** Count of published projects in this group — distinguishes "nothing published yet" from
   *  "published, but none costed yet" so the empty-state copy stays accurate. */
  publishedCount: number;
  label?: string;
  /** Wraps the block in a bordered/padded tile, matching the sibling stat tiles it sits next to
   *  on detail-page stat strips — so hiding it removes the box entirely, not just its contents. */
  boxed?: boolean;
  /** Matches CapitalBreakdown's `dark` prop: true for the dark sovereign-theme pages
   *  (/sectors, /strategic-alignment), false for light zim-theme pages (/sectors/[sector]). */
  dark?: boolean;
  className?: string;
  /** Defaults to the compact card-label style; pass the sibling stat tile's label classes when
   *  this sits alongside other stat tiles, so all labels in the row match. */
  labelClassName?: string;
  valueClassName?: string;
  /** Rendered inside the box below the value — only when an actual range is shown (not for the
   *  empty-state notes, which already explain themselves). E.g. a "pending validation" caveat. */
  footnote?: React.ReactNode;
}

/**
 * Renders the full "Est. Investment Range" label + value block, owning the entire block (not
 * just the figure) so there's zero visual footprint when hidden — no empty box, no orphaned
 * label, no blurred lock teaser. Matches the CapitalBreakdown / Beneficiary Ministry convention
 * used on every ProjectCard: gated at "qualified" (admin-approved), not merely "registered" —
 * a sector/pillar aggregate range is still built from each project's own capital figure, so it
 * follows the same investor-verification gate. Non-qualified visitors already get the
 * registration/verification model explained via the Engagement Pathway / Investor Access Tiers
 * sections and page-level "Register to unlock" prompts, so this stays silent for them rather
 * than showing a teaser.
 */
export function EstInvestmentRange({
  capitalRange,
  publishedCount,
  label = "Est. Investment Range",
  boxed = false,
  dark = false,
  className,
  labelClassName = "text-[0.65rem] uppercase tracking-widest font-semibold",
  valueClassName,
  footnote,
}: EstInvestmentRangeProps) {
  const { isQualified } = useDemoPersona();

  if (!isQualified) return null;

  const mutedClass = dark ? "text-[var(--color-text-muted)]" : "text-zim-muted";
  const borderClass = dark ? "border-[var(--color-sovereign-border)]" : "border-zim-border";
  const hasValue = publishedCount > 0 && Boolean(capitalRange);

  const content = (
    <>
      <p className={cn(labelClassName, "mb-1", mutedClass)}>{label}</p>
      {publishedCount === 0 ? (
        <p className={cn("text-xs italic", mutedClass)}>No published opportunities yet — in preparation</p>
      ) : capitalRange ? (
        <span className={valueClassName}>{capitalRange}</span>
      ) : (
        <p className={cn("text-xs italic", mutedClass)}>Cost estimate pending</p>
      )}
      {hasValue && footnote && <div className="mt-2">{footnote}</div>}
    </>
  );

  if (!boxed) {
    return <div className={className}>{content}</div>;
  }

  return <div className={cn("rounded border p-4", borderClass, className)}>{content}</div>;
}
