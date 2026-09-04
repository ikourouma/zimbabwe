import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchPlatformStats } from "@/lib/db/queries/platform-stats";

const ALL_ROLES = ["registered", "qualified", "government", "ministry_admin", "admin", "super_admin"] as const;

/** GET /api/deal-room/platform-stats — safe, no-PII aggregate marketplace stats for the Investor
 *  Dashboard Overview. Open to any authenticated role (unlike /api/audit-logs), since nothing
 *  returned here is more sensitive than what's already visible on the public /projects registry. */
export async function GET() {
  try {
    await requireRole([...ALL_ROLES]);
    const stats = await fetchPlatformStats();
    return NextResponse.json(stats);
  } catch (error) {
    return handleRouteError(error);
  }
}
