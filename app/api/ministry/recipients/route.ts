import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchCaseManagerCandidates, fetchGovernmentOfficialsForMinistry } from "@/lib/db/queries/users";

/**
 * GET /api/ministry/recipients — the ministry-wide (project-independent) part of a ministry_admin's
 * Communication Hub "To" directory (Ministry Message Recipient Targeting plan): the ministry's own
 * government officials ("the admin's group") plus ZIDA admin/super_admin. Fetched once per modal
 * open/composer mount and combined client-side with the per-project engaged-investors list.
 */
export async function GET() {
  try {
    const actor = await requireRole(["ministry_admin"]);
    const [government, staff] = await Promise.all([
      actor.ministryId ? fetchGovernmentOfficialsForMinistry(actor.ministryId) : Promise.resolve([]),
      fetchCaseManagerCandidates(),
    ]);
    return NextResponse.json({ government, staff });
  } catch (error) {
    return handleRouteError(error);
  }
}
