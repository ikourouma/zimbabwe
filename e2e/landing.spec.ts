import { expect, test } from "@playwright/test";
import { PERSONAS, PERSONA_PASSWORD, signInPath } from "./roles";

/**
 * Where each role comes to rest after signing in.
 *
 * This is invisible to the HTTP smoke suite: it signs in with fetch and reads cookies, so it never
 * observes what the browser does with the response. The redirect is decided client-side in
 * app/auth/sign-in/page.tsx, which makes it a browser assertion or no assertion at all.
 *
 * Regression guard: sign-in passed `callbackURL: "/"`, which navigated the browser to the public
 * homepage and destroyed the React context before the role-aware router.push() could run. Every
 * role stayed authenticated but landed on the marketing site instead of their console.
 */

// Must not inherit a saved session — this spec is about what signing in does.
test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  if (!PERSONA_PASSWORD) throw new Error("DEMO_ACCOUNT_PASSWORD is not set. Use `npm run e2e`.");
});

for (const persona of PERSONAS) {
  test(`${persona.label} lands on ${persona.landing}`, async ({ page }) => {
    await page.goto(signInPath());

    await page.fill("#email", persona.email);
    await page.fill("#password", PERSONA_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page).toHaveURL(new RegExp(`${persona.landing}/?$`), { timeout: 20_000 });

    await page.waitForTimeout(1500);
  });
}
