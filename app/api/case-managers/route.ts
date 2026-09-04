import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchCaseManagerCandidates } from "@/lib/db/queries/users";

/** GET /api/case-managers — active admin/super_admin accounts eligible to be assigned as a
 *  ministry's default or a project's override Case Manager (Team Ministry Traceability Batch,
 *  Phase 2, item 6). Staff-only; never exposed to investors/ministry_admin. */
export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);
    const candidates = await fetchCaseManagerCandidates();
    return NextResponse.json(candidates);
  } catch (error) {
    return handleRouteError(error);
  }
}
