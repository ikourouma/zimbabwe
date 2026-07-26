import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchMessageableInvestors } from "@/lib/db/queries/users";

/**
 * GET /api/deal-team/investors — active non-staff users (qualified/government/registered) that
 * ZIDA staff can start or broadcast a Communication Hub thread with. Staff-only; returns only
 * { userId, name, role, organization } — no emails/PII.
 */
export async function GET() {
  try {
    await requireRole(["admin", "super_admin", "government"]);
    const investors = await fetchMessageableInvestors();
    return NextResponse.json(investors);
  } catch (error) {
    return handleRouteError(error);
  }
}
