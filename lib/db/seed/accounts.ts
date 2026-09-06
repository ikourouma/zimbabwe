import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { profiles } from "@/lib/db/schema";
import type { AccountRole } from "@/lib/auth/types";
import { seedDb } from "./db";

type PilotAccount = {
  email: string;
  role: AccountRole;
  name: string;
  // Team Ministry Traceability Batch, Phase 1 — optional per-account overrides so a pilot
  // government/ministry_admin persona can be seeded already tagged to a ministry (needed to
  // exercise the item-7 ministry-display fix and the item-8 multi-admin-per-ministry case).
  // `organization` uses `undefined` to mean "fall back to the role default" vs. explicit `null`
  // to mean "this role has no free-text org" (ministry_admin's affiliation is ministryId, not org).
  ministryId?: string;
  organization?: string | null;
};

export const PILOT_ACCOUNTS: PilotAccount[] = [
  { email: "registered+pilot@zidaproject.com", role: "registered", name: "Pilot Registered Investor" },
  { email: "qualified+pilot@zidaproject.com", role: "qualified", name: "Pilot Qualified Investor" },
  {
    email: "government+pilot@zidaproject.com",
    role: "government",
    name: "Pilot Government User",
    // Full-Persona Communication Parity plan — moved from "min-industry" to "min-finance" so this
    // pilot actually resolves to a real ministry_admin (both ministry_admin pilots are on
    // min-finance); "min-industry" had no ministry_admin at all, so the gov<->ministry_admin<->
    // admin escalation chain was untestable.
    ministryId: "min-finance",
  },
  { email: "admin+pilot@zidaproject.com", role: "admin", name: "Pilot ZIDA Admin" },
  { email: "superadmin+pilot@zidaproject.com", role: "super_admin", name: "Pilot Super Admin" },
  {
    email: "ministryadmin+pilot@zidaproject.com",
    role: "ministry_admin",
    name: "Pilot Ministry Admin — Finance",
    ministryId: "min-finance",
    organization: null,
  },
  {
    email: "ministryadmin2+pilot@zidaproject.com",
    role: "ministry_admin",
    name: "Pilot Ministry Admin — Finance (Backup)",
    ministryId: "min-finance",
    organization: null,
  },
];

function defaultOrganization(account: PilotAccount): string | null {
  if (account.organization !== undefined) return account.organization;
  if (account.role === "super_admin") return "Afronovation, Inc.";
  if (account.role === "ministry_admin") return null;
  return "ZIDA Pilot";
}

// One-line "what's this for" blurb per pilot email — shared by the generated
// docs/PILOT_TEST_ACCOUNTS.md table and the .env.local reference block, so the two never drift.
const PILOT_DESCRIPTIONS: Record<string, string> = {
  "registered+pilot@zidaproject.com": "Newly self-registered investor, pre-KYC",
  "qualified+pilot@zidaproject.com": 'Vetted investor, full Deal Room access, has "My Team"',
  "government+pilot@zidaproject.com": "Platform-wide reviewer; affiliated with Ministry of Finance",
  "admin+pilot@zidaproject.com": "ZIDA console admin",
  "superadmin+pilot@zidaproject.com": "Platform owner (Afronovation)",
  "ministryadmin+pilot@zidaproject.com": "Ministry of Finance desk — primary",
  "ministryadmin2+pilot@zidaproject.com": "Ministry of Finance desk — backup/secondary (multi-admin test)",
};

function generatePassword() {
  return randomBytes(12).toString("base64url");
}

export async function findAuthUserId(email: string): Promise<string | null> {
  const result = await seedDb.execute<{ id: string }>(
    sql`SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1`
  );
  const row = result.rows[0];
  return row?.id ?? null;
}

/** Sets a credential password directly, without going through the auth API — which matters for
 *  bulk seeds, since the sign-up endpoint is rate-limited and this is a plain DB write. */
export async function setAccountPassword(userId: string, password: string) {
  const hashed = await hashPassword(password);
  await seedDb.execute(
    sql`UPDATE neon_auth.account SET password = ${hashed}, "updatedAt" = now() WHERE "userId" = ${userId} AND "providerId" = 'credential'`
  );
}

/** Creates a Neon Auth user, or returns the existing one on a 409/422 rather than failing — which
 *  is what makes both this seed and the demo seed re-runnable. Exported for
 *  scripts/seed-demo-readiness.ts so there is one sign-up path, not two. */
export async function signUpViaAuthApi(
  email: string,
  password: string,
  name: string,
  options: { syncPassword?: boolean } = {},
) {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl) throw new Error("NEON_AUTH_BASE_URL is required to seed pilot accounts");

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const response = await fetch(`${baseUrl}/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({ email, password, name, callbackURL: `${origin}/` }),
  });

  if (response.ok) {
    const data = (await response.json()) as { user?: { id: string } };
    if (data.user?.id) return { userId: data.user.id, created: true };
  }

  if (response.status === 422 || response.status === 409) {
    const existingId = await findAuthUserId(email);
    if (existingId) {
      if (options.syncPassword) {
        await setAccountPassword(existingId, password);
      }
      return { userId: existingId, created: false };
    }
  }

  const text = await response.text();
  throw new Error(`Auth sign-up failed for ${email} (${response.status}): ${text}`);
}

async function upsertProfile(userId: string, account: PilotAccount) {
  const organization = defaultOrganization(account);
  const ministryId = account.ministryId ?? null;
  await seedDb
    .insert(profiles)
    .values({
      userId,
      role: account.role,
      accountStatus: "active",
      organization,
      ministryId,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        role: account.role,
        accountStatus: "active",
        organization,
        ministryId,
        updatedAt: sql`now()`,
      },
    });
}

export async function seedPilotAccounts() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl || baseUrl.includes("unset-neon-auth")) {
    console.warn("Skipping pilot account seed — NEON_AUTH_BASE_URL not configured.");
    return;
  }

  const fixedPassword = process.env.PILOT_ACCOUNT_PASSWORD;
  if (fixedPassword) {
    console.log("  Using PILOT_ACCOUNT_PASSWORD (fixed) for all pilot accounts");
  } else {
    console.log("  PILOT_ACCOUNT_PASSWORD unset — generating random passwords per account");
  }

  const credentials: { email: string; password: string; role: AccountRole }[] = [];

  for (const account of PILOT_ACCOUNTS) {
    const password = fixedPassword ?? generatePassword();
    const { userId, created } = await signUpViaAuthApi(account.email, password, account.name, {
      syncPassword: Boolean(fixedPassword),
    });
    await upsertProfile(userId, account);
    credentials.push({ email: account.email, password, role: account.role });
    const action = created ? "created" : fixedPassword ? "synced password" : "existing";
    console.log(`  pilot account: ${account.email} (${account.role}) — ${action}`);
  }

  const docsDir = path.join(process.cwd(), "docs");
  await mkdir(docsDir, { recursive: true });
  const docPath = path.join(docsDir, "PILOT_TEST_ACCOUNTS.md");
  const content = `# Pilot test accounts (local only — do not commit)

Generated: ${new Date().toISOString()}

Use these at \`/auth/sign-in\` during Milestone 1 QA. Email verification is disabled for the pilot.

| Role | Email | Password | What it's for |
| --- | --- | --- | --- |
${credentials
  .map((c) => `| ${c.role} | ${c.email} | \`${c.password}\` | ${PILOT_DESCRIPTIONS[c.email] ?? ""} |`)
  .join("\n")}

Rotate passwords before any external board walkthrough.
`;

  await writeFile(docPath, content, "utf8");
  console.log(`  wrote ${docPath}`);
}
