import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { engagementMous, ministries, projects, sectors } from "@/lib/db/schema";
import { mapDbMouToApp } from "@/lib/db/mappers/mou";
import type { MouContent, MouTemplateDefaults, EngagementMou } from "@/lib/types";

/** Identifying fields the caller already has on hand from the engagement row it just loaded —
 *  passed through so a fresh MOU's first draft isn't a blank form (see buildSeedContent below). */
export interface MouSeedContext {
  projectId: string;
  investorName: string;
  ticketSize: string | null;
}

/**
 * Starting-draft seed for a brand-new MOU: real, already-known values (project title, investor
 * name, indicative ticket) plus any Platform-Admin-authored Sector/Ministry default term bullets
 * and special conditions (see the Taxonomies page's "Default MOU Terms" editor). Ministry-level
 * defaults are listed ahead of sector-level ones as the more specific source. Nothing here is
 * ever auto-finalized — ZIDA staff still review and edit every field before Submit for Review.
 */
async function buildSeedContent(ctx: MouSeedContext): Promise<MouContent> {
  const [project] = await db.select().from(projects).where(eq(projects.id, ctx.projectId)).limit(1);
  if (!project) return {};

  const [sector, ministry] = await Promise.all([
    db.select().from(sectors).where(eq(sectors.id, project.sectorId)).limit(1),
    db.select().from(ministries).where(eq(ministries.id, project.primaryBeneficiaryMinistryId)).limit(1),
  ]);
  const sectorDefaults = (sector[0]?.defaultMouTerms as MouTemplateDefaults | null) ?? null;
  const ministryDefaults = (ministry[0]?.defaultMouTerms as MouTemplateDefaults | null) ?? null;

  const termBullets = [...(ministryDefaults?.termBullets ?? []), ...(sectorDefaults?.termBullets ?? [])];
  const specialConditions = [ministryDefaults?.specialConditions, sectorDefaults?.specialConditions]
    .filter((s): s is string => Boolean(s?.trim()))
    .join("\n\n");

  return {
    parties: `ZIDA (on behalf of the Government of Zimbabwe) and ${ctx.investorName}`,
    projectReference: project.title,
    purpose: `Non-binding framework to explore ${ctx.ticketSize ? `an indicative investment of ${ctx.ticketSize} in` : "an investment in"} "${project.title}", and to align both parties on the scope of collaboration ahead of a binding agreement.`,
    scope: "Parties agree to collaborate in good faith on due diligence, site/regulatory facilitation, and structuring for the project referenced above, within the timelines set out in the term bullets below.",
    indicativeCapital: ctx.ticketSize ?? undefined,
    termBullets: termBullets.length ? termBullets : undefined,
    nonBindingStatement: "This Memorandum of Understanding is non-binding and does not create any legal obligation on either party to proceed with the proposed investment, except for the confidentiality and governing law provisions, which survive termination of discussions.",
    governingLaw: "This Memorandum is governed by, and construed in accordance with, the laws of the Republic of Zimbabwe. Any dispute arising from it shall first be referred to good-faith negotiation between the parties.",
    specialConditions: specialConditions || undefined,
  };
}

/**
 * Lazily creates the MOU row the first time it's requested for an approved engagement — the
 * plan's "auto-initiated once an engagement reaches approved" behavior, implemented without a DB
 * trigger. Callers (the [id]/mou routes) are responsible for confirming the engagement itself is
 * "approved" before calling this — this function only owns the engagement_mous row. `seedContext`
 * is optional so existing callers/tests that don't have it on hand still get an empty-draft MOU.
 */
export async function getOrCreateMouForEngagement(
  engagementId: string,
  seedContext?: MouSeedContext
): Promise<EngagementMou> {
  const [existing] = await db
    .select()
    .from(engagementMous)
    .where(eq(engagementMous.engagementId, engagementId))
    .limit(1);
  if (existing) return mapDbMouToApp(existing);

  const content = seedContext ? await buildSeedContent(seedContext) : {};

  const [created] = await db
    .insert(engagementMous)
    .values({ engagementId, status: "drafting", content, formatting: {} })
    .onConflictDoNothing({ target: engagementMous.engagementId })
    .returning();
  if (created) return mapDbMouToApp(created);

  // Lost the create race — another request inserted between our SELECT and INSERT.
  const [row] = await db
    .select()
    .from(engagementMous)
    .where(eq(engagementMous.engagementId, engagementId))
    .limit(1);
  if (!row) throw new Error("Failed to create or fetch MOU for engagement " + engagementId);
  return mapDbMouToApp(row);
}

export async function fetchMouByEngagementId(engagementId: string): Promise<EngagementMou | null> {
  const [row] = await db
    .select()
    .from(engagementMous)
    .where(eq(engagementMous.engagementId, engagementId))
    .limit(1);
  return row ? mapDbMouToApp(row) : null;
}
