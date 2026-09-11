import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Runs Lighthouse mobile and desktop against the public marketing pages and writes JSON reports
 * plus a summary table to docs/audit/.
 *
 * Deliberately shells out to `npx lighthouse` rather than depending on the `lighthouse` package
 * directly: lighthouse's transitive dependency tree is large, and the production deploy builds
 * from package-lock.json, so adding it as a devDependency would churn the lockfile for a tool that
 * only ever runs locally. `npx` uses the npm cache and leaves the lockfile untouched; the CLI
 * launches and manages its own Chrome instance, so no chrome-launcher dependency is needed either.
 *
 * Baseline runs (no args) target production, so the numbers are directly comparable to the
 * Hostinger figures (desktop 97 / mobile 76) this audit was prompted by. Pass a different base URL
 * to measure a local `next build && next start` instead, so fix iteration does not require a
 * deploy in order to measure:
 *
 *   npx tsx scripts/audit-lighthouse.ts http://localhost:3000
 *
 * Run with `npm run audit:lighthouse`.
 */

const REPO_ROOT = resolve(__dirname, "..");
const OUTPUT_DIR = join(REPO_ROOT, "docs", "audit");
const BASE_URL = process.argv[2] ?? "https://zidaproject.com";

// A representative slice of PUBLIC_PAGES (e2e/page-inventory.ts), not all 15: Lighthouse is slow
// (~30-40s per run, two runs per page) and the homepage plus one data-heavy and one form-heavy page
// is enough to characterise the shared shell, which is where the score is actually being lost.
const PAGES: Array<{ slug: string; path: string }> = [
  { slug: "home", path: "/" },
  { slug: "projects", path: "/projects" },
  { slug: "strategic-partnerships", path: "/strategic-partnerships" },
];

interface LhrSummary {
  slug: string;
  formFactor: "mobile" | "desktop";
  performance: number;
  lcpMs: number;
  tbtMs: number;
  cls: number;
  accessibility: number;
}

function runLighthouse(url: string, formFactor: "mobile" | "desktop", outFile: string): LhrSummary {
  const presetArgs =
    formFactor === "mobile"
      ? [] // lighthouse's default throttling preset already models a mid-tier mobile device
      : ["--preset=desktop"];

  try {
    execFileSync(
      "npx",
      [
        "--yes",
        "lighthouse",
        url,
        `--output=json`,
        `--output-path=${outFile}`,
        `--only-categories=performance,accessibility`,
        "--chrome-flags=--headless=new",
        "--quiet",
        ...presetArgs,
      ],
      { stdio: "inherit", shell: true }
    );
  } catch (err) {
    // chrome-launcher's post-audit tmp-dir cleanup (Launcher.destroyTmp) can fail with EPERM in
    // some sandboxed environments even though the audit itself completed and the report was
    // already written — that cleanup runs after Lighthouse's own file write. Treat this as
    // non-fatal and fall through to reading the report; a report that is missing or genuinely
    // incomplete still fails below when the JSON can't be parsed or is missing categories.
    if (!existsSync(outFile)) throw err;
  }

  const lhr = JSON.parse(readFileSync(outFile, "utf8"));
  if (lhr.runtimeError) {
    console.warn(`  Lighthouse runtime error on ${url} (${formFactor}): ${lhr.runtimeError.code} — ${lhr.runtimeError.message}`);
  }
  return {
    slug: "", // filled by caller
    formFactor,
    performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
    lcpMs: Math.round(lhr.audits["largest-contentful-paint"]?.numericValue ?? 0),
    tbtMs: Math.round(lhr.audits["total-blocking-time"]?.numericValue ?? 0),
    cls: Number((lhr.audits["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3)),
    accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
  };
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Lighthouse target: ${BASE_URL}\n`);

  const rows: LhrSummary[] = [];

  for (const page of PAGES) {
    const url = `${BASE_URL}${page.path}`;
    for (const formFactor of ["mobile", "desktop"] as const) {
      const outFile = join(OUTPUT_DIR, `${page.slug}-${formFactor}.json`);
      console.log(`Running Lighthouse (${formFactor}) on ${url} ...`);
      const summary = runLighthouse(url, formFactor, outFile);
      summary.slug = page.slug;
      rows.push(summary);
      console.log(
        `  performance=${summary.performance} lcp=${summary.lcpMs}ms tbt=${summary.tbtMs}ms cls=${summary.cls} a11y=${summary.accessibility}\n`
      );
    }
  }

  const table = [
    "| Page | Form factor | Performance | LCP | TBT | CLS | Accessibility |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) =>
        `| ${r.slug} | ${r.formFactor} | ${r.performance} | ${r.lcpMs}ms | ${r.tbtMs}ms | ${r.cls} | ${r.accessibility} |`
    ),
  ].join("\n");

  const summaryPath = join(OUTPUT_DIR, "lighthouse-summary.md");
  const header = `# Lighthouse summary\n\nTarget: ${BASE_URL}\nCaptured: ${new Date().toISOString()}\n\n`;
  writeFileSync(summaryPath, header + table + "\n");

  console.log(`\nWrote ${summaryPath}`);
  console.log(table);
}

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
main();
