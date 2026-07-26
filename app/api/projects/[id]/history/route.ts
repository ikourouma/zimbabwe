import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { fetchProjectHistory } from "@/lib/db/queries/audit";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Narrow, per-project governance history — deliberately open to `qualified` investors (unlike
 * `/api/audit-logs`, which is admin/super_admin/government only) since it never leaks anything
 * beyond the single project's own status/engagement events the caller already has a detail view
 * for. Powers the Project Detail Drawer's Timeline tab (see the Deal Room Engagement and MOU
 * Upgrade plan's "project-history-endpoint" item) so multi-round change-request cycles are a real
 * chronological record instead of the single latest-snapshot fields on the project row.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireRole(["admin", "super_admin", "government", "qualified"]);
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const history = await fetchProjectHistory(project.id);
    return NextResponse.json(history);
  } catch (error) {
    return handleRouteError(error);
  }
}
