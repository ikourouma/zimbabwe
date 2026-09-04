import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { projectWatchlist } from "@/lib/db/schema";
import type { WatchlistEntry } from "@/lib/types";

const ALL_ROLES = ["registered", "qualified", "government", "ministry_admin", "admin", "super_admin"] as const;

type WatchlistRow = typeof projectWatchlist.$inferSelect;

function mapRow(row: WatchlistRow): WatchlistEntry {
  return { id: row.id, projectId: row.projectId, createdAt: row.createdAt.toISOString() };
}

/** GET /api/user/watchlist — the signed-in user's own saved (bookmarked) projects, newest first. */
export async function GET() {
  try {
    const actor = await requireRole([...ALL_ROLES]);
    const rows = await db
      .select()
      .from(projectWatchlist)
      .where(eq(projectWatchlist.userId, actor.userId))
      .orderBy(desc(projectWatchlist.createdAt));
    return NextResponse.json(rows.map(mapRow));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/user/watchlist — bookmark a project for the signed-in user. Idempotent: re-saving an
 *  already-bookmarked project just returns the existing row instead of erroring on the unique
 *  constraint, since the client (WatchlistButton) treats this as a plain toggle-on. */
export async function POST(request: Request) {
  try {
    const actor = await requireRole([...ALL_ROLES]);
    const body = (await request.json()) as { projectId?: string };
    const projectId = body.projectId?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }

    const matchesThis = and(eq(projectWatchlist.userId, actor.userId), eq(projectWatchlist.projectId, projectId));

    const [inserted] = await db
      .insert(projectWatchlist)
      .values({ userId: actor.userId, projectId })
      .onConflictDoNothing()
      .returning();

    if (inserted) return NextResponse.json(mapRow(inserted), { status: 201 });

    // Conflict path — already bookmarked; fetch and return the existing row instead of erroring.
    const [row] = await db.select().from(projectWatchlist).where(matchesThis);
    return NextResponse.json(row ? mapRow(row) : { ok: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
