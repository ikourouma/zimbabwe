/**
 * Shared persona definitions for the browser suite and the screenshot capture pass.
 *
 * These are the `+demo` accounts, not the `+pilot` ones. The guides tell stakeholders to sign in
 * as these addresses, so the screenshots in those guides have to come from the same accounts —
 * otherwise a reader follows the instructions and lands on a page that does not match the picture
 * above it. The `+pilot` set stays untouched for anything that needs a cohort no stakeholder is
 * simultaneously clicking around in.
 *
 * `landing` is what lib/auth/post-login-destination.ts actually returns, which is not what the UAT
 * guide claimed for `registered` — the Investor Dashboard is tiered rather than qualified-only, so
 * every non-staff role lands on /deal-room.
 *
 * `forbidden` is derived from consolesForRole() in lib/auth/console-access.ts, and is wider than
 * the smoke suite's list: that one never checked whether admin or super_admin are kept out of the
 * Ministry Desk, and admin is.
 */

export const PERSONA_PASSWORD =
  process.env.DEMO_ACCOUNT_PASSWORD ?? process.env.PILOT_ACCOUNT_PASSWORD ?? "";

export interface PilotPersona {
  /** Stable slug used for storage-state filenames and screenshot directories. */
  key: string;
  email: string;
  role: string;
  /** Persona name as it appears in the stakeholder walkthrough guides. */
  label: string;
  landing: string;
  forbidden: string[];
  /** Ministry this account is bound to, where that scoping is the point of the test. */
  ministryId?: string;
}

export const PERSONAS: PilotPersona[] = [
  {
    key: "registered",
    email: "registered+demo@zidaproject.com",
    role: "registered",
    label: "Registered Investor",
    landing: "/deal-room",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    key: "qualified",
    email: "qualified+demo@zidaproject.com",
    role: "qualified",
    label: "Qualified Investor",
    landing: "/deal-room",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    // ZIDA's own desk reviewer, carrying no ministry — the account that demonstrates national
    // scope. The ministry-affiliated reviewers are min-*.team+demo.
    key: "government",
    email: "zida.team+demo@zidaproject.com",
    role: "government",
    label: "Government Reviewer",
    landing: "/deal-room",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    key: "ministry",
    email: "min-ict.admin+demo@zidaproject.com",
    role: "ministry_admin",
    label: "Ministry Official",
    landing: "/ministry",
    forbidden: ["/admin", "/super-admin", "/deal-room"],
    ministryId: "min-ict",
  },
  {
    key: "admin",
    email: "zida.admin+demo@zidaproject.com",
    role: "admin",
    label: "ZIDA Admin",
    landing: "/admin",
    forbidden: ["/super-admin", "/ministry"],
  },
  {
    key: "superadmin",
    email: "super.admin+demo@zidaproject.com",
    role: "super_admin",
    label: "Platform Admin",
    landing: "/super-admin",
    forbidden: ["/ministry"],
  },
  {
    // Second ministry, present so cross-ministry isolation can be asserted rather than assumed.
    // Carries no page inventory, so the screenshot pass skips it.
    key: "ministry-agriculture",
    email: "min-agriculture.admin+demo@zidaproject.com",
    role: "ministry_admin",
    label: "Ministry Official (Agriculture)",
    landing: "/ministry",
    forbidden: ["/admin", "/super-admin", "/deal-room"],
    ministryId: "min-agriculture",
  },
];

export function personaByKey(key: string): PilotPersona {
  const found = PERSONAS.find((p) => p.key === key);
  if (!found) throw new Error(`Unknown persona: ${key}`);
  return found;
}

export function storageStatePath(key: string): string {
  return `e2e/.auth/${key}.json`;
}

/**
 * Hostinger's CDN caches statically prerendered pages with `s-maxage=31536000` and does not purge
 * them on deploy, so /auth/sign-in can serve HTML referencing a previous build's JS chunks for a
 * long time after a release — observed 2026-09-05, where a run 33 minutes after deploy still loaded
 * the old chunk with `x-hcdn-cache-status: HIT`.
 *
 * Default is no cache-buster, because the point of running against production is to exercise what
 * real users are served. Set E2E_BYPASS_CDN=1 to test the code that is actually deployed instead,
 * which is how you tell "the fix is wrong" apart from "the edge has not caught up yet".
 */
export function signInPath(): string {
  return process.env.E2E_BYPASS_CDN ? `/auth/sign-in?cb=${Date.now()}` : "/auth/sign-in";
}
