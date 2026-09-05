import { expect, test, type Page } from "@playwright/test";
import { storageStatePath } from "./roles";

/**
 * Captures the workflow forms and decision dialogs the walkthrough guides describe step by step.
 *
 * These run against production, so the governing rule is that nothing here may create or change a
 * record. Three things follow from that, and they are the reason this file looks more cautious than
 * the page capture pass:
 *
 * 1. Forms are reached by direct navigation and left empty. The project wizard autosaves a real
 *    draft project about 1.5 seconds after its step-one required fields are filled, so filling them
 *    in to reach step two would leave a project behind on every run.
 * 2. Dialogs are closed with Escape, never by clicking. A `Cancel` and an `Approve` sit side by side
 *    in the decision modal; a selector that drifts by one would approve a real qualified-investor
 *    application. Escape cannot resolve to a button at all.
 * 3. Captures that need a record in a particular state skip when none exists, rather than creating
 *    one. A missing screenshot is a build warning; a fabricated approval is a production incident.
 *
 * Everything write-heavy that genuinely needs exercising belongs in the API workflow suite against
 * disposable accounts, not here.
 */

const OUTPUT_DIR = "docs/screenshots/workflows";

async function settle(page: Page) {
  await expect(page.locator(".dashboard-skeleton")).toHaveCount(0, { timeout: 30_000 });
  await page.waitForTimeout(1200);
}

async function shoot(page: Page, slug: string) {
  await page.screenshot({ path: `${OUTPUT_DIR}/${slug}.png` });
}

test.describe("@capture workflows — ZIDA Admin", () => {
  test.use({ storageState: storageStatePath("admin") });

  test("project creation wizard", async ({ page }) => {
    await page.goto("/admin/projects/new");
    await settle(page);

    // Left empty on purpose: the wizard persists a draft once step one validates.
    await expect(page.getByText("Basics & Identity")).toBeVisible();
    await shoot(page, "project-wizard-step-1");
  });

  test("review queue with reviewer actions", async ({ page }) => {
    await page.goto("/admin/review");
    await settle(page);

    await shoot(page, "review-queue");
  });

  test("qualified investor applications queue", async ({ page }) => {
    await page.goto("/admin/inquiries?category=investor");
    await settle(page);

    await shoot(page, "inquiries-investor-queue");
  });

  test("application detail and approval dialog", async ({ page }) => {
    await page.goto("/admin/inquiries?category=investor");
    await settle(page);

    const approve = page.getByRole("button", { name: "Approve as Qualified Investor" });

    // The decision controls only render for a pending or changes-requested application. Opening the
    // first row is the only way to find out, and there may be none pending on the day this runs.
    const rows = page.locator("[data-inquiry-row], table tbody tr").first();
    if ((await rows.count()) === 0) {
      test.skip(true, "No investor applications present to open.");
    }

    await rows.click();
    await page.waitForTimeout(1500);
    await shoot(page, "application-detail-drawer");

    if ((await approve.count()) === 0) {
      test.skip(true, "No application in a decidable state; the decision dialog cannot be reached.");
    }

    await approve.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(800);
    await shoot(page, "application-approval-dialog");

    // Escape, not Cancel. Cancel and Approve are adjacent in this dialog's footer.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("@capture workflows — Ministry Official", () => {
  test.use({ storageState: storageStatePath("ministry") });

  test("ministry project creation wizard", async ({ page }) => {
    await page.goto("/ministry/projects/new");
    await settle(page);

    await shoot(page, "ministry-project-wizard");
  });

  test("ministry review queue", async ({ page }) => {
    await page.goto("/ministry/review");
    await settle(page);

    await shoot(page, "ministry-review-queue");
  });
});

test.describe("@capture workflows — Qualified Investor", () => {
  test.use({ storageState: storageStatePath("qualified") });

  test("engagement wizard", async ({ page }) => {
    await page.goto("/deal-room/engagements");
    await settle(page);

    const open = page.getByRole("button", { name: "New Engagement" });
    if ((await open.count()) === 0) {
      test.skip(true, "New Engagement control not available on this account.");
    }

    await open.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(1000);
    await shoot(page, "engagement-wizard-step-1");

    // Step one is safe to photograph but not to advance: step four writes the engagement.
    await page.keyboard.press("Escape");
  });

  test("memorandum panel", async ({ page }) => {
    await page.goto("/deal-room/mou");
    await settle(page);

    await shoot(page, "mou-registry");

    const row = page.locator("table tbody tr, [data-mou-row]").first();
    if ((await row.count()) === 0) {
      test.skip(true, "No memorandum present to open.");
    }

    await row.click();
    await page.waitForTimeout(1500);
    await shoot(page, "mou-panel");
  });
});

test.describe("@capture workflows — public", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("qualification application wizard", async ({ page }) => {
    await page.goto("/strategic-partnerships");

    for (const overlay of [
      page.getByRole("dialog").getByRole("button", { name: "Dismiss" }).first(),
      page.getByRole("button", { name: "Accept" }),
      page.getByRole("button", { name: "Dismiss announcement" }),
    ]) {
      await overlay.click({ timeout: 2500 }).catch(() => {});
    }

    await page.waitForTimeout(1500);
    await shoot(page, "qualification-wizard-step-1");
  });
});
