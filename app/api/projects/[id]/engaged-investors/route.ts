import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { fetchInvestorsEngagedOnProject } from "@/lib/db/queries/users";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";

/**
 * GET /api/projects/[id]/engaged-investors — the "Investors" recipient group for a ministry_admin's
 * Communication Hub composer (Ministry Message Recipient Targeting plan): every investor with an
 * engagement on this one project, so a message can be addressed to a specific person rather than
 * only the project's general thread. Ministry-scoped: 403 outside the caller's own ministry.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["ministry_admin"]);
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!actor.ministryId || !projectMatchesMinistry(project, actor.ministryId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const investors = await fetchInvestorsEngagedOnProject(project.id);
    return NextResponse.json(investors);
  } catch (error) {
    return handleRouteError(error);
  }
}
