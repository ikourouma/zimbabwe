/**
 * Project Data Standardisation, Phase 2 — one-time backfill that parses the free-text financial
 * fields the ZIDA 2025 deck seeded (`capitalRequired`, `irr`, `npv`, `roi`, `paybackPeriod`,
 * `projectedRevenue`) into the structured numeric columns added alongside them, and stamps every
 * row's `record_standard`.
 *
 * The text fields are never touched or deleted — they stay exactly as written, the source note
 * and audit trail back to the deck. This script only ever writes the new `*_usd` / `*_pct` /
 * `*_months` / `*_years` / `financial_data_caveat` / `record_standard` columns.
 *
 * Follows the dry-run/`--commit` pattern already used by scripts/repair-mojibake.ts: every run
 * prints what it found (or would write) per project, and nothing is written to the database
 * unless `--commit` is passed.
 *
 *   npx tsx --env-file=.env.local scripts/migrate-financial-fields.ts            # dry run
 *   npx tsx --env-file=.env.local scripts/migrate-financial-fields.ts --commit   # apply
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { parseCapitalTotalMillions } from "@/lib/utils/capital";
import { isZidaCatalogueRecord } from "@/lib/governance/record-standard";

const COMMIT = process.argv.includes("--commit");

// ---------------------------------------------------------------------------
// Generic text -> number parsers, tuned to the phrasing the ZIDA 2025 deck actually uses (see
// lib/data/seed-raw.ts). Each is deliberately narrow rather than a do-everything regex — anything
// a pattern here doesn't confidently resolve is meant to fall through to OVERRIDES below rather
// than guess.
// ---------------------------------------------------------------------------

const MONEY_RE = /(?:US\$|USD\$?|\$)\s?([\d,]+(?:\.\d+)?)\s*(million|billion|bn|m)?\b/i;
const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, twentyfive: 25,
};

function moneyFromParts(numStr: string, unit?: string): number {
  const num = parseFloat(numStr.replace(/,/g, ""));
  const scaled = !unit ? num : unit.toLowerCase().startsWith("b") ? num * 1_000_000_000 : num * 1_000_000;
  // Source figures never carry more than cent precision — rounding here clears the binary
  // floating-point noise multiplication introduces (e.g. 8.232 * 1_000_000 = 8231999.999999999)
  // rather than writing that noise into a numeric column that can represent the exact value.
  return Math.round(scaled * 100) / 100;
}

/** First dollar figure in `text`, in whole USD (not millions) — used for npv and as the fallback
 *  for projectedRevenue once the more specific patterns below don't match. */
function firstMoneyUsd(text: string): number | null {
  const m = text.match(MONEY_RE);
  return m ? moneyFromParts(m[1], m[2]) : null;
}

/** First percentage in `text` — covers every irr/roi value in the deck ("20.8%", "14%/yr",
 *  "41% - 5 years", "17.7% annual average", ...): all lead with the number that matters. */
function firstPercent(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

/** "X years[, Y months]" / "X year(s) and Y months" / "X months" -> total months. Every
 *  `paybackPeriod` string in the deck is one of these three shapes. */
function paybackToMonths(text: string): number | null {
  const yearsMatch = text.match(/(\d+(?:\.\d+)?)\s*years?/i);
  const monthsMatch = text.match(/(\d+)\s*months?/i);
  if (!yearsMatch && !monthsMatch) return null;
  const years = yearsMatch ? parseFloat(yearsMatch[1]) : 0;
  const months = monthsMatch ? parseInt(monthsMatch[1], 10) : 0;
  return Math.round(years * 12 + months);
}

/** "Projected N-year revenue(s): $X ..." — matches before any trailing "...N-year profit(s)/
 *  EBITDA: $Y" clause in the same string, because "revenue" is what the pattern requires. */
function parseRevenueYearFirst(text: string): { usd: number; years: number } | null {
  const m = text.match(/(\d+)-year revenues?:?\s*(?:US\$|USD\$?|\$)\s?([\d,]+(?:\.\d+)?)\s*(million|billion)?/i);
  if (!m) return null;
  return { years: parseInt(m[1], 10), usd: moneyFromParts(m[2], m[3]) };
}

/** "$X ... over N years" (digit or spelled-out N) — the deck's other common revenue shape. */
function parseRevenueOverYears(text: string): { usd: number; years: number } | null {
  const m = text.match(/(?:US\$|USD\$?|\$)\s?([\d,]+(?:\.\d+)?)\s*(million|billion)?\s*over\s*([a-z]+|\d+)\s*years?/i);
  if (!m) return null;
  const token = m[3].toLowerCase();
  const years = WORD_NUMBERS[token] ?? parseInt(token, 10);
  if (Number.isNaN(years)) return null;
  return { usd: moneyFromParts(m[1], m[2]), years };
}

function parseProjectedRevenue(text: string): { usd: number | null; years: number | null } {
  return parseRevenueYearFirst(text) ?? parseRevenueOverYears(text) ?? { usd: firstMoneyUsd(text), years: null };
}

/** The dollar figure in whichever clause of `text` mentions `keyword` ("equity"/"debt") — e.g.
 *  "US$498,062.27 debt capital required; US$644,602.39 total project cost" -> debt clause is the
 *  first, so this returns the exact 498,062.27, not the *other* clause's total. Splitting on
 *  "and" too handles "US$50 million equity and US$145 million debt" pairing each figure with its
 *  own keyword rather than the first figure winning both. (Deliberately not routed through
 *  parseCapitalBreakdown, whose displayed amount is rounded to 2 decimals of *millions* — fine
 *  for a UI chip, not for an exact numeric column: it would turn 498,062.27 into 500,000.) */
function moneyNearKeyword(text: string, keyword: "equity" | "debt"): number | null {
  // Split on ";" and the word "and" only — never on a bare "," , which is also the thousands
  // separator inside a money figure itself (e.g. "US$498,062.27"), and splitting on it there
  // would sever the number from its own currency prefix.
  const clauses = text.split(/;|\band\b/i);
  const re = new RegExp(keyword, "i");
  for (const clause of clauses) {
    if (re.test(clause)) {
      const usd = firstMoneyUsd(clause);
      if (usd !== null) return usd;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Overrides — records where the source deck itself is contradictory (a dollar figure and a
// percentage split that imply two different totals) or presents a growth curve rather than a
// single projected figure. Listed explicitly by slug so each judgement is reviewable here rather
// than buried in a regex that would have to silently pick a side.
// ---------------------------------------------------------------------------

interface Override {
  capitalTotalUsd?: number | null;
  capitalEquityUsd?: number | null;
  capitalDebtUsd?: number | null;
  projectedRevenueUsd?: number | null;
  projectedRevenueYears?: number | null;
  financialDataCaveat?: string;
}

const OVERRIDES: Record<string, Override> = {
  // "US$58 million equity; 25% equity and 75% debt sought as stated in source deck" — the $58M
  // figure and the 25/75 split imply two different totals ($58M vs ~$232M). The deck states both;
  // resolving one against the other would be inventing a number the deck itself doesn't give.
  // Revenue is also a growth curve here, not a single figure — see below.
  "sirdc-integrated-foundry-manhize-industrial-park": {
    capitalTotalUsd: null,
    capitalEquityUsd: 58_000_000,
    capitalDebtUsd: null,
    projectedRevenueUsd: null,
    projectedRevenueYears: null,
    financialDataCaveat:
      "Source deck states US$58M as equity while separately citing a 25% equity / 75% debt structure — the two imply different totals (US$58M vs. approximately US$232M); total capital requires validation. Revenue is presented as a growth curve (approximately US$30M/yr in years 1-2 rising to a peak of US$130M in year 16 in the source deck), not a single projected figure.",
  },
  // "US$55 million (Equity) as stated in source deck; project seeking 70% debt and 30% equity
  // structure also stated and requires validation" — same shape of contradiction, and the deck
  // flags it as unresolved itself.
  "hwange-50mw-solar-power-plant-project": {
    capitalTotalUsd: null,
    capitalEquityUsd: 55_000_000,
    capitalDebtUsd: null,
    financialDataCaveat:
      "Source deck states US$55M as equity while separately citing a 70% debt / 30% equity structure that the deck itself flags as requiring validation; total capital requirement is unresolved.",
  },
  // "US$4 million in year 1 growing to US$7 million in year 3" — a growth curve, not a total.
  "fourways-livestock-production": {
    projectedRevenueUsd: null,
    projectedRevenueYears: null,
    financialDataCaveat:
      "Revenue is presented as a growth curve (US$4M in year 1 rising to US$7M in year 3 in the source deck), not a single projected figure.",
  },
};

// ---------------------------------------------------------------------------

interface Row {
  id: string;
  slug: string;
  sourceReference: string | null;
  recordStandard: "catalogue_seed" | "full_template" | null;
  capitalRequired: string | null;
  capitalTotalUsd: string | null;
  capitalEquityUsd: string | null;
  capitalDebtUsd: string | null;
  irr: string | null;
  irrPct: string | null;
  npv: string | null;
  npvUsd: string | null;
  roi: string | null;
  roiPct: string | null;
  paybackPeriod: string | null;
  paybackMonths: number | null;
  projectedRevenue: string | null;
  projectedRevenueUsd: string | null;
  projectedRevenueYears: number | null;
  financialDataCaveat: string | null;
}

async function main() {
  const rows = (await db
    .select({
      id: projects.id,
      slug: projects.slug,
      sourceReference: projects.sourceReference,
      recordStandard: projects.recordStandard,
      capitalRequired: projects.capitalRequired,
      capitalTotalUsd: projects.capitalTotalUsd,
      capitalEquityUsd: projects.capitalEquityUsd,
      capitalDebtUsd: projects.capitalDebtUsd,
      irr: projects.irr,
      irrPct: projects.irrPct,
      npv: projects.npv,
      npvUsd: projects.npvUsd,
      roi: projects.roi,
      roiPct: projects.roiPct,
      paybackPeriod: projects.paybackPeriod,
      paybackMonths: projects.paybackMonths,
      projectedRevenue: projects.projectedRevenue,
      projectedRevenueUsd: projects.projectedRevenueUsd,
      projectedRevenueYears: projects.projectedRevenueYears,
      financialDataCaveat: projects.financialDataCaveat,
    })
    .from(projects)) as Row[];

  let updated = 0;
  let unchanged = 0;
  const ambiguous: string[] = [];

  for (const row of rows) {
    const isCatalogue = isZidaCatalogueRecord({ sourceReference: row.sourceReference, recordStandard: row.recordStandard });
    const override = OVERRIDES[row.slug];

    const patch: Record<string, unknown> = {};

    // record_standard: every catalogue-seed row gets stamped explicitly, same rule
    // lib/governance/record-standard.ts already infers from sourceReference — this just makes it
    // a real column value instead of a fallback. Anything already stamped (e.g. full_template
    // rows created through the API since Phase 2 landed) is left alone.
    const targetStandard = isCatalogue ? "catalogue_seed" : "full_template";
    if (row.recordStandard !== targetStandard) patch.recordStandard = targetStandard;

    // Capital total / equity / debt
    if (override && ("capitalTotalUsd" in override || "capitalEquityUsd" in override || "capitalDebtUsd" in override)) {
      if (override.capitalTotalUsd !== undefined) patch.capitalTotalUsd = override.capitalTotalUsd;
      if (override.capitalEquityUsd !== undefined) patch.capitalEquityUsd = override.capitalEquityUsd;
      if (override.capitalDebtUsd !== undefined) patch.capitalDebtUsd = override.capitalDebtUsd;
    } else if (row.capitalRequired) {
      const totalMillions = parseCapitalTotalMillions(row.capitalRequired);
      if (totalMillions !== null) patch.capitalTotalUsd = Math.round(totalMillions * 1_000_000 * 100) / 100;
      const equity = moneyNearKeyword(row.capitalRequired, "equity");
      if (equity !== null) patch.capitalEquityUsd = equity;
      const debt = moneyNearKeyword(row.capitalRequired, "debt");
      if (debt !== null) patch.capitalDebtUsd = debt;
    }

    // IRR / ROI
    if (row.irr) {
      const pct = firstPercent(row.irr);
      if (pct !== null) patch.irrPct = pct;
      else ambiguous.push(`${row.slug}: irr "${row.irr}" did not parse`);
    }
    if (row.roi) {
      const pct = firstPercent(row.roi);
      if (pct !== null) patch.roiPct = pct;
      else ambiguous.push(`${row.slug}: roi "${row.roi}" did not parse`);
    }

    // NPV
    if (row.npv) {
      const usd = firstMoneyUsd(row.npv);
      if (usd !== null) patch.npvUsd = usd;
      else ambiguous.push(`${row.slug}: npv "${row.npv}" did not parse`);
    }

    // Payback period
    if (row.paybackPeriod) {
      const months = paybackToMonths(row.paybackPeriod);
      if (months !== null) patch.paybackMonths = months;
      else ambiguous.push(`${row.slug}: paybackPeriod "${row.paybackPeriod}" did not parse`);
    }

    // Projected revenue
    if (override && ("projectedRevenueUsd" in override || "projectedRevenueYears" in override)) {
      if (override.projectedRevenueUsd !== undefined) patch.projectedRevenueUsd = override.projectedRevenueUsd;
      if (override.projectedRevenueYears !== undefined) patch.projectedRevenueYears = override.projectedRevenueYears;
    } else if (row.projectedRevenue) {
      const { usd, years } = parseProjectedRevenue(row.projectedRevenue);
      if (usd !== null) patch.projectedRevenueUsd = usd;
      else ambiguous.push(`${row.slug}: projectedRevenue "${row.projectedRevenue}" did not parse`);
      if (years !== null) patch.projectedRevenueYears = years;
    }

    // Caveat (override only — nothing today has a caveat outside the three overridden records)
    if (override?.financialDataCaveat && row.financialDataCaveat !== override.financialDataCaveat) {
      patch.financialDataCaveat = override.financialDataCaveat;
    }

    // Drop no-op writes (value already matches what's stored) so a re-run is silent for rows
    // this script already touched.
    const CURRENT: Record<string, unknown> = {
      capitalTotalUsd: row.capitalTotalUsd === null ? null : parseFloat(row.capitalTotalUsd),
      capitalEquityUsd: row.capitalEquityUsd === null ? null : parseFloat(row.capitalEquityUsd),
      capitalDebtUsd: row.capitalDebtUsd === null ? null : parseFloat(row.capitalDebtUsd),
      irrPct: row.irrPct === null ? null : parseFloat(row.irrPct),
      npvUsd: row.npvUsd === null ? null : parseFloat(row.npvUsd),
      roiPct: row.roiPct === null ? null : parseFloat(row.roiPct),
      paybackMonths: row.paybackMonths,
      projectedRevenueUsd: row.projectedRevenueUsd === null ? null : parseFloat(row.projectedRevenueUsd),
      projectedRevenueYears: row.projectedRevenueYears,
      financialDataCaveat: row.financialDataCaveat,
      recordStandard: row.recordStandard,
    };
    for (const key of Object.keys(patch)) {
      if (CURRENT[key] === patch[key]) delete patch[key];
    }

    if (Object.keys(patch).length === 0) {
      unchanged += 1;
      continue;
    }

    updated += 1;
    console.log(`  ${COMMIT ? "+" : "~"} ${row.slug}`);
    for (const [key, value] of Object.entries(patch)) {
      console.log(`      ${key}: ${JSON.stringify(value)}`);
    }

    if (COMMIT) {
      await db.update(projects).set(patch).where(eq(projects.id, row.id));
    }
  }

  console.log(`\n${COMMIT ? "Updated" : "Would update"} ${updated} project(s); ${unchanged} already up to date.`);
  if (ambiguous.length > 0) {
    console.log(`\n${ambiguous.length} field(s) did not parse and were left untouched — review and add an override:`);
    for (const line of ambiguous) console.log(`  ! ${line}`);
  }
  if (!COMMIT) console.log("\nNothing was written. Re-run with --commit to apply.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
