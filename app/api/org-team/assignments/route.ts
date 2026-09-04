import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchTeamAssignmentsSummaryByOwner } from "@/lib/db/queries/org-team";

/** Owner-scoped "what is each of my team members currently working on" summary — powers the
 *  /deal-room/teams and /ministry/teams roster page (Team Ministry Traceability Batch, Phase 4). */
export async function GET() {
  try {
    const actor = await requireRole(["qualified", "ministry_admin"]);
    const summary = await fetchTeamAssignmentsSummaryByOwner(actor.userId);
    return NextResponse.json(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
