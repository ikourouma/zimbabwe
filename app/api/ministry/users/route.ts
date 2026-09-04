import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchUsersByMinistry } from "@/lib/db/queries/users";

/**
 * Ministry-scoped user directory (Platform Feedback Batch v3, Phase 1) — the data source for
 * /ministry/users. A ministry_admin sees only the `government`-role staff bound to their own
 * `ministryId`; this is deliberately narrower than GET /api/users (admin/super_admin, every role).
 */
export async function GET() {
  try {
    const actor = await requireRole(["ministry_admin"]);
    if (!actor.ministryId) return NextResponse.json([]);
    const users = await fetchUsersByMinistry(actor.ministryId);
    return NextResponse.json(users);
  } catch (error) {
    return handleRouteError(error);
  }
}
