import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  contactReasons,
  ministries,
  provinces,
  sdgs,
  sectors,
  strategicPillars,
  subsectors,
} from "@/lib/db/schema";
import { sdgs as seedSdgs } from "@/lib/data/taxonomies";
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
