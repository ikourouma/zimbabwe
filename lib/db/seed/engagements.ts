import { eq } from "drizzle-orm";
import { investorEngagements, projects } from "@/lib/db/schema";
import { seedInvestorEngagements } from "@/lib/data/investor-engagements";
import { zimbabweProjects } from "@/lib/data/zimbabwe-projects";
import { seedDb } from "./db";

/** Seeds illustrative Deal Room engagements, resolving demo project ids to DB uuids by slug. */
export async function seedEngagements() {
  const slugByDemoId = new Map(zimbabweProjects.map((p) => [p.id, p.slug]));

  for (const engagement of seedInvestorEngagements) {
    const slug = slugByDemoId.get(engagement.projectId);
    if (!slug) continue;

    const [project] = await seedDb
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);

    if (!project) continue;

    const existing = await seedDb
      .select({ id: investorEngagements.id })
      .from(investorEngagements)
      .where(eq(investorEngagements.projectId, project.id))
      .limit(1);

    if (existing[0]) {
      await seedDb
        .update(investorEngagements)
        .set({
          investorName: engagement.investorName,
          investorOrganization: engagement.investorOrganization ?? null,
          status: engagement.status,
          notes: engagement.notes ?? null,
          updatedAt: new Date(engagement.updatedAt),
        })
        .where(eq(investorEngagements.id, existing[0].id));
    } else {
      await seedDb.insert(investorEngagements).values({
        projectId: project.id,
        investorName: engagement.investorName,
        investorOrganization: engagement.investorOrganization ?? null,
        status: engagement.status,
        notes: engagement.notes ?? null,
        createdAt: new Date(engagement.createdAt),
        updatedAt: new Date(engagement.updatedAt),
      });
    }
  }
}
