import { expect, test } from "@playwright/test";
import { PERSONAS, storageStatePath } from "./roles";

/**
 * Console entitlement, asserted the way a user experiences it.
 *
 * This is the gap the HTTP smoke suite documents but cannot close. /deal-room and /ministry are
 * wrapped in NdaGate by components/dashboard/dashboard-shell.tsx, which renders a placeholder while
 * the session loads, so the server response for a denied user contains neither console content nor
 * the access-denied notice. Over HTTP the strongest available claim is "no console markup was
 * served". The redirect itself happens after hydration and is only observable in a browser, which
 * is what these assertions do.
 *
 * A wrong-role user resting on a placeholder is a failure here, not a pass — the whole point is
 * that they end up somewhere they are entitled to be.
 */

for (const persona of PERSONAS) {
  test.describe(persona.label, () => {
    test.use({ storageState: storageStatePath(persona.key) });

    test(`reaches ${persona.landing} and it finishes loading`, async ({ page }) => {
      await page.goto(persona.landing);

      await expect(page).toHaveURL(new RegExp(`${persona.landing}/?$`));

      // A console that never leaves the placeholder is the documented symptom of a stale deploy,
      // so "no skeletons remain" is the assertion that the page actually resolved.
      await expect(page.locator(".dashboard-skeleton")).toHaveCount(0, { timeout: 30_000 });
    });

    for (const path of persona.forbidden) {
      test(`is turned away from ${path}`, async ({ page }) => {
        await page.goto(path);

        await expect(page).toHaveURL(new RegExp(`${persona.landing}/?$`), { timeout: 30_000 });
      });
    }
  });
}
