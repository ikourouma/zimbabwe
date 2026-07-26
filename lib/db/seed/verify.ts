import { count } from "drizzle-orm";
import { projects, sectors, siteSettings, strategicPillars } from "@/lib/db/schema";
import { zimbabweProjects } from "@/lib/data/zimbabwe-projects";
import { sectors as sectorData } from "@/lib/data/taxonomies";
import { seedDb } from "./db";

export async function verifySeedCounts() {
  const [[sectorRow], [projectRow], [pillarRow], [settingsRow]] = await Promise.all([
    seedDb.select({ value: count() }).from(sectors),
    seedDb.select({ value: count() }).from(projects),
    seedDb.select({ value: count() }).from(strategicPillars),
    seedDb.select({ value: count() }).from(siteSettings),
  ]);

  const expected = {
    sectors: sectorData.length,
    projects: zimbabweProjects.length,
    pillars: 11,
    siteSettings: 1,
  };

  const actual = {
    sectors: sectorRow.value,
    projects: projectRow.value,
    pillars: pillarRow.value,
    siteSettings: settingsRow.value,
  };

  console.log("Seed verification:");
  console.log(`  sectors: ${actual.sectors} (expected ${expected.sectors})`);
  console.log(`  projects: ${actual.projects} (expected ${expected.projects})`);
  console.log(`  pillars: ${actual.pillars} (expected ${expected.pillars})`);
  console.log(`  site_settings: ${actual.siteSettings} (expected ${expected.siteSettings})`);

  const mismatches = Object.entries(expected).filter(
    ([key]) => actual[key as keyof typeof actual] !== expected[key as keyof typeof expected]
  );

  if (mismatches.length) {
    throw new Error(`Seed verification failed: ${mismatches.map(([k]) => k).join(", ")}`);
  }
}
