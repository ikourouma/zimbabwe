import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";

/**
 * Platform-wide count of real `document.downloaded` audit events (admin/super_admin/government) —
 * powers the Government Executive Report's "Document Downloads" tile. Deliberately a bare count,
 * never a fabricated/placeholder number: it reads 0 until a real download happens (see
 * app/api/projects/[id]/documents/[docId]/download/route.ts, which logs the event), and the report
 * hides the tile entirely while the count is 0.
 */
export async function GET() {
  try {
    await requireRole(["admin", "super_admin", "government"]);

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(eq(auditLogs.action, "document.downloaded"));

    return NextResponse.json({ count: row?.count ?? 0 });
  } catch (error) {
    return handleRouteError(error);
  }
}
