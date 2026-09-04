import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { marketingPopups } from "@/lib/db/schema";
import type { MarketingPopup } from "@/lib/types";

function mapRow(row: typeof marketingPopups.$inferSelect): MarketingPopup {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    subtext: row.subtext,
    imageUrl: row.imageUrl,
    linkHref: row.linkHref,
    linkLabel: row.linkLabel,
    priority: row.priority,
    status: row.status as MarketingPopup["status"],
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function fetchAllMarketingPopups(): Promise<MarketingPopup[]> {
  const rows = await db
    .select()
    .from(marketingPopups)
    .orderBy(desc(marketingPopups.priority), desc(marketingPopups.createdAt));
  return rows.map(mapRow);
}

export async function fetchActiveMarketingPopups(): Promise<MarketingPopup[]> {
  const now = new Date();
  const rows = await db
    .select()
    .from(marketingPopups)
    .where(
      and(
        eq(marketingPopups.status, "active"),
        lte(marketingPopups.startsAt, now),
        or(isNull(marketingPopups.endsAt), gt(marketingPopups.endsAt, now))
      )
    )
    .orderBy(desc(marketingPopups.priority), desc(marketingPopups.createdAt));
  return rows.map(mapRow);
}

export async function createMarketingPopup(
  input: Partial<typeof marketingPopups.$inferInsert> & { title: string; body: string }
): Promise<MarketingPopup> {
  const [row] = await db.insert(marketingPopups).values(input).returning();
  return mapRow(row);
}

export async function updateMarketingPopup(
  id: string,
  updates: Partial<typeof marketingPopups.$inferInsert>
): Promise<MarketingPopup | null> {
  const [row] = await db
    .update(marketingPopups)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(marketingPopups.id, id))
    .returning();
  return row ? mapRow(row) : null;
}

export async function deleteMarketingPopup(id: string): Promise<boolean> {
  const rows = await db.delete(marketingPopups).where(eq(marketingPopups.id, id)).returning({ id: marketingPopups.id });
  return rows.length > 0;
}
