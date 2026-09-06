/**
 * Removes developer test residue from the demonstration database, and brings denormalized copies
 * of the pilot account names back in line with the roster.
 *
 * Four of the seven walkthrough reviews independently flagged the same thing: the consoles that
 * carry the platform's strongest arguments were exhibiting test data. The Communication Hub thread
 * used to demonstrate the amendment workflow contained "p8 selftest other ministry". The MOU
 * Registry's only executed memorandum belonged to "MOU Smoke Investor". The pipeline carried
 * "Smoke Ministry Project 1785559386915" and a draft named "EmbassyOS". None of it is a platform
 * fault, and all of it is the first thing a stakeholder reads.
 *
 * Two kinds of work happen here, and they are deliberately different in kind:
 *
 *   Deletion, for records that only ever existed to prove a code path worked. Smoke messages,
 *   smoke engagements and smoke projects carry no history worth keeping and cascade cleanly.
 *
 *   Renaming, for the pilot accounts. Those are woven through months of audit history, and the
 *   audit log resolves the actor name by join, so renaming the account relabels every entry
 *   without touching a single actor id, action or timestamp. `project_messages.author_name` and
 *   `investor_engagements.investor_name` hold denormalized copies that the join does not reach,
 *   so they are updated to match rather than left to contradict the account they came from.
 *
 * Nothing here invents activity. Every row that survives records something that actually happened.
 *
 *   npx tsx --env-file=.env.local scripts/purge-test-residue.ts            # report only
 *   npx tsx --env-file=.env.local scripts/purge-test-residue.ts --commit   # apply
 */
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { investorEngagements, projectMessages, projects } from "@/lib/db/schema";
import { PILOT_ACCOUNTS, defaultOrganization as defaultOrganizationFor, findAuthUserId } from "../lib/db/seed/accounts";
import { seedDb, seedPool } from "../lib/db/seed/db";

const COMMIT = process.argv.includes("--commit");

type Change = { step: string; detail: string; action: "deleted" | "renamed" | "skipped" };
const changes: Change[] = [];

function record(step: string, detail: string, action: Change["action"]) {
  const mark = action === "skipped" ? "·" : COMMIT ? "+" : "~";
  console.log(`  ${mark} ${step}: ${detail}${action === "skipped" ? " (nothing to do)" : ""}`);
  changes.push({ step, detail, action });
}

/** Titles and bodies that only a test harness writes. Deliberately anchored to harness vocabulary
 *  ("smoke", "selftest", "phase8") rather than to anything a person might legitimately name a
 *  project — "test" alone would match "Testing Laboratory Expansion". */
const HARNESS_PATTERN = "(smoke|selftest|self test|qa residual|phase[0-9]+ )";

// -----------------------------------------------------------------------------------------------
// 1. Projects that were never projects
// -----------------------------------------------------------------------------------------------

async function purgeProjects() {
  console.log("\n[1/4] Harness projects");

  const doomed = await seedDb
    .select({ id: projects.id, title: projects.title, status: projects.projectStatus })
    .from(projects)
    .where(sql`${projects.title} ~* ${HARNESS_PATTERN} OR ${projects.title} = 'EmbassyOS'`);

  if (doomed.length === 0) {
    record("project", "no harness projects present", "skipped");
    return;
  }

  for (const p of doomed) record("project", `${p.title} (${p.status})`, "deleted");
  if (!COMMIT) return;

  await seedDb.delete(projects).where(
    inArray(
      projects.id,
      doomed.map((p) => p.id)
    )
  );
}

// -----------------------------------------------------------------------------------------------
// 2. Engagements raised by a test harness
// -----------------------------------------------------------------------------------------------

async function purgeEngagements() {
  console.log("\n[2/4] Harness engagements");

  const doomed = await seedDb
    .select({ id: investorEngagements.id, investorName: investorEngagements.investorName })
    .from(investorEngagements)
    .where(sql`${investorEngagements.investorName} ~* '(smoke|draft-lock|selftest)'`);

  if (doomed.length === 0) {
    record("engagement", "no harness engagements present", "skipped");
  } else {
    for (const e of doomed) record("engagement", e.investorName, "deleted");
    if (COMMIT) {
      await seedDb.delete(investorEngagements).where(
        inArray(
          investorEngagements.id,
          doomed.map((e) => e.id)
        )
      );
    }
  }

  // A duplicate approach by the same investor to the same project is a double-submit from testing,
  // not two separate propositions. Keep the earliest and drop the rest.
  const dupes = await seedDb.execute<{ id: string; investor_name: string; title: string }>(
    sql`SELECT e.id::text AS id, e.investor_name, p.title
        FROM investor_engagements e
        JOIN projects p ON p.id = e.project_id
        WHERE e.id::text NOT IN (
          SELECT DISTINCT ON (user_id, project_id) id::text
          FROM investor_engagements
          ORDER BY user_id, project_id, created_at ASC
        )`
  );

  const dupeRows = dupes.rows ?? [];
  if (dupeRows.length === 0) {
    record("engagement", "no duplicate approaches", "skipped");
    return;
  }
  for (const d of dupeRows) record("engagement", `duplicate: ${d.investor_name} → ${d.title}`, "deleted");
  if (!COMMIT) return;

  await seedDb.delete(investorEngagements).where(
    inArray(
      investorEngagements.id,
      dupeRows.map((d) => d.id)
    )
  );
}

// -----------------------------------------------------------------------------------------------
// 3. Messages a harness wrote
// -----------------------------------------------------------------------------------------------

async function purgeMessages() {
  console.log("\n[3/4] Harness messages");

  const doomed = await seedDb
    .select({ id: projectMessages.id, body: projectMessages.body })
    .from(projectMessages)
    .where(
      or(
        sql`${projectMessages.body} ~* ${HARNESS_PATTERN}`,
        sql`lower(trim(${projectMessages.body})) IN ('test', 'testing', 'hello', 'asdf')`
      )
    );

  if (doomed.length === 0) {
    record("message", "no harness messages present", "skipped");
    return;
  }

  for (const m of doomed) record("message", `"${m.body.slice(0, 60)}"`, "deleted");
  if (!COMMIT) return;

  await seedDb.delete(projectMessages).where(
    inArray(
      projectMessages.id,
      doomed.map((m) => m.id)
    )
  );
}

// -----------------------------------------------------------------------------------------------
// 4. Denormalized copies of the pilot names
// -----------------------------------------------------------------------------------------------

async function realignPilotNames() {
  console.log("\n[4/4] Pilot account names");

  for (const account of PILOT_ACCOUNTS) {
    const userId = await findAuthUserId(account.email);
    if (!userId) {
      record("name", `${account.email} — no such account`, "skipped");
      continue;
    }

    const [current] = (
      await seedDb.execute<{ name: string | null }>(
        sql`SELECT name FROM neon_auth."user" WHERE id = ${userId}`
      )
    ).rows;

    const authStale = current?.name !== account.name;

    const [messageCount] = (
      await seedDb.execute<{ n: string }>(
        sql`SELECT count(*)::text AS n FROM project_messages
            WHERE author_user_id = ${userId} AND author_name <> ${account.name}`
      )
    ).rows;
    const [engagementCount] = (
      await seedDb.execute<{ n: string }>(
        sql`SELECT count(*)::text AS n FROM investor_engagements
            WHERE user_id = ${userId} AND investor_name <> ${account.name}`
      )
    ).rows;

    const stale = Number(messageCount?.n ?? 0) + Number(engagementCount?.n ?? 0);

    if (!authStale && stale === 0) {
      record("name", `${account.name} — already consistent`, "skipped");
      continue;
    }

    record(
      "name",
      `${current?.name ?? "?"} → ${account.name} (${stale} denormalized row${stale === 1 ? "" : "s"})`,
      "renamed"
    );
    if (!COMMIT) continue;

    await seedDb.execute(
      sql`UPDATE neon_auth."user" SET name = ${account.name}, "updatedAt" = now() WHERE id = ${userId}`
    );
    await seedDb
      .update(projectMessages)
      .set({ authorName: account.name })
      .where(eq(projectMessages.authorUserId, userId));
    await seedDb
      .update(investorEngagements)
      .set({ investorName: account.name })
      .where(eq(investorEngagements.userId, userId));
  }

  // The organisation on the profile is its own copy again, and it read "ZIDA Pilot" for every role
  // that had no explicit override — which put the word Pilot into the user directory's organisation
  // column and onto the project owner line of anything these accounts created.
  for (const account of PILOT_ACCOUNTS) {
    const userId = await findAuthUserId(account.email);
    if (!userId) continue;

    const expected = defaultOrganizationFor(account);
    const [current] = (
      await seedDb.execute<{ organization: string | null }>(
        sql`SELECT organization FROM profiles WHERE user_id = ${userId}`
      )
    ).rows;

    if (!current || current.organization === expected) continue;

    record("organisation", `${account.name}: ${current.organization ?? "—"} → ${expected ?? "—"}`, "renamed");
    if (!COMMIT) continue;

    await seedDb.execute(
      sql`UPDATE profiles SET organization = ${expected}, updated_at = now() WHERE user_id = ${userId}`
    );
    // The investor's firm is denormalized onto every approach they have made.
    await seedDb
      .update(investorEngagements)
      .set({ investorOrganization: expected })
      .where(eq(investorEngagements.userId, userId));
  }

  // One engagement carried the word "interested" in the organisation column, evidently a form field
  // filled with the wrong answer during testing. An organisation column is either a firm or empty.
  const [{ n: strayOrgs } = { n: "0" }] = (
    await seedDb.execute<{ n: string }>(
      sql`SELECT count(*)::text AS n FROM investor_engagements
          WHERE investor_organization IS NOT NULL AND investor_organization = lower(investor_organization)`
    )
  ).rows;

  if (Number(strayOrgs) === 0) {
    record("organisation", "no lowercase organisation values", "skipped");
    return;
  }
  record("organisation", `${strayOrgs} engagement(s) carrying a non-name organisation`, "renamed");
  if (!COMMIT) return;

  await seedDb
    .update(investorEngagements)
    .set({ investorOrganization: null })
    .where(
      and(
        sql`${investorEngagements.investorOrganization} IS NOT NULL`,
        sql`${investorEngagements.investorOrganization} = lower(${investorEngagements.investorOrganization})`
      )
    );
}

async function main() {
  console.log(
    COMMIT
      ? "Running in COMMIT mode — changes will be written.\n"
      : "Running as a DRY RUN. Lines marked ~ are what would change. Re-run with --commit to apply.\n"
  );

  await purgeProjects();
  await purgeEngagements();
  await purgeMessages();
  await realignPilotNames();

  const deleted = changes.filter((c) => c.action === "deleted").length;
  const renamed = changes.filter((c) => c.action === "renamed").length;
  console.log(`\n${COMMIT ? "Deleted" : "Would delete"} ${deleted} record(s); ${COMMIT ? "renamed" : "would rename"} ${renamed}.`);
  if (!COMMIT) console.log("Nothing was written. Re-run with --commit to apply.");

  await seedPool.end();
}

void main();
