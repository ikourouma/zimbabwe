import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  projectDocuments,
  projectPillars,
  projectProvinces,
  projectRegulators,
  projectSdgs,
  projectSecondaryMinistries,
  projectTeamAssignments,
  projects,
} from "@/lib/db/schema";
import { mapDbProjectToApp, type ProjectRelations } from "@/lib/db/mappers/project";
import { resolveProvinceIds } from "@/lib/governance/province-resolver";
import type { InvestmentProject } from "@/lib/types";

async function loadRelations(projectId: string): Promise<ProjectRelations> {
  const [pillars, sdgs, secondary, regulators, provinceLinks, documents, team] = await Promise.all([
    db.select({ pillarId: projectPillars.pillarId }).from(projectPillars).where(eq(projectPillars.projectId, projectId)),
    db.select({ sdgId: projectSdgs.sdgId }).from(projectSdgs).where(eq(projectSdgs.projectId, projectId)),
    db
      .select({ ministryId: projectSecondaryMinistries.ministryId })
      .from(projectSecondaryMinistries)
      .where(eq(projectSecondaryMinistries.projectId, projectId)),
    db
      .select({ agencyId: projectRegulators.agencyId })
      .from(projectRegulators)
      .where(eq(projectRegulators.projectId, projectId)),
    db
      .select({ provinceId: projectProvinces.provinceId })
      .from(projectProvinces)
      .where(eq(projectProvinces.projectId, projectId)),
    db.select().from(projectDocuments).where(eq(projectDocuments.projectId, projectId)),
    db.select({ userId: projectTeamAssignments.userId }).from(projectTeamAssignments).where(eq(projectTeamAssignments.projectId, projectId)),
  ]);

  return {
    strategicPillarIds: pillars.map((p) => p.pillarId),
    sdgIds: sdgs.map((s) => s.sdgId),
    secondaryBeneficiaryMinistryIds: secondary.map((m) => m.ministryId),
    regulatorIds: regulators.map((r) => r.agencyId),
    provinceIds: provinceLinks.map((p) => p.provinceId),
    documents,
    teamAssignedUserIds: team.map((t) => t.userId),
  };
}

export async function fetchAllProjects(): Promise<InvestmentProject[]> {
  const rows = await db.select().from(projects);
  return Promise.all(
    rows.map(async (row) => {
      const relations = await loadRelations(row.id);
      return mapDbProjectToApp(row, relations);
    })
  );
}

export async function fetchProjectByIdOrSlug(idOrSlug: string): Promise<InvestmentProject | null> {
  const [row] = await db
    .select()
    .from(projects)
    .where(or(eq(projects.id, idOrSlug), eq(projects.slug, idOrSlug)))
    .limit(1);

  if (!row) return null;
  const relations = await loadRelations(row.id);
  return mapDbProjectToApp(row, relations);
}

export async function resolveProjectDbId(idOrSlug: string): Promise<string | null> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(or(eq(projects.id, idOrSlug), eq(projects.slug, idOrSlug)))
    .limit(1);
  return row?.id ?? null;
}

/** As `resolveProjectDbId`, but carries the title back as well, for callers that write an audit
 *  row — a trail that records only a project id makes the reader look the project up to find out
 *  what happened. */
export async function resolveProjectRef(idOrSlug: string): Promise<{ id: string; title: string } | null> {
  const [row] = await db
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(or(eq(projects.id, idOrSlug), eq(projects.slug, idOrSlug)))
    .limit(1);
  return row ?? null;
}

export async function syncProjectRelations(
  projectId: string,
  partial: Partial<InvestmentProject>
) {
  if (partial.strategicPillarIds) {
    await db.delete(projectPillars).where(eq(projectPillars.projectId, projectId));
    if (partial.strategicPillarIds.length) {
      await db
        .insert(projectPillars)
        .values(partial.strategicPillarIds.map((pillarId) => ({ projectId, pillarId })));
    }
  }

  if (partial.sdgIds) {
    await db.delete(projectSdgs).where(eq(projectSdgs.projectId, projectId));
    if (partial.sdgIds.length) {
      await db.insert(projectSdgs).values(partial.sdgIds.map((sdgId) => ({ projectId, sdgId })));
    }
  }

  if (partial.secondaryBeneficiaryMinistryIds) {
    await db.delete(projectSecondaryMinistries).where(eq(projectSecondaryMinistries.projectId, projectId));
    if (partial.secondaryBeneficiaryMinistryIds.length) {
      await db.insert(projectSecondaryMinistries).values(
        partial.secondaryBeneficiaryMinistryIds.map((ministryId) => ({ projectId, ministryId }))
      );
    }
  }

  if (partial.regulatorIds) {
    await db.delete(projectRegulators).where(eq(projectRegulators.projectId, projectId));
    if (partial.regulatorIds.length) {
      await db
        .insert(projectRegulators)
        .values(partial.regulatorIds.map((agencyId) => ({ projectId, agencyId })));
    }
  }

  // Project Data Standardisation, Phase 3 — provinceIds has no client-facing input of its own
  // (see the doc comment on InvestmentProject.provinceIds); it's re-derived from `province`
  // itself whenever that field is part of the write, so the junction can never drift from the
  // free text sitting beside it.
  if (partial.province !== undefined) {
    await db.delete(projectProvinces).where(eq(projectProvinces.projectId, projectId));
    const { ids } = resolveProvinceIds(partial.province);
    if (ids.length) {
      await db.insert(projectProvinces).values(ids.map((provinceId) => ({ projectId, provinceId })));
    }
  }

  // Real documents are managed exclusively through their own upload/delete endpoints now
  // (POST/DELETE /api/projects/[id]/documents/...) — this function deliberately no longer
  // touches `project_documents` from a `documents: string[]` title array. That legacy field is
  // still accepted on the type for back-compat, but always derived read-only from the real rows
  // by mapDbProjectToApp; syncing it here would wipe real uploaded files on every project edit.
}
