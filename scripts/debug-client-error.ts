import { chromium } from "@playwright/test";

/**
 * Loads a production page in a real browser and prints whatever the client throws.
 *
 * "Application error: a client-side exception has occurred" is all Next.js shows a user in
 * production, and the stack is only in the browser console — so reproducing it in a headless browser
 * is the only way to see the actual error without asking someone to open devtools on the live site.
 */

const target = process.argv[2] ?? "https://zidaproject.com/auth/sign-in";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      console.log(`[console.${message.type()}] ${message.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    console.log(`\n[pageerror] ${error.name}: ${error.message}`);
    if (error.stack) console.log(error.stack);
  });

  page.on("requestfailed", (request) => {
    console.log(`[requestfailed] ${request.url()} — ${request.failure()?.errorText}`);
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      console.log(`[http ${response.status()}] ${response.url()}`);
    }
  });

  console.log(`Loading ${target}\n`);
  await page.goto(target, { waitUntil: "networkidle" }).catch((error) => {
    console.log(`navigation: ${error.message}`);
  });

  await page.waitForTimeout(4000);

  const body = await page.locator("body").innerText().catch(() => "");
  console.log(`\n--- rendered text ---\n${body.slice(0, 600)}`);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
