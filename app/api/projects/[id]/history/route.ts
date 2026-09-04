import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { actorHasProjectGovernanceAccess } from "@/lib/api/security-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { fetchProjectHistory } from "@/lib/db/queries/audit";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const allowed = await actorHasProjectGovernanceAccess(actor, project);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const history = await fetchProjectHistory(project.id);
    return NextResponse.json(history);
  } catch (error) {
    return handleRouteError(error);
  }
}
