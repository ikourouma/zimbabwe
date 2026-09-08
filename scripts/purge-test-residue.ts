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
  const mark = action === "skipped" ? "Â·" : COMMIT ? "+" : "~";
  console.log(`  ${mark} ${step}: ${detail}${action === "skipped" ? " (nothing to do)" : ""}`);
  changes.push({ step, detail, action });
}

/** Titles and bodies that only a test harness writes. Deliberately anchored to harness vocabulary
 *  ("smoke", "selftest", "phase8") rather than to anything a person might legitimately name a
 *  project â€” "test" alone would match "Testing Laboratory Expansion". */
const HARNESS_PATTERN = "(smoke|selftest|self test|qa residual|phase[0-9]+ )";

// -----------------------------------------------------------------------------------------------
// 1. Projects that were never projects
// -----------------------------------------------------------------------------------------------

async function purgeProjects() {
  console.log("\n[1/6] Harness projects");

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
  console.log("\n[2/6] Harness engagements");

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
  for (const d of dupeRows) record("engagement", `duplicate: ${d.investor_name} â†’ ${d.title}`, "deleted");
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
  console.log("\n[3/6] Harness messages");

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
  console.log("\n[4/6] Pilot account names");

  for (const account of PILOT_ACCOUNTS) {
    const userId = await findAuthUserId(account.email);
    if (!userId) {
      record("name", `${account.email} â€” no such account`, "skipped");
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

    // Audit metadata carries its own copies (see below), and they go stale independently of the
    // account and of the denormalized columns — so they have to count toward "is anything stale",
    // or a second run over an already-renamed account skips past them forever.
    const [auditCount] = (
      await seedDb.execute<{ n: string }>(
        sql`SELECT count(*)::text AS n FROM audit_logs
            WHERE actor_user_id = ${userId}
              AND (metadata ->> 'investorName' NOT IN ('', ${account.name})
                OR metadata ->> 'actorName' NOT IN ('', ${account.name}))`
      )
    ).rows;

    const stale =
      Number(messageCount?.n ?? 0) + Number(engagementCount?.n ?? 0) + Number(auditCount?.n ?? 0);

    if (!authStale && stale === 0) {
      record("name", `${account.name} â€” already consistent`, "skipped");
      continue;
    }

    record(
      "name",
      `${current?.name ?? "?"} â†’ ${account.name} (${stale} denormalized row${stale === 1 ? "" : "s"})`,
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

    // The audit trail resolves the actor by join, so renaming the account relabels who did it. But
    // some rows also carry a denormalized copy of the name in their own metadata, and the activity
    // feed reads that copy when it names a counterparty — which is how the ministry desk came to
    // show "Lindiwe Ncube logged a new engagement with Pilot Qualified Investor", the same person
    // under both her names in a single sentence.
    await seedDb.execute(
      sql`UPDATE audit_logs
          SET metadata = jsonb_set(metadata, '{investorName}', to_jsonb(${account.name}::text))
          WHERE actor_user_id = ${userId}
            AND metadata ->> 'investorName' IS NOT NULL
            AND metadata ->> 'investorName' <> ${account.name}`
    );
    await seedDb.execute(
      sql`UPDATE audit_logs
          SET metadata = jsonb_set(metadata, '{actorName}', to_jsonb(${account.name}::text))
          WHERE actor_user_id = ${userId}
            AND metadata ->> 'actorName' IS NOT NULL
            AND metadata ->> 'actorName' <> ${account.name}`
    );
  }

  // The organisation on the profile is its own copy again, and it read "ZIDA Pilot" for every role
  // that had no explicit override â€” which put the word Pilot into the user directory's organisation
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

    record("organisation", `${account.name}: ${current.organization ?? "â€”"} â†’ ${expected ?? "â€”"}`, "renamed");
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

// -----------------------------------------------------------------------------------------------
// 5. The trail the harness left behind
// -----------------------------------------------------------------------------------------------

/**
 * Audit rows recording acts that only a test harness performed.
 *
 * The earlier passes deleted the harness's projects, engagements and messages but left the trail of
 * them, which is why the governance record still opened on a sector named "Testing" being created
 * and deleted a minute apart, and on an accreditation granted to
 * `e2e+approval-1788662344020@zidaproject.com` with the reason "Automated workflow check." Because
 * the log sorts most recent first, those were also the top entries of Recent Activity on both the
 * ZIDA Admin and Platform Manager landing pages â€” the first thing a reader sees, on the exhibit
 * both guides offer as proof that every act is attributed.
 *
 * Deleting from an audit trail deserves care, so this is anchored to vocabulary no genuine record
 * carries: harness email patterns, the harness's own reason strings, and the one taxonomy term it
 * created. It does not touch a row merely because it is old, automated-looking or inconvenient.
 */
async function purgeAuditResidue() {
  console.log("\n[5/6] Harness audit trail");

  const doomed = await seedDb.execute<{ id: string; action: string; created_at: string }>(
    sql`SELECT id::text AS id, action, created_at::text
        FROM audit_logs
        WHERE entity_id = 'sec-testing'
           OR metadata ->> 'name' = 'Testing'
           OR metadata ->> 'reason' = 'Automated workflow check.'
           OR metadata ->> 'reason' ~* ${HARNESS_PATTERN}
           OR metadata ->> 'title' ~* ${HARNESS_PATTERN}
           OR metadata ->> 'title' = 'EmbassyOS'
           OR metadata ->> 'investorName' ~* '(smoke|draft-lock|selftest)'
           OR coalesce(metadata ->> 'applicantEmail', '') ~* '^(e2e\\+|smoke-)'
           OR coalesce(metadata ->> 'targetEmail', '') ~* '^(e2e\\+|smoke-)'
           OR coalesce(metadata ->> 'inviteEmail', '') ~* '^(e2e\\+|smoke-)'
        ORDER BY created_at DESC`
  );

  const rows = doomed.rows ?? [];
  if (rows.length === 0) {
    record("audit", "no harness rows in the trail", "skipped");
    return;
  }

  for (const r of rows) record("audit", `${r.action} â€” ${r.created_at.slice(0, 10)}`, "deleted");
  if (!COMMIT) return;

  await seedDb.execute(
    sql`DELETE FROM audit_logs WHERE id::text IN (${sql.join(
      rows.map((r) => sql`${r.id}`),
      sql`, `
    )})`
  );
}

// -----------------------------------------------------------------------------------------------
// 6. Project titles the trail recorded only as ids
// -----------------------------------------------------------------------------------------------

/**
 * Backfills `metadata.projectTitle` on engagement rows that carry only a `projectId`.
 *
 * The activity feed now names the project an engagement was logged against, because naming the
 * investor said nothing when the investor was also the actor. Rows written before that change hold
 * the id alone, so they fall back to the old sentence — which is why the ZIDA Admin landing page
 * still opened on five rows of "Grace Mutindi logged a new engagement with Grace Mutindi" after the
 * fix shipped. The title is recovered by join from the project the row already points at; nothing
 * is invented and no row is created.
 */
async function backfillProjectTitles() {
  console.log("\n[6/6] Project titles in the trail");

  const [{ n } = { n: "0" }] = (
    await seedDb.execute<{ n: string }>(
      sql`SELECT count(*)::text AS n
          FROM audit_logs a
          JOIN projects p ON p.id::text = a.metadata ->> 'projectId'
          WHERE a.action LIKE 'engagement.%' AND a.metadata ->> 'projectTitle' IS NULL`
    )
  ).rows;

  if (Number(n) === 0) {
    record("title", "every engagement row already names its project", "skipped");
    return;
  }

  record("title", `${n} engagement row(s) carrying a project id but no title`, "renamed");
  if (!COMMIT) return;

  await seedDb.execute(
    sql`UPDATE audit_logs a
        SET metadata = jsonb_set(a.metadata, '{projectTitle}', to_jsonb(p.title))
        FROM projects p
        WHERE p.id::text = a.metadata ->> 'projectId'
          AND a.action LIKE 'engagement.%'
          AND a.metadata ->> 'projectTitle' IS NULL`
  );
}

async function main() {
  console.log(
    COMMIT
      ? "Running in COMMIT mode â€” changes will be written.\n"
      : "Running as a DRY RUN. Lines marked ~ are what would change. Re-run with --commit to apply.\n"
  );

  await purgeProjects();
  await purgeEngagements();
  await purgeMessages();
  await realignPilotNames();
  await purgeAuditResidue();
  await backfillProjectTitles();

  const deleted = changes.filter((c) => c.action === "deleted").length;
  const renamed = changes.filter((c) => c.action === "renamed").length;
  console.log(`\n${COMMIT ? "Deleted" : "Would delete"} ${deleted} record(s); ${COMMIT ? "renamed" : "would rename"} ${renamed}.`);
  if (!COMMIT) console.log("Nothing was written. Re-run with --commit to apply.");

  await seedPool.end();
}

void main();



