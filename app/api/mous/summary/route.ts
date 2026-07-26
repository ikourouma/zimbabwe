import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { engagementMous } from "@/lib/db/schema";
import type { MouStatus } from "@/lib/types";

/**
 * Platform-wide MOU status counts (admin/super_admin/government) — the one bulk aggregate MOU
 * records need that doesn't exist anywhere else (every other MOU route is scoped to a single
 * engagement). Built specifically to power the Government Executive Report's 4th
 * engagement-funnel stage ("MOU Executed") without exposing any MOU content — counts only.
 */
export async function GET() {
  try {
    await requireRole(["admin", "super_admin", "government"]);

    const rows = await db
      .select({ status: engagementMous.status, count: sql<number>`count(*)::int` })
      .from(engagementMous)
      .groupBy(engagementMous.status);

    const counts: Partial<Record<MouStatus, number>> = {};
    for (const row of rows) counts[row.status as MouStatus] = row.count;

    return NextResponse.json({ counts });
  } catch (error) {
    return handleRouteError(error);
  }
}
