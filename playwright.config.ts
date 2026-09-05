import { defineConfig, devices } from "@playwright/test";

// Credentials come from `tsx --env-file=.env.local`, the same way db:migrate and smoke get theirs.
// Run this suite via `npm run e2e` rather than `npx playwright test`, or PILOT_ACCOUNT_PASSWORD
// will be missing.

/** Apex is canonical; www permanently redirects to it (see the redirects() block in next.config.ts). */
export const BASE_URL = process.env.E2E_BASE_URL ?? "https://zidaproject.com";

// Announce the target. E2E_BASE_URL is an exported shell variable that outlives the command that
// set it, so a run meant for production can silently go to localhost against saved production
// sessions — which fails every test in a way that looks like a platform-wide outage.
console.log(`\nPlaywright target: ${BASE_URL}\n`);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results",

  // Production is a shared environment and Neon Auth rate-limits sign-in (the smoke suite already
  // has to back off on 429), so these never run in parallel regardless of available cores.
  workers: 1,
  fullyParallel: false,

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Fixed viewport: these runs also produce the screenshots embedded in the stakeholder
    // walkthrough guides, which look wrong if the window size drifts between captures.
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      dependencies: ["setup"],
    },
  ],
});
