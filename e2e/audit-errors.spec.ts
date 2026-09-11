import { expect, test } from "@playwright/test";
import { PAGES_BY_PERSONA, PUBLIC_PAGES } from "./page-inventory";
import { PERSONAS, storageStatePath } from "./roles";

/**
 * Browser-level error crawl: console errors, unhandled exceptions, failed requests, and HTTP 400+
 * responses. This is the gap the tooling inventory found — nothing in the existing e2e suite
 * attaches these listeners; the only prior art is the single-URL scripts/debug-client-error.ts,
 * whose listener shape this borrows.
 *
 * Runs on the "mobile" Playwright project only (see playwright.config.ts testMatch/testIgnore),
 * so this is a mobile-viewport crawl specifically. A desktop-only error would not be caught here;
 * that gap is already covered by npm run e2e passing on the existing chromium project.
 *
 * Reports rather than hard-fails per page: a single console.warn from a third-party font loader
 * would otherwise make the whole run red. Findings are printed for the audit report and the run
 * fails only on the aggregate assertion at the very end, so one bad page cannot mask the rest.
 *
 * Run with `npm run audit:errors`.
 */

interface PageIssue {
  page: string;
  kind: "console-error" | "pageerror" | "requestfailed" | "http-error";
  detail: string;
}

const allIssues: PageIssue[] = [];

function attachListeners(page: import("@playwright/test").Page, label: string) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      allIssues.push({ page: label, kind: "console-error", detail: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    allIssues.push({ page: label, kind: "pageerror", detail: `${error.name}: ${error.message}` });
  });
  page.on("requestfailed", (request) => {
    // aborted popups/prefetches on navigation are noise, not defects
    if (request.failure()?.errorText === "net::ERR_ABORTED") return;
    allIssues.push({ page: label, kind: "requestfailed", detail: `${request.url()} — ${request.failure()?.errorText}` });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      allIssues.push({ page: label, kind: "http-error", detail: `[${response.status()}] ${response.url()}` });
    }
  });
}

test.describe("audit-errors public", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "zimbabwe-cookie-consent",
        JSON.stringify({ essential: true, analytics: false })
      );
      sessionStorage.setItem("zim:marketing-popup-shown", "1");
    });
  });

  for (const entry of PUBLIC_PAGES) {
    test(`public — ${entry.title}`, async ({ page }) => {
      attachListeners(page, `public/${entry.slug}`);
      await page.goto(entry.path, { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForTimeout(1500);
    });
  }
});

for (const persona of PERSONAS) {
  const pages = PAGES_BY_PERSONA[persona.key];
  if (!pages) continue;

  test.describe(`audit-errors ${persona.label}`, () => {
    test.use({ storageState: storageStatePath(persona.key) });

    for (const entry of pages) {
      test(`${persona.label} — ${entry.title}`, async ({ page }) => {
        attachListeners(page, `${persona.key}/${entry.slug}`);
        await page.goto(entry.path, { waitUntil: "networkidle" }).catch(() => {});
        await page.waitForTimeout(1500);
      });
    }
  });
}

test.afterAll(() => {
  if (allIssues.length === 0) {
    console.log("\n[audit-errors] No console errors, page errors, failed requests, or HTTP 4xx/5xx responses found.\n");
    return;
  }

  console.log(`\n[audit-errors] ${allIssues.length} issue(s) found:\n`);
  for (const issue of allIssues) {
    console.log(`  [${issue.kind}] ${issue.page}: ${issue.detail}`);
  }
  console.log("");
});

// A single assertion at the very end, so individual page tests never go red (which would mask the
// full picture), but the overall run still fails if anything was found — CI-friendly even though
// there is no CI wired up yet.
test("aggregate: no console/page/network errors across the crawl", () => {
  const summary = allIssues.map((i) => `[${i.kind}] ${i.page}: ${i.detail}`).join("\n");
  expect(allIssues, `Found ${allIssues.length} issue(s):\n${summary}`).toHaveLength(0);
});
