/**
 * Parses the free-text `capitalRequired` field (sourced from the ZIDA 2025 deck) into a
 * structured, labeled breakdown — e.g. Total Cost / Equity / Debt / Phase N — so the UI can
 * render a consistent bulleted cost structure instead of a raw string, without ever hardcoding
 * per-project values. Every item is derived purely from the source text.
 */

export interface CapitalBreakdownItem {
  label: string;
  amount: string;
}

const TOTAL_COST_LABEL = "Total Cost Estimate";

const MONEY_REGEX = /(?:US\$|USD\$?|\$)\s?([\d,]+(?:\.\d+)?)\s*(million|billion|bn|m)?\b/gi;
const PERCENT_REGEX = /(\d+(?:\.\d+)?)\s*%\s*(equity|debt)/gi;
const PHASE_REGEX = /phase\s*([ivx]+|\d+)/i;

const ROMAN_TO_NUMBER: Record<string, string> = { i: "1", ii: "2", iii: "3", iv: "4", v: "5" };

interface MoneyMatch {
  start: number;
  end: number;
  valueMillions: number;
}

interface PercentMatch {
  start: number;
  value: number;
  kind: "Equity" | "Debt";
}

function parseMoneyValue(numStr: string, unit?: string): number {
  const num = parseFloat(numStr.replace(/,/g, ""));
  if (!unit) return num / 1_000_000;
  return unit.toLowerCase().startsWith("b") ? num * 1000 : num;
}

function trimNumber(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

/** Formats a value already expressed in millions of USD, switching to billions above $1000M
 *  (e.g. 1168 -> "$1.17B") so large aggregated figures stay readable. */
export function formatMillions(valueMillions: number): string {
  if (valueMillions >= 1000) return `$${trimNumber(valueMillions / 1000)}B`;
  return `$${trimNumber(valueMillions)}M`;
}

function detectLabel(segmentText: string): string | null {
  if (/total/i.test(segmentText)) return TOTAL_COST_LABEL;
  if (/equity/i.test(segmentText)) return "Equity";
  if (/debt/i.test(segmentText)) return "Debt";
  const phaseMatch = segmentText.match(PHASE_REGEX);
  if (phaseMatch) {
    const raw = phaseMatch[1].toLowerCase();
    return `Phase ${ROMAN_TO_NUMBER[raw] ?? raw}`;
  }
  return null;
}

function findMoneyMatches(raw: string): MoneyMatch[] {
  const matches: MoneyMatch[] = [];
  for (const m of raw.matchAll(MONEY_REGEX)) {
    if (m.index === undefined) continue;
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      valueMillions: parseMoneyValue(m[1], m[2]),
    });
  }
  return matches;
}

function findPercentMatches(raw: string): PercentMatch[] {
  const matches: PercentMatch[] = [];
  for (const m of raw.matchAll(PERCENT_REGEX)) {
    if (m.index === undefined) continue;
    matches.push({
      start: m.index,
      value: parseFloat(m[1]),
      kind: m[2].toLowerCase() === "equity" ? "Equity" : "Debt",
    });
  }
  return matches;
}

/** Split raw text into segments at `;` and at `,` that fall outside any money match span. */
function buildSegments(raw: string, moneyMatches: MoneyMatch[]): { start: number; end: number }[] {
  const cutPoints = new Set<number>();
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === ";") {
      cutPoints.add(i);
    } else if (ch === ",") {
      const insideMoney = moneyMatches.some((mm) => i >= mm.start && i < mm.end);
      if (!insideMoney) cutPoints.add(i);
    }
  }
  const boundaries = [0, ...Array.from(cutPoints).sort((a, b) => a - b), raw.length];
  const segments: { start: number; end: number }[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    segments.push({ start: boundaries[i], end: boundaries[i + 1] });
  }
  return segments;
}

type PendingMoneyItem = { start: number; valueMillions: number; label: string | null };

/** Splits `raw` into segments/sub-chunks (never concatenating distinct dollar figures) and
 *  attaches whatever label (`detectLabel`) each figure's local text implies — shared by
 *  `parseCapitalBreakdown` and `parseCapitalTotalMillions` so both always agree on how many
 *  distinct figures a string contains and what each one represents. */
function buildPendingMoneyItems(raw: string, moneyMatches: MoneyMatch[]): PendingMoneyItem[] {
  const segments = buildSegments(raw, moneyMatches);
  const pending: PendingMoneyItem[] = [];

  for (const segment of segments) {
    const segMoney = moneyMatches.filter((mm) => mm.start >= segment.start && mm.start < segment.end);
    if (segMoney.length === 0) continue;

    if (segMoney.length === 1) {
      const text = raw.slice(segment.start, segment.end);
      pending.push({ start: segMoney[0].start, valueMillions: segMoney[0].valueMillions, label: detectLabel(text) });
      continue;
    }

    // Multiple amounts sharing one segment (typically joined by "and") — cut precisely at the
    // "and" boundary so a keyword attached to one amount can't bleed into its neighbor's search.
    const andCuts: number[] = [];
    for (const m of raw.slice(segment.start, segment.end).matchAll(/\band\b/gi)) {
      if (m.index !== undefined) andCuts.push(segment.start + m.index);
    }
    const subBoundaries = [segment.start, ...andCuts.sort((a, b) => a - b), segment.end];
    for (let i = 0; i < subBoundaries.length - 1; i++) {
      const subStart = subBoundaries[i];
      const subEnd = subBoundaries[i + 1];
      const subMoney = segMoney.filter((mm) => mm.start >= subStart && mm.start < subEnd);
      for (let j = 0; j < subMoney.length; j++) {
        const chunkStart = j === 0 ? subStart : subMoney[j - 1].end;
        const chunkEnd = j === subMoney.length - 1 ? subEnd : subMoney[j + 1].start;
        const text = raw.slice(chunkStart, chunkEnd);
        pending.push({ start: subMoney[j].start, valueMillions: subMoney[j].valueMillions, label: detectLabel(text) });
      }
    }
  }

  pending.sort((a, b) => a.start - b.start);
  return pending;
}

/** Labels the first unlabeled figure as the Total Cost Estimate whenever no figure is already
 *  explicitly labeled "total" — the ZIDA deck convention of stating the headline ask first, then
 *  breaking it into equity/debt/phase components. Guarantees exactly one TOTAL_COST_LABEL item
 *  whenever `pending` is non-empty, so downstream code can always find "the" total. */
function applyTotalFallback(pending: PendingMoneyItem[]): { label: string; valueMillions: number }[] {
  const hasExplicitTotal = pending.some((p) => p.label === TOTAL_COST_LABEL);
  let unlabeledCount = 0;
  return pending.map((p) => {
    if (p.label) return { label: p.label, valueMillions: p.valueMillions };
    unlabeledCount += 1;
    const label = !hasExplicitTotal && unlabeledCount === 1 ? TOTAL_COST_LABEL : `Cost Component ${unlabeledCount}`;
    return { label, valueMillions: p.valueMillions };
  });
}

export function parseCapitalBreakdown(raw?: string): CapitalBreakdownItem[] {
  if (!raw) return [];

  const moneyMatches = findMoneyMatches(raw);
  if (moneyMatches.length === 0) return [];

  const percentMatches = findPercentMatches(raw);
  const pending = buildPendingMoneyItems(raw, moneyMatches);

  const moneyItems: CapitalBreakdownItem[] = applyTotalFallback(pending).map((p) => ({
    label: p.label,
    amount: formatMillions(p.valueMillions),
  }));

  const percentItems: CapitalBreakdownItem[] = percentMatches
    .sort((a, b) => a.start - b.start)
    .map((p) => ({ label: p.kind, amount: `${trimNumber(p.value)}%` }));

  // De-duplicate fixed labels (Total Cost / Equity / Debt), keeping the first occurrence —
  // generated labels (Cost Component N, Phase N) are already unique and always kept.
  const seen = new Set<string>();
  const deduped: CapitalBreakdownItem[] = [];
  for (const item of [...moneyItems, ...percentItems]) {
    const isGenerated = /^cost component \d+$|^phase /i.test(item.label);
    if (!isGenerated) {
      const key = item.label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    deduped.push(item);
  }

  const priority = (label: string) => (label === TOTAL_COST_LABEL ? 0 : label === "Equity" ? 1 : label === "Debt" ? 2 : 3);
  return deduped
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => priority(a.item.label) - priority(b.item.label) || a.idx - b.idx)
    .map((w) => w.item);
}

/**
 * Headline/total capital figure in millions of USD — the figure explicitly labeled "total" if
 * present, otherwise the first-listed figure (same convention as `parseCapitalBreakdown`'s Cost
 * Structure card, so aggregate ranges on the Strategic Alignment / Sectors pages always agree
 * with what's shown on the project's own detail page). Unlike a naive "strip everything but
 * digits" parse, this never concatenates multiple distinct dollar figures in one string into a
 * single garbage number, and correctly scales "million"/"billion"/bare-dollar-amount units.
 */
export function parseCapitalTotalMillions(raw?: string): number | null {
  if (!raw) return null;

  const moneyMatches = findMoneyMatches(raw);
  if (moneyMatches.length === 0) return null;

  const pending = buildPendingMoneyItems(raw, moneyMatches);
  const labeled = applyTotalFallback(pending);
  const total = labeled.find((p) => p.label === TOTAL_COST_LABEL);
  return total ? total.valueMillions : labeled[0]?.valueMillions ?? null;
}
