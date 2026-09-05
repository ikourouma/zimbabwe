import { expect, test } from "@playwright/test";
import { PAGES_BY_PERSONA, PUBLIC_PAGES, type PageEntry } from "./page-inventory";
import { PERSONAS, storageStatePath } from "./roles";

/**
 * Captures the screenshots embedded in the persona walkthrough guides.
 *
 * Run with `npm run screenshots`. Separated from the assertion specs by its @capture tag so a
 * normal verification run does not spend minutes writing images, and so regenerating the guides
 * after a UI change is one command rather than seven documents reopened by hand.
 *
 * Each capture is also a smoke assertion: the page must reach the expected URL and clear its
 * loading placeholders. A persona bounced off a page they should reach fails here rather than
 * producing a screenshot of somebody else's console.
 */

const OUTPUT_ROOT = "docs/screenshots";

/** Viewport-sized rather than full-page: it shows what a reader sees on arrival, and keeps images
 *  a shape that embeds sensibly in a Word document. */
async function capture(page: import("@playwright/test").Page, dir: string, entry: PageEntry) {
  await page.goto(entry.path);

  await expect(page).toHaveURL(new RegExp(`${entry.path.replace(/\//g, "\\/")}\\/?$`), {
    timeout: 30_000,
  });
  await expect(page.locator(".dashboard-skeleton")).toHaveCount(0, { timeout: 30_000 });

  // Charts and count-up figures animate on mount; capturing mid-animation produces images that
  // disagree with each other across runs and look like defects to a reader.
  await page.waitForTimeout(1200);

  await page.screenshot({ path: `${OUTPUT_ROOT}/${dir}/${entry.slug}.png` });
}

test.describe("@capture public", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const entry of PUBLIC_PAGES) {
    test(`public — ${entry.title}`, async ({ page }) => {
      await page.goto(entry.path);

      // Signed out, so the consent banner and demo popup have nothing to remember them by and
      // reappear on every page. They must go before the shot, not after.
      for (const overlay of [
        page.getByRole("dialog").getByRole("button", { name: "Dismiss" }).first(),
        page.getByRole("button", { name: "Accept" }),
        page.getByRole("button", { name: "Dismiss announcement" }),
      ]) {
        await overlay.click({ timeout: 2500 }).catch(() => {});
      }

      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${OUTPUT_ROOT}/public/${entry.slug}.png` });
    });
  }
});

for (const persona of PERSONAS) {
  const pages = PAGES_BY_PERSONA[persona.key];
  if (!pages) continue;

  test.describe(`@capture ${persona.label}`, () => {
    test.use({ storageState: storageStatePath(persona.key) });

    for (const entry of pages) {
      test(`${persona.label} — ${entry.title}`, async ({ page }) => {
        await capture(page, persona.key, entry);
      });
    }
  });
}
