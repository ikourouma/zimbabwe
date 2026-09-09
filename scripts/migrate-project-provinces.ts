/**
 * Project Data Standardisation, Phase 3 — one-time backfill for the `project_provinces` junction
 * (lib/db/schema/projects.ts) against the 32 pre-existing ZIDA catalogue rows, twelve of which
 * pack several provinces into one free-text string (e.g. "Mashonaland East / Manicaland /
 * Masvingo"). Every row written from here on (through the wizard, or a reseed) already gets this
 * junction populated automatically by resolveProvinceIds via syncProjectRelations/seedProjects —
 * this script exists purely to backfill rows that predate that write path.
 *
 * `province` itself is never touched — it stays the free-text display column.
 *
 * Follows the dry-run/`--commit` pattern already used by scripts/migrate-financial-fields.ts:
 * every run prints what it found (or would write) per project, and nothing is written to the
 * database unless `--commit` is passed.
 *
 *   npx tsx --env-file=.env.local scripts/migrate-project-provinces.ts            # dry run
 *   npx tsx --env-file=.env.local scripts/migrate-project-provinces.ts --commit   # apply
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { projectProvinces, projects } from "@/lib/db/schema";
import { resolveProvinceIds } from "@/lib/governance/province-resolver";

const COMMIT = process.argv.includes("--commit");

async function main() {
  const rows = await db.select({ id: projects.id, slug: projects.slug, province: projects.province }).from(projects);

  let linked = 0;
  let skippedNoProvince = 0;
  const unresolvedReport: { slug: string; province: string; unresolved: string[] }[] = [];

  for (const row of rows) {
    if (!row.province?.trim()) {
      skippedNoProvince += 1;
      continue;
    }

    const { ids, unresolved } = resolveProvinceIds(row.province);
    if (unresolved.length) {
      unresolvedReport.push({ slug: row.slug, province: row.province, unresolved });
    }
    if (!ids.length) continue;

    console.log(`${row.slug}: "${row.province}" -> [${ids.join(", ")}]`);
    linked += 1;

    if (COMMIT) {
      await db.delete(projectProvinces).where(eq(projectProvinces.projectId, row.id));
      await db.insert(projectProvinces).values(ids.map((provinceId) => ({ projectId: row.id, provinceId })));
    }
  }

  console.log("");
  console.log(`Projects scanned: ${rows.length}`);
  console.log(`Linked to at least one province: ${linked}`);
  console.log(`Skipped (no province text): ${skippedNoProvince}`);
  if (unresolvedReport.length) {
    console.log("");
    console.log("Unresolved tokens (review lib/governance/province-resolver.ts TOKEN_OVERRIDES):");
    for (const r of unresolvedReport) {
      console.log(`  ${r.slug}: "${r.province}" -> unresolved [${r.unresolved.join(", ")}]`);
    }
  } else {
    console.log("No unresolved tokens.");
  }
  console.log("");
  console.log(COMMIT ? "Committed." : "Dry run only — pass --commit to write.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
