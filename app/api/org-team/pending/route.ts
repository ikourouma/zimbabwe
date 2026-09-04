import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchPendingOrgInvites } from "@/lib/db/queries/org-team";

/** Platform-wide queue of org-team invites still awaiting a staff decision — surfaced as a compact
 *  panel on both /admin/users and /super-admin/users (see components/dashboard/
 *  team-invite-validation-queue.tsx). */
export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);
    const invites = await fetchPendingOrgInvites();
    return NextResponse.json(invites);
  } catch (error) {
    return handleRouteError(error);
  }
}
