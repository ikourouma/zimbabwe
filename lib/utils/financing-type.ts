import type { InvestmentProject } from "@/lib/types";

/**
 * `InvestmentProject.financingType` is free text lifted from ZIDA source decks (e.g.
 * "Public-Private Partnership (PPP)", "25% equity / 75% debt", "Investment structure to be
 * validated") — no two projects phrase it identically, so it can't drive a pill-button filter
 * as-is. This buckets it into a small, stable set of categories instead.
 */
export type FinancingBucket =
  | "PPP / EPC / BOT"
  | "Equity"
  | "Debt"
  | "Blended (Equity + Debt)"
  | "Grant / Technical Assistance"
  | "Structure TBD";

/** Fixed display order for the bucket pill row, independent of data order. */
export const FINANCING_BUCKET_ORDER: FinancingBucket[] = [
  "PPP / EPC / BOT",
  "Blended (Equity + Debt)",
  "Equity",
  "Debt",
  "Grant / Technical Assistance",
  "Structure TBD",
];

const PPP_KEYWORDS = ["ppp", "public-private partnership", "build-operate-transfer", "bot;", "bot)", "blmt", "build, lease, maintain", "epc"];
const TA_KEYWORDS = ["technical assistance"];

/**
 * Classifies a raw financingType sentence into a `FinancingBucket`. Priority order matters:
 * an explicit "technical assistance" mention wins first (this is what routes the two
 * illustrative policy-initiative projects into "Grant / Technical Assistance", matching the
 * phased-TA narrative already established for them elsewhere on the platform), then PPP/EPC/BOT
 * structures, then equity+debt combinations, then single equity or debt mentions, with anything
 * unclassifiable (mostly "structure to be validated" placeholders) falling back to "Structure TBD".
 */
export function classifyFinancingType(raw?: string): FinancingBucket {
  if (!raw) return "Structure TBD";
  const text = raw.toLowerCase();

  if (TA_KEYWORDS.some((kw) => text.includes(kw))) return "Grant / Technical Assistance";
  if (PPP_KEYWORDS.some((kw) => text.includes(kw))) return "PPP / EPC / BOT";

  const hasEquity = text.includes("equity");
  const hasDebt = text.includes("debt") || text.includes("loan");

  if (hasEquity && hasDebt) return "Blended (Equity + Debt)";
  if (hasEquity) return "Equity";
  if (hasDebt) return "Debt";
  return "Structure TBD";
}

/** Distinct buckets actually present in `projects`, in the fixed display order. */
export function getFinancingBuckets(projects: InvestmentProject[]): FinancingBucket[] {
  const present = new Set(projects.map((p) => classifyFinancingType(p.financingType)));
  return FINANCING_BUCKET_ORDER.filter((bucket) => present.has(bucket));
}
