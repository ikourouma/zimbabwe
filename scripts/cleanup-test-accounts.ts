/**
 * Remove smoke-test and ad-hoc personal accounts (NOT pilot accounts).
 *
 * Dry run (default):
 *   npx tsx --env-file=.env.local scripts/cleanup-test-accounts.ts
 *
 * Execute deletion:
 *   npx tsx --env-file=.env.local scripts/cleanup-test-accounts.ts --confirm
 *
 * Clear profile rows whose auth user is already gone (residue from earlier runs):
 *   npx tsx --env-file=.env.local scripts/cleanup-test-accounts.ts --prune-orphans [--confirm]
 */
import { sql } from "drizzle-orm";
import { seedDb } from "../lib/db/seed/db";
import { PILOT_ACCOUNTS } from "../lib/db/seed/accounts";
import { DEMO_ACCOUNTS, DEMO_APPLICANTS } from "../lib/db/seed/demo-accounts";

const confirm = process.argv.includes("--confirm");

/**
 * Derived from the canonical rosters rather than retyped. This list was previously maintained by
 * hand and had silently fallen a name behind — `ministryadmin2+pilot` was missing entirely, so the
 * backup ministry admin was deletable (DEF-004). Deriving it means an account is protected the
 * moment it is added to a roster, with no second place to remember.
 */
const PROTECTED_ACCOUNTS = new Set(
  [
    ...PILOT_ACCOUNTS.map((a) => a.email),
    ...DEMO_ACCOUNTS.map((a) => a.email),
    ...DEMO_APPLICANTS.map((a) => a.account.email),
  ].map((email) => email.toLowerCase()),
);

/** Email substrings that mark disposable test accounts */
const TEST_PATTERNS = [
  "+smoke@",
  "+test@",
  "smoke-test@",
  "test-user@",
  "e2e+",
  "playwright+",
  "cypress+",
];

function isTestAccount(email: string): boolean {
  const lower = email.toLowerCase();
  if (PROTECTED_ACCOUNTS.has(lower)) return false;
  return TEST_PATTERNS.some((pattern) => lower.includes(pattern));
}

/** Profiles left behind by earlier runs of this script, before it learned to delete both rows.
 *  Harmless to the app but they inflate role counts, so they are worth clearing once. */
async function pruneOrphanedProfiles() {
  const orphans = await seedDb.execute<{ user_id: string; role: string; created_at: string }>(
    sql`SELECT p.user_id, p.role::text AS role, p.created_at
        FROM profiles p
        WHERE NOT EXISTS (SELECT 1 FROM neon_auth."user" u WHERE u.id::text = p.user_id)`
  );

  if (orphans.rows.length === 0) {
    console.log("No orphaned profile rows.");
    return;
  }

  console.log(`${confirm ? "DELETING" : "DRY RUN — would delete"} ${orphans.rows.length} orphaned profile row(s):`);
  for (const row of orphans.rows) {
    console.log(`  - ${row.user_id} (${row.role}, created ${row.created_at})`);
  }
  if (!confirm) return;

  for (const row of orphans.rows) {
    await seedDb.execute(sql`DELETE FROM profiles WHERE user_id = ${row.user_id}`);
  }
  console.log(`Removed ${orphans.rows.length} orphaned profile row(s).`);
}

async function main() {
  if (process.argv.includes("--prune-orphans")) {
    await pruneOrphanedProfiles();
    return;
  }

  const rows = await seedDb.execute<{ email: string; id: string }>(
    sql`SELECT id, email FROM neon_auth."user" ORDER BY email`
  );

  const candidates = rows.rows.filter((row) => isTestAccount(row.email));

  if (candidates.length === 0) {
    console.log("No test accounts matched. Nothing to do.");
    return;
  }

  console.log(`${confirm ? "DELETING" : "DRY RUN — would delete"} ${candidates.length} account(s):`);
  for (const row of candidates) {
    console.log(`  - ${row.email} (${row.id})`);
  }

  if (!confirm) {
    console.log("\nRe-run with --confirm to delete.");
    return;
  }

  for (const row of candidates) {
    // Delete the profile first. `profiles.userId` is a soft link, not a foreign key — neon_auth is
    // a separate service-managed schema — so removing only the auth user leaves an orphaned
    // profile row that still appears in role counts and directory queries (DEF-004).
    await seedDb.execute(sql`DELETE FROM profiles WHERE user_id = ${row.id}`);
    await seedDb.execute(sql`DELETE FROM neon_auth."user" WHERE id = ${row.id}`);
    console.log(`Deleted ${row.email} (auth user and profile)`);
  }

  console.log(`Done. Removed ${candidates.length} account(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
