import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { strategicInquiries } from "@/lib/db/schema";

/**
 * Aggregate-only lead inquiry counts by status (admin/super_admin/government) — Government gets
 * this narrower endpoint instead of the full GET /api/inquiries list, which carries prospective
 * investors' free-text messages and contact details. The Government Executive Report's
 * "Lead Inquiries by Status" section only ever needs counts.
 */
export async function GET() {
  try {
    await requireRole(["admin", "super_admin", "government"]);

    const rows = await db
      .select({ status: strategicInquiries.status, count: sql<number>`count(*)::int` })
      .from(strategicInquiries)
      .groupBy(strategicInquiries.status);

    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      counts[row.status] = row.count;
      total += row.count;
    }

    return NextResponse.json({ counts, total });
  } catch (error) {
    return handleRouteError(error);
  }
}
