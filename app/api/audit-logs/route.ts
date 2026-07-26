import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchAuditLogs } from "@/lib/db/queries/audit";

export async function GET() {
  try {
    await requireRole(["super_admin", "admin", "government"]);
    const logs = await fetchAuditLogs(200);
    return NextResponse.json(logs);
  } catch (error) {
    return handleRouteError(error);
  }
}
