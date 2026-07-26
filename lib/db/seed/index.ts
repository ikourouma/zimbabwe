import { seedEngagements } from "./engagements";
import { seedPilotAccounts } from "./accounts";
import { seedPool } from "./db";
import { seedProjects, seedSiteSettings } from "./projects";
import { seedTaxonomies } from "./taxonomies";
import { verifySeedCounts } from "./verify";

async function main() {
  console.log("Seeding taxonomies…");
  await seedTaxonomies();

  console.log("Seeding site settings…");
  await seedSiteSettings();

  console.log("Seeding projects…");
  await seedProjects();

  console.log("Seeding investor engagements…");
  await seedEngagements();

  console.log("Verifying counts…");
  await verifySeedCounts();

  console.log("Seeding pilot auth accounts…");
  await seedPilotAccounts();

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await seedPool.end();
  });
