/**
 * Six-role smoke test — run with:
 *   npx tsx --env-file=.env.local scripts/smoke-all-roles.ts
 *   npx tsx --env-file=.env.local scripts/smoke-all-roles.ts https://www.zidaproject.com
 */
const targetBase = process.argv[2]?.replace(/\/$/, "") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const authBase = process.env.NEON_AUTH_BASE_URL;
const password = process.env.PILOT_ACCOUNT_PASSWORD;

const ACCOUNTS = [
  {
    email: "registered+pilot@zidaproject.com",
    role: "registered",
    home: "/projects",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    email: "qualified+pilot@zidaproject.com",
    role: "qualified",
    home: "/deal-room",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    email: "government+pilot@zidaproject.com",
    role: "government",
    home: "/deal-room",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    email: "ministryadmin+pilot@zidaproject.com",
    role: "ministry_admin",
    home: "/ministry",
    forbidden: ["/admin", "/super-admin"],
  },
  {
    email: "admin+pilot@zidaproject.com",
    role: "admin",
    home: "/admin",
    forbidden: ["/super-admin"],
  },
  {
    email: "superadmin+pilot@zidaproject.com",
    role: "super_admin",
    home: "/super-admin",
    forbidden: [],
  },
] as const;

let pass = 0;
let fail = 0;

function report(ok: boolean, label: string, detail?: string) {
  if (ok) {
    pass++;
    console.log(`PASS ${label}`);
  } else {
    fail++;
    console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function signIn(email: string, attempt = 1): Promise<string> {
  const response = await fetch(`${authBase}/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: targetBase },
    body: JSON.stringify({ email, password, callbackURL: `${targetBase}/` }),
  });
  if (response.status === 429 && attempt < 4) {
    await sleep(1500 * attempt);
    return signIn(email, attempt + 1);
  }
  if (!response.ok) throw new Error(`sign-in ${response.status}`);
  const setCookie = response.headers.getSetCookie?.() ?? [];
  return setCookie.map((c) => c.split(";")[0]).join("; ");
}

async function fetchMe(cookies: string) {
  const res = await fetch(`${targetBase}/api/me`, { headers: { cookie: cookies }, cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<Record<string, unknown>>;
}

async function fetchPath(cookies: string, path: string) {
  return fetch(`${targetBase}${path}`, { headers: { cookie: cookies }, redirect: "manual" });
}

async function main() {
  if (!authBase || !password) {
    console.error("NEON_AUTH_BASE_URL and PILOT_ACCOUNT_PASSWORD are required.");
    process.exit(1);
  }

  console.log(`Smoke test against ${targetBase}\n`);

  for (const account of ACCOUNTS) {
    let cookies = "";
    try {
      cookies = await signIn(account.email);
      report(true, `${account.email} sign-in`);
    } catch (error) {
      report(false, `${account.email} sign-in`, String(error));
      continue;
    }

    await sleep(500);

    const me = await fetchMe(cookies);
    report(Boolean(me?.authenticated), `${account.email} /api/me authenticated`);
    report(me?.role === account.role, `${account.email} role=${String(me?.role)}`);

    if (account.role === "registered") {
      const projectsRes = await fetch(`${targetBase}/api/projects`, { headers: { cookie: cookies } });
      if (projectsRes.ok) {
        const projects = (await projectsRes.json()) as Array<Record<string, unknown>>;
        const sample = projects[0];
        const leaked = sample && (sample.irr || sample.npv || sample.roi);
        report(!leaked, `${account.email} registered financial fields hidden`);
      } else {
        report(false, `${account.email} projects API`, String(projectsRes.status));
      }
    }

    if (account.role === "qualified") {
      const projectsRes = await fetch(`${targetBase}/api/projects`, { headers: { cookie: cookies } });
      if (projectsRes.ok) {
        const projects = (await projectsRes.json()) as Array<Record<string, unknown>>;
        const sample = projects.find((p) => p.irr || p.npv || p.roi);
        report(Boolean(sample), `${account.email} qualified receives financial fields`);
      } else {
        report(false, `${account.email} projects API`, String(projectsRes.status));
      }
    }

    const homeRes = await fetchPath(cookies, account.home);
    report(homeRes.status === 200 || homeRes.status === 307 || homeRes.status === 308, `${account.email} home ${account.home}`);

    for (const path of account.forbidden) {
      const res = await fetchPath(cookies, path);
      report(res.status === 403 || res.status === 307 || res.status === 308 || res.status === 404, `${account.email} denied ${path}`, String(res.status));
    }

    await fetch(`${authBase}/sign-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: targetBase, cookie: cookies },
    });
  }

  console.log(`\nTotal: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
