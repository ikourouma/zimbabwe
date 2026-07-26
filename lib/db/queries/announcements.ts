import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { announcements } from "@/lib/db/schema";
import type { Announcement } from "@/lib/types";

function mapRow(row: typeof announcements.$inferSelect): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audienceRole: row.audienceRole as Announcement["audienceRole"],
    style: row.style as Announcement["style"],
    priority: row.priority,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    dismissable: row.dismissable,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    status: row.status as Announcement["status"],
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Every announcement (any status/window) for the management console. */
export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const rows = await db.select().from(announcements).orderBy(desc(announcements.priority), desc(announcements.createdAt));
  return rows.map(mapRow);
}

/** Currently-active announcements: status=active and within the [startsAt, endsAt] window.
 *  Audience filtering happens client-side against the viewer's role. */
export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  const now = new Date();
  const rows = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.status, "active"),
        lte(announcements.startsAt, now),
        or(isNull(announcements.endsAt), gt(announcements.endsAt, now))
      )
    )
    .orderBy(desc(announcements.priority), desc(announcements.createdAt));
  return rows.map(mapRow);
}

export async function createAnnouncement(
  input: Partial<typeof announcements.$inferInsert> & { title: string; body: string }
): Promise<Announcement> {
  const [row] = await db.insert(announcements).values(input).returning();
  return mapRow(row);
}

export async function updateAnnouncement(
  id: string,
  updates: Partial<typeof announcements.$inferInsert>
): Promise<Announcement | null> {
  const [row] = await db
    .update(announcements)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(announcements.id, id))
    .returning();
  return row ? mapRow(row) : null;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const rows = await db.delete(announcements).where(eq(announcements.id, id)).returning({ id: announcements.id });
  return rows.length > 0;
}
