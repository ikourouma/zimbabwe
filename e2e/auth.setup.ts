import { mkdirSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { PERSONAS, PILOT_PASSWORD, storageStatePath } from "./roles";

/**
 * Signs in each pilot persona through the real form and saves the session, so no later spec pays
 * the sign-in cost or contributes to the auth rate limit.
 *
 * This deliberately asserts only that authentication succeeded — not where the user ended up.
 * Sign-in currently leaves the user on the public homepage rather than their console (see
 * landing.spec.ts), and setup must not fail on a product defect or every other spec is blocked
 * from running.
 *
 * The consent banner, announcement bar and demo popup are dismissed here on purpose. They are
 * stored client-side, so clearing them once bakes it into the saved session and keeps them out of
 * every screenshot the stakeholder guides embed.
 */

setup.describe.configure({ mode: "serial" });

setup.beforeAll(() => {
  if (!PILOT_PASSWORD) {
    throw new Error(
      "PILOT_ACCOUNT_PASSWORD is not set. Run this suite with `npm run e2e`, which supplies it " +
        "from .env.local; `npx playwright test` bypasses that and will always fail here."
    );
  }
  mkdirSync("e2e/.auth", { recursive: true });
});

/**
 * Best-effort: any of these may be absent depending on what the account has already dismissed, and
 * none of them is worth failing a session over. Order matters — the demo popup is a modal that sits
 * over the consent banner, so clicking the banner first is intercepted.
 */
async function dismissOverlays(page: import("@playwright/test").Page) {
  const overlays = [
    page.getByRole("dialog").getByRole("button", { name: "Dismiss" }).first(),
    page.getByRole("button", { name: "Accept" }),
    page.getByRole("button", { name: "Dismiss announcement" }),
  ];

  for (const overlay of overlays) {
    await overlay.click({ timeout: 3000 }).catch(() => {});
  }
}

for (const persona of PERSONAS) {
  setup(`authenticate ${persona.label}`, async ({ page }) => {
    await page.goto("/auth/sign-in");

    await page.fill("#email", persona.email);
    await page.fill("#password", PILOT_PASSWORD);
    await page.click('button[type="submit"]');

    // The account menu only renders for an authenticated session, so it is the signal that
    // sign-in worked regardless of which route the app decided to land on.
    await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible({
      timeout: 45_000,
    });

    await dismissOverlays(page);
    await page.context().storageState({ path: storageStatePath(persona.key) });

    // Neon Auth rate-limits sign-in and answers 429 under a burst; the smoke suite already has to
    // back off. Six consecutive sign-ins is exactly that burst, so space them out.
    await page.waitForTimeout(1500);
  });
}
