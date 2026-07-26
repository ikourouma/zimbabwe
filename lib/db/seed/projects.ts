import { eq } from "drizzle-orm";
import {
  projectDocuments,
  projectPillars,
  projectRegulators,
  projectSdgs,
  projectSecondaryMinistries,
  projects,
  siteSettings,
} from "@/lib/db/schema";
import { zimbabweProjects } from "@/lib/data/zimbabwe-projects";
import { seedDb } from "./db";
import { mapProjectToDbRow } from "./map-project";

export async function seedSiteSettings() {
  await seedDb
    .insert(siteSettings)
    .values({ id: "singleton" })
    .onConflictDoNothing();
}

export async function seedProjects() {
  for (const project of zimbabweProjects) {
    const row = mapProjectToDbRow(project);

    const existing = await seedDb
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, project.slug))
      .limit(1);

    let projectId: string;

    if (existing[0]) {
      projectId = existing[0].id;
      await seedDb.update(projects).set(row).where(eq(projects.id, projectId));
    } else {
      const [inserted] = await seedDb.insert(projects).values(row).returning({ id: projects.id });
      projectId = inserted.id;
    }

    await seedDb.delete(projectPillars).where(eq(projectPillars.projectId, projectId));
    await seedDb.delete(projectSdgs).where(eq(projectSdgs.projectId, projectId));
    await seedDb.delete(projectSecondaryMinistries).where(eq(projectSecondaryMinistries.projectId, projectId));
    await seedDb.delete(projectRegulators).where(eq(projectRegulators.projectId, projectId));
    await seedDb.delete(projectDocuments).where(eq(projectDocuments.projectId, projectId));

    if (project.strategicPillarIds.length) {
      await seedDb.insert(projectPillars).values(
        project.strategicPillarIds.map((pillarId) => ({ projectId, pillarId }))
      );
    }

    if (project.sdgIds.length) {
      await seedDb.insert(projectSdgs).values(project.sdgIds.map((sdgId) => ({ projectId, sdgId })));
    }

    if (project.secondaryBeneficiaryMinistryIds?.length) {
      await seedDb.insert(projectSecondaryMinistries).values(
        project.secondaryBeneficiaryMinistryIds.map((ministryId) => ({ projectId, ministryId }))
      );
    }

    if (project.documents.length) {
      await seedDb.insert(projectDocuments).values(
        project.documents.map((title) => ({
          projectId,
          title,
          storageKey: `pending-r2/${project.slug}/${title.replace(/\s+/g, "-").toLowerCase()}`,
          visibilityLevel: "qualified_investor" as const,
          uploadedBy: project.createdBy,
        }))
      );
    }
  }
}
