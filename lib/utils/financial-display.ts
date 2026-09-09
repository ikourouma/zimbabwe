/**
 * Project Data Standardisation, Phase 3 — display strings for the five return metrics that
 * prefer the structured numeric column (`irrPct`, `npvUsd`, `roiPct`, `paybackMonths`,
 * `projectedRevenueUsd`/`projectedRevenueYears`) over the legacy free-text field it sits beside
 * (`irr`, `npv`, `roi`, `paybackPeriod`, `projectedRevenue`).
 *
 * The project wizard (components/admin/project-wizard.tsx) writes only the numeric columns for
 * every project created from here on — the text fields are the ZIDA-deck catalogue's format, not
 * something a new full_template project has any reason to populate. Without this fallback, a
 * return metric entered through the wizard would be silently invisible on the pages that render
 * the text field directly. Catalogue-seed records still show their original deck wording verbatim
 * (no numeric column takes precedence over an existing text value change here — both are simply
 * "whichever is present"), so nothing about how the 32 seeded records already read changes.
 */

import type { InvestmentProject } from "@/lib/types";

type FinancialFields = Pick<
  InvestmentProject,
  | "irr"
  | "irrPct"
  | "npv"
  | "npvUsd"
  | "roi"
  | "roiPct"
  | "paybackPeriod"
  | "paybackMonths"
  | "projectedRevenue"
  | "projectedRevenueUsd"
  | "projectedRevenueYears"
>;

function trimDecimals(n: number, decimals = 2): string {
  return parseFloat(n.toFixed(decimals)).toString();
}

/** Word-style USD formatting to match the ZIDA deck's own phrasing ("US$2.86 million") rather
 *  than the "$2.86M" abbreviation used on dense display surfaces (cards, tables). */
function formatUsdWords(value: number): string {
  if (value >= 1_000_000_000) return `US$${trimDecimals(value / 1_000_000_000)} billion`;
  if (value >= 1_000_000) return `US$${trimDecimals(value / 1_000_000)} million`;
  return `US$${value.toLocaleString()}`;
}

export function displayIrr(project: FinancialFields): string | null {
  if (typeof project.irrPct === "number") return `${trimDecimals(project.irrPct)}%`;
  return project.irr ?? null;
}

export function displayNpv(project: FinancialFields): string | null {
  if (typeof project.npvUsd === "number") return formatUsdWords(project.npvUsd);
  return project.npv ?? null;
}

export function displayRoi(project: FinancialFields): string | null {
  if (typeof project.roiPct === "number") return `${trimDecimals(project.roiPct)}%`;
  return project.roi ?? null;
}

export function displayPaybackPeriod(project: FinancialFields): string | null {
  if (typeof project.paybackMonths === "number") {
    const years = Math.floor(project.paybackMonths / 12);
    const months = project.paybackMonths % 12;
    const yearsPart = years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "";
    const monthsPart = months > 0 ? `${months} month${months === 1 ? "" : "s"}` : "";
    return [yearsPart, monthsPart].filter(Boolean).join(", ") || "0 months";
  }
  return project.paybackPeriod ?? null;
}

export function displayProjectedRevenue(project: FinancialFields): string | null {
  if (typeof project.projectedRevenueUsd === "number") {
    const amount = formatUsdWords(project.projectedRevenueUsd);
    return typeof project.projectedRevenueYears === "number"
      ? `${amount} over ${project.projectedRevenueYears} year${project.projectedRevenueYears === 1 ? "" : "s"}`
      : amount;
  }
  return project.projectedRevenue ?? null;
}
