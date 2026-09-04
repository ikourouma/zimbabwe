import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Six-role smoke test — run with:
 *   npx tsx --env-file=.env.local scripts/smoke-all-roles.ts
 *   npx tsx --env-file=.env.local scripts/smoke-all-roles.ts https://www.zidaproject.com
 */
const targetBase = process.argv[2]?.replace(/\/$/, "") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const authBase = process.env.NEON_AUTH_BASE_URL;
const password = process.env.PILOT_ACCOUNT_PASSWORD;

/** Rendered by components/dashboard/console-redirect.tsx when a console layout denies access. */
const BOUNCE_MARKER = "do not have access to this console";

// components/dashboard/dashboard-shell.tsx wraps /deal-room and /ministry (and only those) in
// <NdaGate>, which renders a skeleton while useAuth() is loading — always true during SSR. Their
// server HTML therefore contains neither the page nor the access-denied bounce, whichever the
// layout chose; both only appear after hydration. What is still provable over HTTP is the part
// that matters: no console content is served to a role that should not see it. The redirect
// itself is client-side on these two routes and is covered by the browser walkthrough.
const NDA_GATED_CONSOLES = new Set(["/deal-room", "/ministry"]);
const SKELETON_MARKER = "dashboard-skeleton";

/** Console label shown in the shell topbar, present even while NdaGate holds back the content. */
const CONSOLE_CHROME_MARKERS: Record<string, string> = {
  "/ministry": "Ministry Desk",
  "/deal-room": "Investor Dashboard",
};

// Body copy unique to each console's overview page. Headings are not usable here: "Ministry Desk"
// and "Analytics" are also console/nav labels in components/dashboard/dashboard-nav-config.ts, so
// they appear in shared dashboard chrome and made a correctly-denied page look like a leak.
const CONSOLE_MARKERS: Record<string, string> = {
  "/ministry": "national investment pipeline scoped to your designated ministry",
  "/admin": "Institutional command center",
  "/super-admin": "Afronovation super admin view",
  "/deal-room": "Your investor dashboard",
};

const ACCOUNTS = [
  {
    email: "registered+pilot@zidaproject.com",
    role: "registered",
    home: "/projects",
    homeMarker: "Investment Project Registry",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    email: "qualified+pilot@zidaproject.com",
    role: "qualified",
    home: "/deal-room",
    homeMarker: "Your investor dashboard",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    email: "government+pilot@zidaproject.com",
    role: "government",
    home: "/deal-room",
    homeMarker: "Your investor dashboard",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    email: "ministryadmin+pilot@zidaproject.com",
    role: "ministry_admin",
    home: "/ministry",
    homeMarker: "national investment pipeline scoped to your designated ministry",
    forbidden: ["/admin", "/super-admin"],
  },
  {
    email: "admin+pilot@zidaproject.com",
    role: "admin",
    home: "/admin",
    homeMarker: "Institutional command center",
    forbidden: ["/super-admin"],
  },
  {
    email: "superadmin+pilot@zidaproject.com",
    role: "super_admin",
    home: "/super-admin",
    homeMarker: "Afronovation super admin view",
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
  const separator = path.includes("?") ? "&" : "?";
  const url = `${targetBase}${path}${separator}_cb=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return fetch(url, {
    headers: {
      cookie: cookies,
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    redirect: "manual",
  });
}

// Vary is not assertable: LiteSpeed's compression overwrites it with Accept-Encoding, so the
// Vary: Cookie set in next.config.ts never reaches the client. Cache-Control does survive, and
// no-store is the directive that actually keeps a shared cache from reusing one user's console.
function hasNoStore(res: Response): boolean {
  const cacheControl = res.headers.get("cache-control") ?? "";
  return cacheControl.toLowerCase().includes("no-store");
}

/** Set SMOKE_DUMP=1 to write each failing body to .smoke-dump/ for inspection. */
function dump(label: string, body: string) {
  if (!process.env.SMOKE_DUMP) return;
  const dir = ".smoke-dump";
  mkdirSync(dir, { recursive: true });
  const safe = label.replace(/[^a-z0-9]+/gi, "-");
  writeFileSync(`${dir}/${safe}.html`, body, "utf8");
}

/** Names which known page shapes a body contains, so a failure says what was served. */
function fingerprint(body: string): string {
  const probes: Record<string, string> = {
    bounce: BOUNCE_MARKER,
    accessGate: "Sign in required",
    ministryPage: "national investment pipeline scoped to your designated ministry",
    ministryChrome: "Ministry Desk",
    adminPage: "Institutional command center",
    superAdminPage: "Afronovation super admin view",
    dealRoomPage: "Your investor dashboard",
    dealRoomQualified: "A private workspace for approved investors",
  };
  const present = Object.entries(probes)
    .filter(([, needle]) => body.includes(needle))
    .map(([name]) => name);
  return present.length ? present.join("+") : "none-of-the-known-shapes";
}

async function checkForbiddenPath(email: string, cookies: string, path: string) {
  const res = await fetchPath(cookies, path);
  const status = res.status;
  const marker = CONSOLE_MARKERS[path];

  report(hasNoStore(res), `${email} no-store ${path}`, res.headers.get("cache-control") ?? "missing");

  // A denied console answers 200 with the ConsoleRedirect bounce rather than a 307: the guard
  // runs in an async layout, and Next downgrades a redirect() thrown after the shell has flushed
  // into an RSC-stream redirect on a 200. What must hold is that no console markup is served.
  if (status === 200) {
    const body = await res.text();
    dump(`denied-${email}-${path}`, body);
    if (marker && body.includes(marker)) {
      report(false, `${email} denied ${path}`, `200 and body contains ${marker}`);
    } else if (NDA_GATED_CONSOLES.has(path)) {
      report(body.includes(SKELETON_MARKER), `${email} denied ${path}`, `200, no console content, body=${fingerprint(body)}`);
    } else {
      report(body.includes(BOUNCE_MARKER), `${email} denied ${path}`, `200, body=${fingerprint(body)}`);
    }
    return;
  }

  report(
    status === 403 || status === 307 || status === 308 || status === 404,
    `${email} denied ${path}`,
    String(status)
  );
}

async function checkHomePath(email: string, cookies: string, home: string, homeMarker: string) {
  const res = await fetchPath(cookies, home);
  const status = res.status;

  if (status === 307 || status === 308) {
    const location = res.headers.get("location") ?? "";
    report(false, `${email} home ${home}`, `redirected to ${location} (expected to stay)`);
    return;
  }

  if (status !== 200) {
    report(false, `${email} home ${home}`, String(status));
    return;
  }

  const body = await res.text();
  dump(`home-${email}-${home}`, body);
  if (body.includes(BOUNCE_MARKER)) {
    report(false, `${email} home ${home}`, "own console served the access-denied bounce");
    return;
  }

  // NdaGate holds this console's content back until hydration, so assert the shell rendered for
  // the right console rather than page copy that SSR never emits.
  if (NDA_GATED_CONSOLES.has(home)) {
    const chrome = CONSOLE_CHROME_MARKERS[home];
    const ok = body.includes(chrome) && body.includes(SKELETON_MARKER);
    report(ok, `${email} home ${home} (client-gated shell)`, ok ? undefined : `200, body=${fingerprint(body)}`);
    return;
  }

  report(body.includes(homeMarker), `${email} home ${home}`, body.includes(homeMarker) ? undefined : `200, body=${fingerprint(body)}`);
}

async function main() {
  if (!authBase || !password) {
    console.error("NEON_AUTH_BASE_URL and PILOT_ACCOUNT_PASSWORD are required.");
    process.exit(1);
  }

  console.log(`Smoke test against ${targetBase}\n`);

  const versionRes = await fetch(`${targetBase}/api/version`, { cache: "no-store" });
  if (versionRes.ok) {
    const version = (await versionRes.json()) as { commit?: string; builtAt?: string };
    console.log(`Build: ${version.commit ?? "unknown"} built ${version.builtAt ?? "unknown"}\n`);
    report(true, "build version endpoint");
  } else {
    console.log("Build: unknown (endpoint unavailable)\n");
    report(false, "build version endpoint", "/api/version missing — deploy is stale");
  }

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

    await checkHomePath(account.email, cookies, account.home, account.homeMarker);

    for (const path of account.forbidden) {
      await checkForbiddenPath(account.email, cookies, path);
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
