/**
 * Shared persona definitions for the browser suite and the screenshot capture pass.
 *
 * `landing` is what lib/auth/post-login-destination.ts actually returns, which is not what the UAT
 * guide claimed for `registered` — the Investor Dashboard is tiered rather than qualified-only, so
 * every non-staff role lands on /deal-room.
 *
 * `forbidden` is derived from consolesForRole() in lib/auth/console-access.ts, and is wider than
 * the smoke suite's list: that one never checked whether admin or super_admin are kept out of the
 * Ministry Desk, and admin is.
 */

export const PILOT_PASSWORD = process.env.PILOT_ACCOUNT_PASSWORD ?? "";

export interface PilotPersona {
  /** Stable slug used for storage-state filenames and screenshot directories. */
  key: string;
  email: string;
  role: string;
  /** Persona name as it appears in the stakeholder walkthrough guides. */
  label: string;
  landing: string;
  forbidden: string[];
}

export const PERSONAS: PilotPersona[] = [
  {
    key: "registered",
    email: "registered+pilot@zidaproject.com",
    role: "registered",
    label: "Registered Investor",
    landing: "/deal-room",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    key: "qualified",
    email: "qualified+pilot@zidaproject.com",
    role: "qualified",
    label: "Qualified Investor",
    landing: "/deal-room",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    key: "government",
    email: "government+pilot@zidaproject.com",
    role: "government",
    label: "Government Reviewer",
    landing: "/deal-room",
    forbidden: ["/admin", "/super-admin", "/ministry"],
  },
  {
    key: "ministry",
    email: "ministryadmin+pilot@zidaproject.com",
    role: "ministry_admin",
    label: "Ministry Official",
    landing: "/ministry",
    forbidden: ["/admin", "/super-admin", "/deal-room"],
  },
  {
    key: "admin",
    email: "admin+pilot@zidaproject.com",
    role: "admin",
    label: "ZIDA Admin",
    landing: "/admin",
    forbidden: ["/super-admin", "/ministry"],
  },
  {
    key: "superadmin",
    email: "superadmin+pilot@zidaproject.com",
    role: "super_admin",
    label: "Platform Admin",
    landing: "/super-admin",
    forbidden: ["/ministry"],
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
