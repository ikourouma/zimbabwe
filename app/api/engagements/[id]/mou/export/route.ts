import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { investorEngagements } from "@/lib/db/schema";
import { fetchMouByEngagementId } from "@/lib/db/queries/mous";
import { renderMouDocx } from "@/lib/mou/docx-export";
import { NDA_REQUIRED_MESSAGE, requiresNdaAcceptance } from "@/lib/governance/nda";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * DOCX export (Phase 7 — MOU content upgrade) — renders the current MOU content (or the frozen
 * `contentSnapshot` once one exists) into a downloadable .docx, mirroring the same confidentiality
 * gate as GET /api/engagements/[id]/mou: a qualified investor may only export their own engagement's
 * MOU; a ministry_admin (read-only oversight) only their own ministry's. Deliberately a one-shot
 * server-side render, not a new editing surface — see lib/mou/docx-export.ts.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const { id } = await params;

    const [engagement] = await db
      .select()
      .from(investorEngagements)
      .where(eq(investorEngagements.id, id))
      .limit(1);
    if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Reconcile plan + Phase 3, item B5: same Delegate carve-out as the sibling MOU routes.
    if (actor.role === "qualified" && engagement.userId !== actor.userId && engagement.assignedUserId !== actor.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (actor.role === "ministry_admin") {
      if (!actor.ministryId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const project = await fetchProjectByIdOrSlug(engagement.projectId);
      if (!project || !projectMatchesMinistry(project, actor.ministryId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    if (requiresNdaAcceptance(actor.role) && !actor.ndaAcceptedAt) {
      return NextResponse.json({ error: NDA_REQUIRED_MESSAGE }, { status: 403 });
    }

    const mou = await fetchMouByEngagementId(id);
    if (!mou) return NextResponse.json({ error: "No MOU exists yet for this engagement" }, { status: 404 });

    const buffer = await renderMouDocx(mou);
    const filename = `MOU-${engagement.investorName.replace(/[^a-z0-9]+/gi, "-")}-${id.slice(0, 8)}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
