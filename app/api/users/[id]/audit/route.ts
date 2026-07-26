import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchAuditLogsForEntityId } from "@/lib/db/queries/audit";

type RouteParams = { params: Promise<{ id: string }> };

/** Recent account-activity audit rows for a single user, powering the Security/Activity tab of the
 *  Users & Roles detail drawer. Super-admin only, consistent with the rest of user administration. */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireRole(["super_admin"]);
    const { id } = await params;
    const entries = await fetchAuditLogsForEntityId("user", id, 25);
    return NextResponse.json(entries);
  } catch (error) {
    return handleRouteError(error);
  }
}
