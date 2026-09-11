import { expect, test } from "@playwright/test";
import { PAGES_BY_PERSONA, PUBLIC_PAGES } from "./page-inventory";
import { PERSONAS, storageStatePath } from "./roles";

/**
 * Mobile-viewport layout sweep. Runs only on the "mobile" Playwright project (Pixel 5, 393x851) —
 * see playwright.config.ts, where this file's testMatch/testIgnore pairing keeps it off the
 * chromium project entirely, so it can never collide with the 1440x900 screenshots the stakeholder
 * guides were built from.
 *
 * Two checks per page:
 *  1. Horizontal overflow — the page itself must not be wider than the viewport. This is the
 *     single most visible mobile defect a stakeholder could hit (a horizontal scrollbar on a page
 *     that was never designed to have one).
 *  2. Tap targets — interactive elements under the ~44px guideline. Reported, not failed on: several
 *     known-small targets (pagination chevrons, table checkboxes) already carry aria-labels and are
 *     usable, just cramped, so a hard failure here would just be noise on every run.
 *
 * Run with `npm run audit:mobile`.
 */

const TAP_TARGET_MIN_PX = 44;

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  expect(
    overflow.scrollWidth,
    `${label}: page scrollWidth (${overflow.scrollWidth}px) exceeds viewport clientWidth (${overflow.clientWidth}px) — horizontal overflow`
  ).toBeLessThanOrEqual(overflow.clientWidth + 1); // +1 tolerates sub-pixel rounding
}

async function reportSmallTapTargets(page: import("@playwright/test").Page, label: string) {
  const small = await page.evaluate((minPx) => {
    const selector = 'a, button, input[type="checkbox"], input[type="radio"], [role="button"], [role="tab"]';
    const results: string[] = [];
    document.querySelectorAll(selector).forEach((el) => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return; // not rendered / hidden
      if (rect.width < minPx || rect.height < minPx) {
        const name =
          el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          el.textContent?.trim().slice(0, 30) ||
          el.tagName.toLowerCase();
        results.push(`${name} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
      }
    });
    return results;
  }, TAP_TARGET_MIN_PX);

  if (small.length > 0) {
    console.log(`[tap-target] ${label}: ${small.length} element(s) under ${TAP_TARGET_MIN_PX}px — ${small.slice(0, 10).join(", ")}${small.length > 10 ? ", …" : ""}`);
  }
}

test.describe("audit-layout public", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    // Same pre-seed as screenshots.spec.ts: dismiss the consent banner and marketing popup before
    // any page script runs, so this sweep measures the page itself rather than an overlay.
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
      const registryAnswered = page
        .waitForResponse((r) => r.url().includes("/api/projects") && r.ok(), { timeout: 20_000 })
        .catch(() => null);

      await page.goto(entry.path);
      await registryAnswered;
      await page.waitForTimeout(800);

      await assertNoHorizontalOverflow(page, `public/${entry.slug}`);
      await reportSmallTapTargets(page, `public/${entry.slug}`);
    });
  }
});

for (const persona of PERSONAS) {
  const pages = PAGES_BY_PERSONA[persona.key];
  if (!pages) continue;

  test.describe(`audit-layout ${persona.label}`, () => {
    test.use({ storageState: storageStatePath(persona.key) });

    for (const entry of pages) {
      test(`${persona.label} — ${entry.title}`, async ({ page }) => {
        await page.goto(entry.path);
        await expect(page.locator(".dashboard-skeleton")).toHaveCount(0, { timeout: 30_000 });
        await page.waitForTimeout(800);

        await assertNoHorizontalOverflow(page, `${persona.key}/${entry.slug}`);
        await reportSmallTapTargets(page, `${persona.key}/${entry.slug}`);
      });
    }
  });
}
