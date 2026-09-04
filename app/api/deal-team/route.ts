import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchDealTeam, fetchMinistryAdminsForMinistry } from "@/lib/db/queries/users";

/**
 * GET /api/deal-team — the ZIDA staff directory (admin/super_admin/government) used by the
 * Communication Hub composer to route a message to a named case manager. Readable by qualified
 * investors (so they can pick a recipient) and by staff themselves. Returns only { userId, name,
 * role } — no emails or other PII.
 *
 * Full Persona Communication Parity plan: when the caller is `government`, also append the
 * `ministry_admin`(s) for their own ministry, so the composer's recipient list includes their
 * ministry desk alongside ZIDA staff — a government official's first line of escalation is their
 * own ministry_admin, not ZIDA directly.
 */
export async function GET() {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const team = await fetchDealTeam();
    if (actor.role === "government" && actor.ministryId) {
      const ministryAdmins = await fetchMinistryAdminsForMinistry(actor.ministryId);
      return NextResponse.json([...team, ...ministryAdmins]);
    }
    return NextResponse.json(team);
  } catch (error) {
    return handleRouteError(error);
  }
}
