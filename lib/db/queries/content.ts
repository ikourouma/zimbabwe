import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { faqEntries, siteContentBlocks } from "@/lib/db/schema";
import type { FaqEntry, SiteContentBlock } from "@/lib/types";

function mapFaqRow(row: typeof faqEntries.$inferSelect): FaqEntry {
  return {
    id: row.id,
    category: row.category,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sortOrder,
    status: row.status as FaqEntry["status"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function fetchFaqEntries(includeArchived = false): Promise<FaqEntry[]> {
  const rows = await db
    .select()
    .from(faqEntries)
    .where(includeArchived ? undefined : eq(faqEntries.status, "active"))
    .orderBy(asc(faqEntries.category), asc(faqEntries.sortOrder), asc(faqEntries.createdAt));
  return rows.map(mapFaqRow);
}

export interface FaqEntryInput {
  category: string;
  question: string;
  answer: string;
  sortOrder?: number;
}

export async function createFaqEntry(input: FaqEntryInput): Promise<FaqEntry> {
  const [row] = await db
    .insert(faqEntries)
    .values({
      category: input.category.trim(),
      question: input.question.trim(),
      answer: input.answer.trim(),
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return mapFaqRow(row);
}

export async function updateFaqEntry(
  id: string,
  updates: Partial<FaqEntryInput> & { status?: "active" | "archived" }
): Promise<FaqEntry | null> {
  const [row] = await db
    .update(faqEntries)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(faqEntries.id, id))
    .returning();
  return row ? mapFaqRow(row) : null;
}

export async function deleteFaqEntry(id: string): Promise<void> {
  await db.delete(faqEntries).where(eq(faqEntries.id, id));
}

export async function fetchContentBlock<T = unknown>(key: string): Promise<SiteContentBlock<T> | null> {
  const [row] = await db.select().from(siteContentBlocks).where(eq(siteContentBlocks.key, key)).limit(1);
  if (!row) return null;
  return { key: row.key, body: row.body as T, updatedAt: row.updatedAt.toISOString() };
}

export async function upsertContentBlock<T = unknown>(
  key: string,
  body: T,
  updatedBy: string | null
): Promise<SiteContentBlock<T>> {
  const [row] = await db
    .insert(siteContentBlocks)
    .values({ key, body: body as object, updatedBy, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteContentBlocks.key,
      set: { body: body as object, updatedBy, updatedAt: new Date() },
    })
    .returning();
  return { key: row.key, body: row.body as T, updatedAt: row.updatedAt.toISOString() };
}
