/**
 * Confirms every account in the stakeholder demo roster can actually sign in with
 * DEMO_ACCOUNT_PASSWORD, by calling the Better Auth `/sign-in/email` endpoint directly — the same
 * request the sign-in page makes, not a database read. A profile can look perfectly healthy and
 * still fail to authenticate if its credential row has drifted, so this is the only check that
 * proves the roster is walkthrough-ready rather than merely well-seeded.
 *
 * Paced the same way scripts/seed-demo-readiness.ts paces sign-ups: Neon Auth rate-limits rapid
 * calls from one caller, and 23 sign-in attempts back to back is exactly the shape of request that
 * trips it — which would make this script report the very failure mode it exists to rule out.
 *
 *   npx tsx --env-file=.env.local scripts/verify-demo-logins.ts [targetUrl]
 *
 * Defaults to https://zidaproject.com. Exits non-zero if any account fails to sign in.
 */
import { DEMO_ACCOUNTS, DEMO_APPLICANTS, demoPassword } from "../lib/db/seed/demo-accounts";

const targetBase = process.argv[2]?.replace(/\/$/, "") ?? "https://zidaproject.com";
const authBase = process.env.NEON_AUTH_BASE_URL;

const SIGNIN_SPACING_MS = 1_200;
const BACKOFF_MS = [15_000, 30_000, 60_000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Result = { email: string; role: string; ok: boolean; detail: string };

async function attemptSignIn(email: string, password: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${authBase}/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: targetBase },
    body: JSON.stringify({ email, password, callbackURL: `${targetBase}/` }),
  });
  const body = res.ok ? "" : await res.text().catch(() => "");
  return { status: res.status, body };
}

async function signInWithBackoff(email: string, password: string): Promise<{ ok: boolean; detail: string }> {
  for (let attempt = 0; ; attempt += 1) {
    const { status, body } = await attemptSignIn(email, password);
    if (status >= 200 && status < 300) return { ok: true, detail: `${status}` };

    const rateLimited = status === 429;
    if (!rateLimited || attempt >= BACKOFF_MS.length) {
      return { ok: false, detail: `${status}${body ? ` ${body.slice(0, 200)}` : ""}` };
    }
    const wait = BACKOFF_MS[attempt];
    console.log(`    rate limited — waiting ${wait / 1000}s before retrying ${email}`);
    await sleep(wait);
  }
}

async function main() {
  if (!authBase) throw new Error("NEON_AUTH_BASE_URL is required");
  const password = demoPassword();
  console.log(`Target: ${targetBase}`);
  console.log(`Checking sign-in for ${DEMO_ACCOUNTS.length + DEMO_APPLICANTS.length} accounts...\n`);

  const accounts = [
    ...DEMO_ACCOUNTS.map((a) => ({ email: a.email, role: a.role })),
    ...DEMO_APPLICANTS.map((a) => ({ email: a.account.email, role: a.account.role })),
  ];

  const results: Result[] = [];
  for (const account of accounts) {
    const { ok, detail } = await signInWithBackoff(account.email, password);
    results.push({ email: account.email, role: account.role, ok, detail });
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${account.email} (${account.role})${ok ? "" : ` — ${detail}`}`);
    await sleep(SIGNIN_SPACING_MS);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} accounts signed in successfully.`);
  if (failed.length > 0) {
    console.log(`\nFailed:`);
    for (const f of failed) console.log(`  - ${f.email}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
