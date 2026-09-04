/**
 * Remove smoke-test and ad-hoc personal accounts (NOT pilot accounts).
 *
 * Dry run (default):
 *   npx tsx --env-file=.env.local scripts/cleanup-test-accounts.ts
 *
 * Execute deletion:
 *   npx tsx --env-file=.env.local scripts/cleanup-test-accounts.ts --confirm
 */
import { sql } from "drizzle-orm";
import { seedDb } from "../lib/db/seed/db";

const confirm = process.argv.includes("--confirm");

/** Pilot accounts used for UAT — never delete */
const PILOT_ALLOWLIST = new Set([
  "registered+pilot@zidaproject.com",
  "qualified+pilot@zidaproject.com",
  "government+pilot@zidaproject.com",
  "ministryadmin+pilot@zidaproject.com",
  "admin+pilot@zidaproject.com",
  "superadmin+pilot@zidaproject.com",
]);

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
  if (PILOT_ALLOWLIST.has(lower)) return false;
  return TEST_PATTERNS.some((pattern) => lower.includes(pattern));
}

async function main() {
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
    await seedDb.execute(sql`DELETE FROM neon_auth."user" WHERE id = ${row.id}`);
    console.log(`Deleted ${row.email}`);
  }

  console.log(`Done. Removed ${candidates.length} account(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
