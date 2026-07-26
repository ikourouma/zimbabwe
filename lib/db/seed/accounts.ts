import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { profiles } from "@/lib/db/schema";
import type { AccountRole } from "@/lib/auth/types";
import { seedDb } from "./db";

const PILOT_ACCOUNTS: { email: string; role: AccountRole; name: string }[] = [
  { email: "registered+pilot@zidaproject.com", role: "registered", name: "Pilot Registered Investor" },
  { email: "qualified+pilot@zidaproject.com", role: "qualified", name: "Pilot Qualified Investor" },
  { email: "government+pilot@zidaproject.com", role: "government", name: "Pilot Government User" },
  { email: "admin+pilot@zidaproject.com", role: "admin", name: "Pilot ZIDA Admin" },
  { email: "superadmin+pilot@zidaproject.com", role: "super_admin", name: "Pilot Super Admin" },
];

function generatePassword() {
  return randomBytes(12).toString("base64url");
}

async function findAuthUserId(email: string): Promise<string | null> {
  const result = await seedDb.execute<{ id: string }>(
    sql`SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1`
  );
  const row = result.rows[0];
  return row?.id ?? null;
}

async function updatePilotPassword(userId: string, password: string) {
  const hashed = await hashPassword(password);
  await seedDb.execute(
    sql`UPDATE neon_auth.account SET password = ${hashed}, "updatedAt" = now() WHERE "userId" = ${userId} AND "providerId" = 'credential'`
  );
}

async function signUpViaAuthApi(
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
        await updatePilotPassword(existingId, password);
      }
      return { userId: existingId, created: false };
    }
  }

  const text = await response.text();
  throw new Error(`Auth sign-up failed for ${email} (${response.status}): ${text}`);
}

async function upsertProfile(userId: string, role: AccountRole) {
  await seedDb
    .insert(profiles)
    .values({
      userId,
      role,
      accountStatus: "active",
      organization: role === "super_admin" ? "Afronovation, Inc." : "ZIDA Pilot",
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        role,
        accountStatus: "active",
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
    await upsertProfile(userId, account.role);
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

| Role | Email | Password |
| --- | --- | --- |
${credentials.map((c) => `| ${c.role} | ${c.email} | \`${c.password}\` |`).join("\n")}

Rotate passwords before any external board walkthrough.
`;

  await writeFile(docPath, content, "utf8");
  console.log(`  wrote ${docPath}`);
}
