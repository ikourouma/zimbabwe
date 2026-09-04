import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchGovernmentOfficialsForMinistry } from "@/lib/db/queries/users";

/**
 * GET /api/reviewing-officers?ministryId=... — active `government` accounts tied to a ministry,
 * eligible to be assigned as a project's "Assigned Reviewing Officer" (Platform Feedback Batch v4,
 * Phase 6). Settable by the project's own `ministry_admin` or admin/super_admin — see PATCH
 * /api/projects/[id], which validates the chosen id against this same candidate pool.
 */
export async function GET(request: Request) {
  try {
    await requireRole(["admin", "super_admin", "ministry_admin"]);
    const ministryId = new URL(request.url).searchParams.get("ministryId");
    if (!ministryId) return NextResponse.json({ error: "ministryId is required" }, { status: 400 });
    const candidates = await fetchGovernmentOfficialsForMinistry(ministryId);
    return NextResponse.json(candidates);
  } catch (error) {
    return handleRouteError(error);
  }
}
