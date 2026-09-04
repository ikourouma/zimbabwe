import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchAuditLogs, fetchAuditLogsForMinistry } from "@/lib/db/queries/audit";

export async function GET() {
  try {
    const actor = await requireRole(["super_admin", "admin", "government", "ministry_admin"]);

    // ministry_admin (Ministry Desk management dashboard plan, Part 4) — a real, ministry-scoped
    // feed instead of the platform-wide one super_admin/admin/government get; powers the Ministry
    // Overview's Recent Activity panel and the (now re-enabled) notification bell for this role.
    if (actor.role === "ministry_admin") {
      const logs = actor.ministryId ? await fetchAuditLogsForMinistry(actor.ministryId, 50) : [];
      return NextResponse.json(logs);
    }

    const logs = await fetchAuditLogs(200);
    return NextResponse.json(logs);
  } catch (error) {
    return handleRouteError(error);
  }
}
