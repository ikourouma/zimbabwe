import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchTaxonomies } from "@/lib/db/queries/taxonomies";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { slugify } from "@/lib/utils";
import { db } from "@/lib/db/client";
import {
  contactReasons,
  ministries,
  projectPillars,
  projectSecondaryMinistries,
  projects,
  provinces,
  sectors,
  strategicInquiries,
  strategicPillars,
  subsectors,
} from "@/lib/db/schema";

async function countRows(query: Promise<{ n: number }[]>): Promise<number> {
  const [row] = await query;
  return Number(row?.n ?? 0);
}

export async function GET() {
  try {
    const data = await fetchTaxonomies();
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

type TaxonomyPatchBody =
  | { action: "updateSector"; id: string; updates: Record<string, unknown> }
  | { action: "addSector"; name: string; shortName?: string; description?: string }
  | { action: "archiveSector"; id: string }
  | { action: "removeSector"; id: string }
  | { action: "addSubsector"; sectorId: string; name: string }
  | { action: "updateSubsector"; id: string; updates: Record<string, unknown> }
  | { action: "approveSubsector"; id: string }
  | { action: "archiveSubsector"; id: string }
  | { action: "removeSubsector"; id: string }
  | { action: "updatePillar"; id: string; updates: Record<string, unknown> }
  | { action: "addPillar"; name: string; description?: string; strategicMandate?: string; policyAlignmentPrimary?: string }
  | { action: "archivePillar"; id: string }
  | { action: "removePillar"; id: string }
  | { action: "updateMinistry"; id: string; updates: Record<string, unknown> }
  | { action: "addMinistry"; ministry: Record<string, unknown> }
  | { action: "archiveMinistry"; id: string }
  | { action: "removeMinistry"; id: string }
  | { action: "updateContactReason"; id: string; updates: Record<string, unknown> }
  | { action: "addContactReason"; label: string; routingCategory?: string }
  | { action: "archiveContactReason"; id: string }
  | { action: "removeContactReason"; id: string }
  | { action: "addProvince"; name: string }
  | { action: "renameProvince"; index: number; name: string }
  | { action: "removeProvince"; index: number };

/** Fortune-100 referential-integrity guard: a taxonomy term with any linked record may never be
 *  hard-deleted (only archived). Returns the linked-record count for the delete-blocking message. */
async function linkedProjectCount(action: TaxonomyPatchBody["action"], id: string): Promise<number> {
  if (action === "removeSector") {
    return countRows(db.select({ n: sql<number>`count(*)` }).from(projects).where(eq(projects.sectorId, id)));
  }
  if (action === "removePillar") {
    return countRows(db.select({ n: sql<number>`count(*)` }).from(projectPillars).where(eq(projectPillars.pillarId, id)));
  }
  if (action === "removeSubsector") {
    return countRows(db.select({ n: sql<number>`count(*)` }).from(projects).where(eq(projects.subsectorId, id)));
  }
  if (action === "removeContactReason") {
    return countRows(db.select({ n: sql<number>`count(*)` }).from(strategicInquiries).where(eq(strategicInquiries.contactReasonId, id)));
  }
  if (action === "removeMinistry") {
    // A ministry can be linked either as a project's required primary beneficiary or as one of
    // its optional co-sponsoring secondary ministries — both must be clear before a hard delete.
    const [primary, secondary] = await Promise.all([
      countRows(db.select({ n: sql<number>`count(*)` }).from(projects).where(eq(projects.primaryBeneficiaryMinistryId, id))),
      countRows(
        db.select({ n: sql<number>`count(*)` }).from(projectSecondaryMinistries).where(eq(projectSecondaryMinistries.ministryId, id))
      ),
    ]);
    return primary + secondary;
  }
  return 0;
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireRole(["super_admin"]);
    const body = (await request.json()) as TaxonomyPatchBody;

    switch (body.action) {
      case "updateSector":
        await db
          .update(sectors)
          .set({ ...body.updates, updatedAt: new Date() } as typeof sectors.$inferInsert)
          .where(eq(sectors.id, body.id));
        break;
      case "addSector": {
        const name = body.name.trim();
        if (!name) return NextResponse.json({ error: "Sector name is required" }, { status: 400 });
        const slug = slugify(name);
        await db
          .insert(sectors)
          .values({
            id: `sec-${slug}`,
            name,
            shortName: body.shortName?.trim() || name,
            slug,
            description: body.description?.trim() || name,
            status: "active",
          } as typeof sectors.$inferInsert)
          .onConflictDoNothing();
        break;
      }
      case "archiveSector":
        await db.update(sectors).set({ status: "inactive", updatedAt: new Date() }).where(eq(sectors.id, body.id));
        break;
      case "removeSector": {
        const linked = await linkedProjectCount("removeSector", body.id);
        if (linked > 0) {
          return NextResponse.json(
            { error: `Cannot delete: ${linked} project(s) still use this sector. Archive it instead or reassign those projects first.` },
            { status: 409 }
          );
        }
        await db.delete(sectors).where(eq(sectors.id, body.id));
        break;
      }
      case "addSubsector": {
        // Mirrors resolveOrCreatePendingSubsector's id scheme (lib/db/queries/taxonomies.ts) so a
        // manually-added subsector and an investor's "Other (not listed)" suggestion for the same
        // name+sector always resolve to the same row instead of creating a duplicate.
        const name = body.name.trim();
        if (!name) return NextResponse.json({ error: "Subsector name is required" }, { status: 400 });
        const slug = slugify(name);
        await db
          .insert(subsectors)
          .values({
            id: `sub-${body.sectorId}-${slug}`,
            sectorId: body.sectorId,
            name,
            slug,
            status: "active",
          } as typeof subsectors.$inferInsert)
          .onConflictDoNothing();
        break;
      }
      case "updateSubsector":
        await db
          .update(subsectors)
          .set({ ...body.updates, updatedAt: new Date() } as typeof subsectors.$inferInsert)
          .where(eq(subsectors.id, body.id));
        break;
      case "approveSubsector":
        // Promotes an investor-suggested "Other (not listed)" subsector (Deal Room Feedback Batch
        // v2, item 7) from pending_validation to active — the moment it becomes selectable in the
        // Propose-Project wizard's dropdown platform-wide.
        await db.update(subsectors).set({ status: "active", updatedAt: new Date() }).where(eq(subsectors.id, body.id));
        break;
      case "archiveSubsector":
        await db.update(subsectors).set({ status: "inactive", updatedAt: new Date() }).where(eq(subsectors.id, body.id));
        break;
      case "removeSubsector": {
        const linked = await linkedProjectCount("removeSubsector", body.id);
        if (linked > 0) {
          return NextResponse.json(
            { error: `Cannot delete: ${linked} project(s) still use this subsector. Archive it instead or reassign those projects first.` },
            { status: 409 }
          );
        }
        await db.delete(subsectors).where(eq(subsectors.id, body.id));
        break;
      }
      case "updatePillar":
        await db
          .update(strategicPillars)
          .set({ ...body.updates, updatedAt: new Date() } as typeof strategicPillars.$inferInsert)
          .where(eq(strategicPillars.id, body.id));
        break;
      case "addPillar": {
        const name = body.name.trim();
        if (!name) return NextResponse.json({ error: "Pillar name is required" }, { status: 400 });
        const slug = slugify(name);
        await db
          .insert(strategicPillars)
          .values({
            id: `pillar-${slug}`,
            name,
            slug,
            description: body.description?.trim() || name,
            strategicMandate: body.strategicMandate?.trim() || name,
            targetOutcomes: [],
            policyAlignmentPrimary: body.policyAlignmentPrimary?.trim() || "NDS1",
            status: "active",
          } as typeof strategicPillars.$inferInsert)
          .onConflictDoNothing();
        break;
      }
      case "archivePillar":
        await db.update(strategicPillars).set({ status: "inactive", updatedAt: new Date() }).where(eq(strategicPillars.id, body.id));
        break;
      case "removePillar": {
        const linked = await linkedProjectCount("removePillar", body.id);
        if (linked > 0) {
          return NextResponse.json(
            { error: `Cannot delete: ${linked} project(s) still reference this strategic pillar. Archive it instead or reassign those projects first.` },
            { status: 409 }
          );
        }
        await db.delete(strategicPillars).where(eq(strategicPillars.id, body.id));
        break;
      }
      case "updateMinistry":
        await db
          .update(ministries)
          .set({ ...body.updates, updatedAt: new Date() } as typeof ministries.$inferInsert)
          .where(eq(ministries.id, body.id));
        break;
      case "addMinistry": {
        const id = `min-${Date.now()}`;
        await db.insert(ministries).values({ id, ...body.ministry } as typeof ministries.$inferInsert);
        break;
      }
      case "archiveMinistry":
        await db.update(ministries).set({ status: "inactive", updatedAt: new Date() }).where(eq(ministries.id, body.id));
        break;
      case "removeMinistry": {
        const linked = await linkedProjectCount("removeMinistry", body.id);
        if (linked > 0) {
          return NextResponse.json(
            { error: `Cannot delete: ${linked} project(s) still reference this ministry (as primary or co-sponsoring). Archive it instead or reassign those projects first.` },
            { status: 409 }
          );
        }
        await db.delete(ministries).where(eq(ministries.id, body.id));
        break;
      }
      case "updateContactReason":
        await db
          .update(contactReasons)
          .set(body.updates as typeof contactReasons.$inferInsert)
          .where(eq(contactReasons.id, body.id));
        break;
      case "addContactReason": {
        const label = body.label.trim();
        if (!label) return NextResponse.json({ error: "Reason label is required" }, { status: 400 });
        const id = `reason-${slugify(label)}`;
        await db
          .insert(contactReasons)
          .values({
            id,
            label,
            routingCategory: body.routingCategory?.trim() || "general",
            status: "active",
          } as typeof contactReasons.$inferInsert)
          .onConflictDoNothing();
        break;
      }
      case "archiveContactReason":
        await db.update(contactReasons).set({ status: "inactive" }).where(eq(contactReasons.id, body.id));
        break;
      case "removeContactReason": {
        const linked = await linkedProjectCount("removeContactReason", body.id);
        if (linked > 0) {
          return NextResponse.json(
            { error: `Cannot delete: ${linked} inquiry(ies) still reference this contact reason. Archive it instead.` },
            { status: 409 }
          );
        }
        await db.delete(contactReasons).where(eq(contactReasons.id, body.id));
        break;
      }
      case "addProvince": {
        const trimmed = body.name.trim();
        if (!trimmed) break;
        const id = trimmed.toLowerCase().replace(/\s+/g, "-");
        await db.insert(provinces).values({ id, name: trimmed }).onConflictDoNothing();
        break;
      }
      case "renameProvince": {
        const data = await fetchTaxonomies();
        const current = data.provinces[body.index];
        if (!current) break;
        const oldId = current.toLowerCase().replace(/\s+/g, "-");
        const trimmed = body.name.trim();
        const newId = trimmed.toLowerCase().replace(/\s+/g, "-");
        await db.delete(provinces).where(eq(provinces.id, oldId));
        await db.insert(provinces).values({ id: newId, name: trimmed });
        break;
      }
      case "removeProvince": {
        const data = await fetchTaxonomies();
        const name = data.provinces[body.index];
        if (!name) break;
        // `projects.province` is still free text (no canonical FK yet — see BACKLOG.md's "Full
        // province data migration"), so this is a best-effort case-insensitive substring match
        // rather than an exact-key join; it errs toward blocking the delete when in doubt.
        const linked = await countRows(
          db.select({ n: sql<number>`count(*)` }).from(projects).where(sql`${projects.province} ILIKE ${`%${name}%`}`)
        );
        if (linked > 0) {
          return NextResponse.json(
            { error: `Cannot delete: ${linked} project(s) still reference "${name}" in their province field. Reassign those projects first.` },
            { status: 409 }
          );
        }
        await db.delete(provinces).where(eq(provinces.id, name.toLowerCase().replace(/\s+/g, "-")));
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: `taxonomy.${body.action}`,
      entityType: "taxonomy",
      entityId: "id" in body ? body.id : "index" in body ? String(body.index) : "bulk",
      metadata: body,
    });

    const data = await fetchTaxonomies();
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
