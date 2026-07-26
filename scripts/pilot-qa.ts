/**
 * Milestone 3 auth QA — run with: npx tsx --env-file=.env.local scripts/pilot-qa.ts
 */
const baseUrl = process.env.NEON_AUTH_BASE_URL;
const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const password = process.env.PILOT_ACCOUNT_PASSWORD;

const PILOT_ACCOUNTS = [
  { email: "registered+pilot@zidaproject.com", role: "registered", expectedPath: "/projects" },
  { email: "qualified+pilot@zidaproject.com", role: "qualified", expectedPath: "/deal-room" },
  { email: "government+pilot@zidaproject.com", role: "government", expectedPath: "/deal-room" },
  { email: "admin+pilot@zidaproject.com", role: "admin", expectedPath: "/admin" },
  { email: "superadmin+pilot@zidaproject.com", role: "super_admin", expectedPath: "/super-admin" },
] as const;

async function signIn(email: string): Promise<{ ok: boolean; cookies: string }> {
  if (!baseUrl || !password) {
    console.error("NEON_AUTH_BASE_URL and PILOT_ACCOUNT_PASSWORD required");
    return { ok: false, cookies: "" };
  }

  const response = await fetch(`${baseUrl}/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: siteOrigin },
    body: JSON.stringify({ email, password, callbackURL: `${siteOrigin}/` }),
  });

  const setCookie = response.headers.getSetCookie?.() ?? [];
  const cookies = setCookie.map((c) => c.split(";")[0]).join("; ");

  if (!response.ok) {
    console.error(`  FAIL sign-in ${email}: ${response.status} ${await response.text()}`);
    return { ok: false, cookies: "" };
  }

  console.log(`  OK sign-in ${email}`);
  return { ok: true, cookies };
}

async function fetchMe(cookies: string) {
  const res = await fetch(`${siteOrigin}/api/me`, {
    headers: { cookie: cookies },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    authenticated: boolean;
    isSuperAdmin?: boolean;
    isAdmin?: boolean;
    isQualified?: boolean;
  }>;
}

function resolveDestination(me: Awaited<ReturnType<typeof fetchMe>>): string {
  if (me?.isSuperAdmin) return "/super-admin";
  if (me?.isAdmin) return "/admin";
  if (me?.isQualified) return "/deal-room";
  return "/projects?welcome=1";
}

async function main() {
  console.log("Milestone 3 pilot auth QA…");
  if (!password) {
    console.error("FAIL: PILOT_ACCOUNT_PASSWORD not set");
    process.exit(1);
  }

  let passed = true;
  for (const account of PILOT_ACCOUNTS) {
    const { ok, cookies } = await signIn(account.email);
    if (!ok) {
      passed = false;
      continue;
    }

    let me = null;
    for (let i = 0; i < 4; i++) {
      me = await fetchMe(cookies);
      if (me?.authenticated) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    if (!me?.authenticated) {
      console.error(`  FAIL /api/me not authenticated for ${account.email}`);
      passed = false;
      continue;
    }

    const dest = resolveDestination(me);
    const destPath = dest.split("?")[0];
    if (destPath !== account.expectedPath) {
      console.error(`  FAIL ${account.email}: expected ${account.expectedPath}, got ${dest}`);
      passed = false;
    } else {
      console.log(`    → ${account.role} → ${dest}`);
    }

    await fetch(`${baseUrl}/sign-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: siteOrigin, cookie: cookies },
    });
  }

  console.log("\nLocale detection: fr-* browser tags map to fr; default en");
  console.log("Manual UI checks: password toggle, account menu, auth overlay, welcome panel");

  if (!passed) process.exit(1);
  console.log("\nAll automated pilot QA checks passed.");
}

main();
