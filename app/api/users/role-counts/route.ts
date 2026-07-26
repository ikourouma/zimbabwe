import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchUserRoleCounts } from "@/lib/db/queries/users";

/**
 * Aggregate-only account counts by role (admin/super_admin/government) — Government gets this
 * narrower, PII-free endpoint instead of the full GET /api/users list (names/emails), since the
 * Government Executive Report's "Institutional Participant Summary" only ever needs counts.
 */
export async function GET() {
  try {
    await requireRole(["admin", "super_admin", "government"]);
    const data = await fetchUserRoleCounts();
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
