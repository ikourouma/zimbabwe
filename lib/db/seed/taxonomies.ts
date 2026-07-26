import { sql } from "drizzle-orm";
import {
  agencies,
  contactReasons,
  ministries,
  provinces,
  sdgs,
  sectors,
  strategicPillars,
  subsectors,
  userRoles,
} from "@/lib/db/schema";
import {
  agencies as agencyData,
  contactReasons as contactReasonData,
  ministries as ministryData,
  provinces as provinceNames,
  sdgs as sdgData,
  sectors as sectorData,
  strategicPillars as pillarData,
  subsectors as subsectorData,
  userRoles as userRoleData,
} from "@/lib/data/taxonomies";
import { seedDb } from "./db";

export async function seedTaxonomies() {
  if (sectorData.length) {
    await seedDb
      .insert(sectors)
      .values(
        sectorData.map((s) => ({
          id: s.id,
          name: s.name,
          shortName: s.shortName ?? null,
          slug: s.slug,
          description: s.description,
          status: s.status,
        }))
      )
      .onConflictDoUpdate({
        target: sectors.id,
        set: {
          name: sql`excluded.name`,
          shortName: sql`excluded.short_name`,
          slug: sql`excluded.slug`,
          description: sql`excluded.description`,
          status: sql`excluded.status`,
          updatedAt: sql`now()`,
        },
      });
  }

  if (subsectorData.length) {
    await seedDb
      .insert(subsectors)
      .values(
        subsectorData.map((s) => ({
          id: s.id,
          sectorId: s.sectorId,
          name: s.name,
          slug: s.slug,
          status: s.status,
        }))
      )
      .onConflictDoUpdate({
        target: subsectors.id,
        set: {
          sectorId: sql`excluded.sector_id`,
          name: sql`excluded.name`,
          slug: sql`excluded.slug`,
          status: sql`excluded.status`,
          updatedAt: sql`now()`,
        },
      });
  }

  if (pillarData.length) {
    await seedDb
      .insert(strategicPillars)
      .values(
        pillarData.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          strategicMandate: p.strategicMandate,
          targetOutcomes: p.targetOutcomes,
          policyAlignmentPrimary: p.policyAlignment.primary,
          policyAlignmentSecondary: p.policyAlignment.secondary ?? null,
          status: p.status,
        }))
      )
      .onConflictDoUpdate({
        target: strategicPillars.id,
        set: {
          name: sql`excluded.name`,
          slug: sql`excluded.slug`,
          description: sql`excluded.description`,
          strategicMandate: sql`excluded.strategic_mandate`,
          targetOutcomes: sql`excluded.target_outcomes`,
          policyAlignmentPrimary: sql`excluded.policy_alignment_primary`,
          policyAlignmentSecondary: sql`excluded.policy_alignment_secondary`,
          status: sql`excluded.status`,
          updatedAt: sql`now()`,
        },
      });
  }

  if (sdgData.length) {
    await seedDb
      .insert(sdgs)
      .values(
        sdgData.map((s) => ({
          id: s.id,
          number: s.number,
          name: s.name,
          colorToken: s.colorToken,
          description: s.description,
        }))
      )
      .onConflictDoUpdate({
        target: sdgs.id,
        set: {
          number: sql`excluded.number`,
          name: sql`excluded.name`,
          colorToken: sql`excluded.color_token`,
          description: sql`excluded.description`,
        },
      });
  }

  if (ministryData.length) {
    await seedDb
      .insert(ministries)
      .values(
        ministryData.map((m) => ({
          id: m.id,
          name: m.name,
          shortName: m.shortName,
          type: m.type,
          representativeTitle: m.representativeTitle ?? null,
          status: m.status,
        }))
      )
      .onConflictDoUpdate({
        target: ministries.id,
        set: {
          name: sql`excluded.name`,
          shortName: sql`excluded.short_name`,
          type: sql`excluded.type`,
          representativeTitle: sql`excluded.representative_title`,
          status: sql`excluded.status`,
          updatedAt: sql`now()`,
        },
      });
  }

  if (agencyData.length) {
    await seedDb
      .insert(agencies)
      .values(
        agencyData.map((a) => ({
          id: a.id,
          name: a.name,
          parentMinistryId: a.parentMinistryId ?? null,
          type: a.type,
          status: a.status,
        }))
      )
      .onConflictDoUpdate({
        target: agencies.id,
        set: {
          name: sql`excluded.name`,
          parentMinistryId: sql`excluded.parent_ministry_id`,
          type: sql`excluded.type`,
          status: sql`excluded.status`,
          updatedAt: sql`now()`,
        },
      });
  }

  if (contactReasonData.length) {
    await seedDb
      .insert(contactReasons)
      .values(contactReasonData)
      .onConflictDoUpdate({
        target: contactReasons.id,
        set: {
          label: sql`excluded.label`,
          routingCategory: sql`excluded.routing_category`,
          status: sql`excluded.status`,
        },
      });
  }

  if (provinceNames.length) {
    await seedDb
      .insert(provinces)
      .values(provinceNames.map((name) => ({ id: name.toLowerCase().replace(/\s+/g, "-"), name })))
      .onConflictDoUpdate({
        target: provinces.id,
        set: { name: sql`excluded.name` },
      });
  }

  if (userRoleData.length) {
    await seedDb
      .insert(userRoles)
      .values(userRoleData)
      .onConflictDoUpdate({
        target: userRoles.id,
        set: {
          name: sql`excluded.name`,
          permissions: sql`excluded.permissions`,
          scope: sql`excluded.scope`,
        },
      });
  }
}
