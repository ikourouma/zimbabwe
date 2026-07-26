import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchDealTeam } from "@/lib/db/queries/users";

/**
 * GET /api/deal-team — the ZIDA staff directory (admin/super_admin/government) used by the
 * Communication Hub composer to route a message to a named case manager. Readable by qualified
 * investors (so they can pick a recipient) and by staff themselves. Returns only { userId, name,
 * role } — no emails or other PII.
 */
export async function GET() {
  try {
    await requireRole(["admin", "super_admin", "government", "qualified"]);
    const team = await fetchDealTeam();
    return NextResponse.json(team);
  } catch (error) {
    return handleRouteError(error);
  }
}
