import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  contactReasons,
  ministries,
  projects,
  provinces,
  sdgs,
  sectors,
  strategicPillars,
  subsectors,
} from "@/lib/db/schema";
import { sdgs as seedSdgs } from "@/lib/data/taxonomies";
import { slugify } from "@/lib/utils";
import type { ContactReason, Ministry, MouTemplateDefaults, SDG, Sector, StrategicPillar } from "@/lib/types";

export interface TaxonomyBundle {
  sectors: Sector[];
  pillars: StrategicPillar[];
  ministries: Ministry[];
  contactReasons: ContactReason[];
  provinces: string[];
  /** UN SDGs are a fixed global standard (not super-admin-editable), so we surface them DB-backed
   *  for the taxonomy suite but fall back to the canonical seed set if the table isn't populated. */
  sdgs: SDG[];
}

export async function fetchTaxonomies(): Promise<TaxonomyBundle> {
  const [sectorRows, subsectorRows, pillarRows, ministryRows, contactReasonRows, provinceRows, sdgRows] =
    await Promise.all([
      db.select().from(sectors).orderBy(asc(sectors.name)),
      db.select().from(subsectors).orderBy(asc(subsectors.name)),
      db.select().from(strategicPillars).orderBy(asc(strategicPillars.name)),
      db.select().from(ministries).orderBy(asc(ministries.name)),
      db.select().from(contactReasons).orderBy(asc(contactReasons.label)),
      db.select().from(provinces).orderBy(asc(provinces.name)),
      db.select().from(sdgs).orderBy(asc(sdgs.number)),
    ]);

  const subsectorsBySector = new Map<string, typeof subsectorRows>();
  for (const sub of subsectorRows) {
    const list = subsectorsBySector.get(sub.sectorId) ?? [];
    list.push(sub);
    subsectorsBySector.set(sub.sectorId, list);
  }

  return {
    sectors: sectorRows.map((s) => ({
      id: s.id,
      name: s.name,
      shortName: s.shortName ?? undefined,
      slug: s.slug,
      description: s.description,
      defaultMouTerms: (s.defaultMouTerms as MouTemplateDefaults | null) ?? undefined,
      status: s.status,
      subsectors: (subsectorsBySector.get(s.id) ?? []).map((sub) => ({
        id: sub.id,
        sectorId: sub.sectorId,
        name: sub.name,
        slug: sub.slug,
        status: sub.status,
      })),
    })),
    pillars: pillarRows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      strategicMandate: p.strategicMandate,
      targetOutcomes: p.targetOutcomes,
      policyAlignment: {
        primary: p.policyAlignmentPrimary,
        secondary: p.policyAlignmentSecondary ?? undefined,
      },
      status: p.status,
    })),
    ministries: ministryRows.map((m) => ({
      id: m.id,
      name: m.name,
      shortName: m.shortName,
      type: m.type,
      representativeTitle: m.representativeTitle ?? undefined,
      defaultMouTerms: (m.defaultMouTerms as MouTemplateDefaults | null) ?? undefined,
      assignedStaffUserId: m.assignedStaffUserId ?? undefined,
      status: m.status,
    })),
    contactReasons: contactReasonRows.map((c) => ({
      id: c.id,
      label: c.label,
      routingCategory: c.routingCategory,
      status: c.status,
    })),
    provinces: provinceRows.map((p) => p.name),
    sdgs:
      sdgRows.length > 0
        ? sdgRows.map((s) => ({
            id: s.id,
            number: s.number,
            name: s.name,
            colorToken: s.colorToken,
            description: s.description,
          }))
        : seedSdgs,
  };
}

/**
 * Sets (or clears, via `null`) a ministry's default ZIDA Case Manager (Team Ministry
 * Traceability Batch, Phase 2, item 6). Deliberately its own tiny query function rather than
 * routed through the generic taxonomy PATCH — see PATCH /api/ministries/[id]/case-manager for
 * the entitlement-parity rationale (admin + super_admin, not super_admin-only like the rest of
 * Ministries taxonomy CRUD).
 */
export async function setMinistryCaseManager(ministryId: string, staffUserId: string | null): Promise<void> {
  await db.update(ministries).set({ assignedStaffUserId: staffUserId, updatedAt: new Date() }).where(eq(ministries.id, ministryId));
}

/** How many projects currently fall back to a ministry's default Case Manager (i.e. have no
 *  per-project override) — surfaced by the Phase 8 safe-handoff confirmation when changing that
 *  default, so staff can see the blast radius before carrying it over. */
export async function countProjectsInheritingMinistryDefault(ministryId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(projects)
    .where(and(eq(projects.primaryBeneficiaryMinistryId, ministryId), isNull(projects.assignedStaffUserId)));
  return row?.value ?? 0;
}

/**
 * Resolves a proposer's free-text "Other (not listed)" subsector into a real `subsectorId` —
 * creating a `pending_validation` row under the chosen sector if no matching name exists yet
 * (Deal Room Feedback Batch v2, item 7). The proposal is never blocked waiting on approval; a
 * super_admin later approves (-> `active`, selectable platform-wide) or archives it from the
 * Taxonomies "Subsectors" tab (see app/api/taxonomies/route.ts's addSubsector/approveSubsector/
 * archiveSubsector actions). Idempotent for repeat submissions of the same name+sector.
 */
export async function resolveOrCreatePendingSubsector(sectorId: string, rawName: string): Promise<string> {
  const name = rawName.trim();
  const slug = slugify(name);
  const id = `sub-${sectorId}-${slug}`;

  const [existing] = await db.select({ id: subsectors.id }).from(subsectors).where(eq(subsectors.id, id)).limit(1);
  if (existing) return existing.id;

  await db
    .insert(subsectors)
    .values({ id, sectorId, name, slug, status: "pending_validation" })
    .onConflictDoNothing();

  return id;
}
