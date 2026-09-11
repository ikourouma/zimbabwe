import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PAGES_BY_PERSONA, PUBLIC_PAGES } from "./page-inventory";
import { PERSONAS, storageStatePath } from "./roles";

/**
 * Accessibility sweep with axe-core. Scoped to "serious" and "critical" impact only — "moderate"
 * and "minor" findings are real but would drown the report in low-priority noise for a first pass.
 *
 * Covers the 15 public pages plus one representative page per console (the overview/landing page),
 * rather than every inventoried page: axe runs are slow, and a console's chrome (topbar, sidebar,
 * dialogs) is shared across every page in that console, so most accessibility issues in the shell
 * itself will already show up once per persona.
 *
 * Explicitly out of scope per docs/UAT-Automation-Plan.md, which excludes an accessibility audit
 * from its three-layer plan — this fills that documented gap rather than duplicating anything.
 *
 * Run with `npm run audit:a11y`.
 */

const IMPACTS: Array<"serious" | "critical"> = ["serious", "critical"];

test.describe("audit-a11y public", () => {
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
      await page.goto(entry.path);
      await page.waitForTimeout(800);

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const relevant = results.violations.filter((v) => IMPACTS.includes(v.impact as "serious" | "critical"));

      if (relevant.length > 0) {
        const summary = relevant
          .map((v) => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
          .join("\n");
        console.log(`\n[audit-a11y] public/${entry.slug}:\n${summary}`);
      }

      expect(relevant, `${relevant.length} serious/critical a11y violation(s) on public/${entry.slug}`).toHaveLength(0);
    });
  }
});

for (const persona of PERSONAS) {
  const pages = PAGES_BY_PERSONA[persona.key];
  if (!pages) continue;
  const landing = pages[0]; // overview/landing page — shared console chrome, cheapest representative sample

  test.describe(`audit-a11y ${persona.label}`, () => {
    test.use({ storageState: storageStatePath(persona.key) });

    test(`${persona.label} — ${landing.title}`, async ({ page }) => {
      await page.goto(landing.path, { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForTimeout(800);

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const relevant = results.violations.filter((v) => IMPACTS.includes(v.impact as "serious" | "critical"));

      if (relevant.length > 0) {
        const summary = relevant
          .map((v) => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
          .join("\n");
        console.log(`\n[audit-a11y] ${persona.key}/${landing.slug}:\n${summary}`);
      }

      expect(relevant, `${relevant.length} serious/critical a11y violation(s) on ${persona.key}/${landing.slug}`).toHaveLength(0);
    });
  });
}
