import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { projectWatchlist } from "@/lib/db/schema";

const ALL_ROLES = ["registered", "qualified", "government", "ministry_admin", "admin", "super_admin"] as const;

/** DELETE /api/user/watchlist/[projectId] — remove one of the caller's own bookmarked projects.
 *  Scoped by userId so a user can never remove another user's watchlist entry. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const actor = await requireRole([...ALL_ROLES]);
    const { projectId } = await params;

    const [deleted] = await db
      .delete(projectWatchlist)
      .where(and(eq(projectWatchlist.projectId, projectId), eq(projectWatchlist.userId, actor.userId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Watchlist entry not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
