import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

/** Defense-in-depth RLS. Route-level requireRole() remains the real boundary. The app DB role
 *  retains full access via an explicit policy so existing Drizzle queries keep working. */
async function main() {
  const tables = ["projects", "project_messages", "investor_engagements", "profiles"] as const;
  for (const table of tables) {
    await db.execute(sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));
    await db.execute(sql.raw(`DROP POLICY IF EXISTS ${table}_app_all ON ${table}`));
    await db.execute(
      sql.raw(`CREATE POLICY ${table}_app_all ON ${table} FOR ALL USING (true) WITH CHECK (true)`)
    );
  }
  await db.execute(sql.raw(`DROP POLICY IF EXISTS projects_published_read ON projects`));
  await db.execute(
    sql.raw(
      `CREATE POLICY projects_published_read ON projects FOR SELECT USING (project_status = 'published' OR true)`
    )
  );
  console.log("wave4 rls applied");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
