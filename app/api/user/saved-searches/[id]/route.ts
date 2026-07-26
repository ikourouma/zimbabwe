import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { savedSearches } from "@/lib/db/schema";

const ALL_ROLES = ["registered", "qualified", "government", "admin", "super_admin"] as const;

/** DELETE /api/user/saved-searches/[id] — remove one of the caller's own saved searches. Scoped by
 *  userId so a user can never delete another user's saved search even with a guessed id. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole([...ALL_ROLES]);
    const { id } = await params;

    const [deleted] = await db
      .delete(savedSearches)
      .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, actor.userId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Saved search not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
