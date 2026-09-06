/**
 * Removes placeholder project records left behind by manual testing.
 *
 * A record like `xyz` / "test" is harmless in a development database and damaging in a screenshot:
 * it surfaced in the Review Queue, the Ministry Pipeline and the Platform Manager registry in the
 * walkthrough captures, immediately alongside Sunway City and Goromonzi Agro. A stakeholder reading
 * those pages sees a national investment registry that carries junk, and no amount of surrounding
 * prose recovers that impression.
 *
 * The detection is deliberately narrow. A record qualifies only when its title AND its description
 * are both too short to be content rather than typing, and nobody has since attached a document or
 * raised an engagement against it. Capital, owner and location are ignored as signals — the record
 * that prompted this script carried "15M", "ZIDA Pilot" and "Harare", because those fields are
 * required at creation and get filled with whatever is to hand. A genuine early-stage ministry
 * draft will fail the title or description test, so the safe error here is to leave a placeholder
 * in place rather than to delete real work.
 *
 * Every dependent row cascades (project_messages, project_documents, investor_engagements and the
 * taxonomy join tables), which is why this deletes rather than archives — archived is the terminal
 * state for a real project that ended, and it still appears under the Archived status chip. A
 * record that was never a project should leave no trace at all.
 *
 *   npx tsx --env-file=.env.local scripts/prune-placeholder-projects.ts            # report only
 *   npx tsx --env-file=.env.local scripts/prune-placeholder-projects.ts --apply    # delete
 */
import { and, inArray, sql } from "drizzle-orm";
import { investorEngagements, projectDocuments, projects } from "@/lib/db/schema";
import { seedDb, seedPool } from "../lib/db/seed/db";

// A real registry entry does not have a six-character title and a four-character description.
const MAX_TITLE_LENGTH = 8;
const MAX_DESCRIPTION_LENGTH = 24;

async function findPlaceholders() {
  const candidates = await seedDb
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      status: projects.projectStatus,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(
      and(
        sql`length(trim(${projects.title})) <= ${MAX_TITLE_LENGTH}`,
        sql`length(trim(coalesce(${projects.description}, ''))) <= ${MAX_DESCRIPTION_LENGTH}`
      )
    );

  if (candidates.length === 0) return [];

  const ids = candidates.map((c) => c.id);

  // Anything an investor or a reviewer has already touched is not a placeholder, whatever its
  // title looks like — deleting it would destroy someone else's record of their own work.
  const withDocuments = new Set(
    (
      await seedDb
        .select({ projectId: projectDocuments.projectId })
        .from(projectDocuments)
        .where(inArray(projectDocuments.projectId, ids))
    ).map((r) => r.projectId)
  );
  const withEngagements = new Set(
    (
      await seedDb
        .select({ projectId: investorEngagements.projectId })
        .from(investorEngagements)
        .where(inArray(investorEngagements.projectId, ids))
    ).map((r) => r.projectId)
  );

  return candidates.filter((c) => !withDocuments.has(c.id) && !withEngagements.has(c.id));
}

async function main() {
  const apply = process.argv.includes("--apply");

  const placeholders = await findPlaceholders();

  if (placeholders.length === 0) {
    console.log("No placeholder projects found. The registry is clean.");
    await seedPool.end();
    return;
  }

  console.log(`Found ${placeholders.length} placeholder project(s):\n`);
  for (const p of placeholders) {
    console.log(`  ${p.title}`);
    console.log(`    id          ${p.id}`);
    console.log(`    status      ${p.status}`);
    console.log(`    description ${JSON.stringify(p.description ?? "")}`);
    console.log(`    created     ${p.createdAt?.toISOString() ?? "unknown"}\n`);
  }

  if (!apply) {
    console.log("Dry run — nothing deleted. Re-run with --apply to remove these records.");
    await seedPool.end();
    return;
  }

  await seedDb.delete(projects).where(
    inArray(
      projects.id,
      placeholders.map((p) => p.id)
    )
  );
  console.log(`Deleted ${placeholders.length} placeholder project(s) and their cascading rows.`);

  await seedPool.end();
}

void main();
