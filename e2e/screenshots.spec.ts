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

  // Not every pending panel renders a skeleton. Reports, the team roster, the vault and the
  // sessions list each say "Loading …" in plain text instead, which the skeleton check above
  // sails straight past — the Ministry Reports and My Profile images both shipped showing it.
  await expect(page.getByText(/^Loading .*…$/)).toHaveCount(0, { timeout: 30_000 });

  // Charts and count-up figures animate on mount; capturing mid-animation produces images that
  // disagree with each other across runs and look like defects to a reader.
  await page.waitForTimeout(1200);

  await page.screenshot({ path: `${OUTPUT_ROOT}/${dir}/${entry.slug}.png` });
}

test.describe("@capture public", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * Marks the consent banner and marketing popup as already seen, before any page script runs.
   *
   * Dismissing them by clicking, which is what this did previously, is a race the capture loses
   * often enough to matter: the consent banner is on a 1.5s timer and the popup waits on a fetch,
   * so both can arrive after the clicks have already given up. Several images in the Public
   * Visitor guide shipped with the modal covering the page it was meant to show. Pre-seeding the
   * keys the components themselves check means there is nothing to race — they never mount.
   */
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
      // The marketing pages render their headline counts from a dataset compiled into the client
      // so they appear instantly, then re-render once the registry answers. That is the right
      // trade-off for a public page, but it means a capture can photograph either number: the
      // National Profile, Opportunity and Platform pages shipped advertising 32, 37 and 37
      // catalogue projects respectively, all three crediting the same ZIDA deck. Waiting on the
      // response makes the capture deterministic without slowing the page down for real visitors.
      const registryAnswered = page
        .waitForResponse((r) => r.url().includes("/api/projects") && r.ok(), { timeout: 20_000 })
        .catch(() => null);

      await page.goto(entry.path);
      await registryAnswered;

      // The announcement bar remembers dismissal per announcement id, which is not known here, so
      // it stays a click. It is a slim bar rather than an overlay, so losing this race costs
      // layout shift rather than a covered page.
      await page
        .getByRole("button", { name: "Dismiss announcement" })
        .click({ timeout: 2500 })
        .catch(() => {});

      // Nothing should be left, but assert it rather than trust it — this is the check that would
      // have caught the covered screenshots at capture time instead of at document review.
      await expect(page.getByRole("dialog")).toHaveCount(0);

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
