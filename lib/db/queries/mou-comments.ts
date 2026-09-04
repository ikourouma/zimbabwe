import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mouFieldComments } from "@/lib/db/schema";
import { ApiError } from "@/lib/api/route-helpers";
import type { MouFieldComment } from "@/lib/types";

function toApp(row: typeof mouFieldComments.$inferSelect): MouFieldComment {
  return {
    id: row.id,
    mouId: row.mouId,
    fieldKey: row.fieldKey,
    authorUserId: row.authorUserId,
    authorName: row.authorName,
    body: row.body,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedBy: row.resolvedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function fetchMouFieldComments(mouId: string): Promise<MouFieldComment[]> {
  const rows = await db
    .select()
    .from(mouFieldComments)
    .where(eq(mouFieldComments.mouId, mouId))
    .orderBy(asc(mouFieldComments.createdAt));
  return rows.map(toApp);
}

export async function createMouFieldComment(input: {
  mouId: string;
  fieldKey: string;
  authorUserId: string;
  authorName: string;
  body: string;
}): Promise<MouFieldComment> {
  const [inserted] = await db.insert(mouFieldComments).values(input).returning();
  return toApp(inserted);
}

export async function resolveMouFieldComment(id: string, resolvedBy: string): Promise<MouFieldComment> {
  const [current] = await db.select().from(mouFieldComments).where(eq(mouFieldComments.id, id)).limit(1);
  if (!current) throw new ApiError("Comment not found.", 404);
  const [updated] = await db
    .update(mouFieldComments)
    .set({ resolvedAt: new Date(), resolvedBy })
    .where(eq(mouFieldComments.id, id))
    .returning();
  return toApp(updated);
}

/** Count of still-unresolved comments per field for a given MOU — powers the small badge next to
 *  each field's label in the MOU tab without the client having to fetch every comment body. */
export async function fetchUnresolvedCommentCounts(mouId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ fieldKey: mouFieldComments.fieldKey })
    .from(mouFieldComments)
    .where(and(eq(mouFieldComments.mouId, mouId), isNull(mouFieldComments.resolvedAt)));
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.fieldKey] = (counts[row.fieldKey] ?? 0) + 1;
  return counts;
}
