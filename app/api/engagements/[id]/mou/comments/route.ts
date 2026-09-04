import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { investorEngagements } from "@/lib/db/schema";
import { getOrCreateMouForEngagement } from "@/lib/db/queries/mous";
import { createMouFieldComment, fetchMouFieldComments } from "@/lib/db/queries/mou-comments";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { NDA_REQUIRED_MESSAGE, requiresNdaAcceptance } from "@/lib/governance/nda";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";

type RouteParams = { params: Promise<{ id: string }> };

async function loadEngagementForActor(engagementId: string, actor: { role: string; userId: string; ministryId?: string | null }) {
  const [engagement] = await db
    .select()
    .from(investorEngagements)
    .where(eq(investorEngagements.id, engagementId))
    .limit(1);
  if (!engagement) return { engagement: null, forbidden: false };
  // Reconcile plan + Phase 3, item B5: same Delegate carve-out as the parent MOU route.
  if (actor.role === "qualified" && engagement.userId !== actor.userId && engagement.assignedUserId !== actor.userId) {
    return { engagement: null, forbidden: true };
  }
  if (actor.role === "ministry_admin") {
    if (!actor.ministryId) return { engagement: null, forbidden: true };
    const project = await fetchProjectByIdOrSlug(engagement.projectId);
    if (!project || !projectMatchesMinistry(project, actor.ministryId)) {
      return { engagement: null, forbidden: true };
    }
  }
  return { engagement, forbidden: false };
}

/**
 * Per-field MOU review comments (Phase 7 — MOU content upgrade) — a lightweight, field-scoped
 * discussion thread distinct from the engagement's general Communication Hub thread, so "the
 * indicative capital figure looks stale" stays pinned to that one field. Same confidentiality gate
 * as every other MOU endpoint: a qualified investor only ever sees their own engagement's thread.
 * ministry_admin (read-only oversight) may view and add field comments — see POST below.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const { id } = await params;
    const { engagement, forbidden } = await loadEngagementForActor(id, actor);
    if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (engagement.status !== "approved") return NextResponse.json([]);

    const mou = await getOrCreateMouForEngagement(id, {
      projectId: engagement.projectId,
      investorName: engagement.investorName,
      ticketSize: engagement.ticketSize,
    });
    const comments = await fetchMouFieldComments(mou.id);
    return NextResponse.json(comments);
  } catch (error) {
    return handleRouteError(error);
  }
}

interface CommentBody {
  fieldKey?: string;
  body?: string;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const { id } = await params;
    const { engagement, forbidden } = await loadEngagementForActor(id, actor);
    if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (requiresNdaAcceptance(actor.role) && !actor.ndaAcceptedAt) {
      return NextResponse.json({ error: NDA_REQUIRED_MESSAGE }, { status: 403 });
    }
    if (engagement.status !== "approved") {
      return NextResponse.json({ error: "The MOU workflow isn't active for this engagement yet" }, { status: 400 });
    }

    const body = (await request.json()) as CommentBody;
    const fieldKey = body.fieldKey?.trim();
    const commentBody = body.body?.trim();
    if (!fieldKey) return NextResponse.json({ error: "A field is required" }, { status: 400 });
    if (!commentBody) return NextResponse.json({ error: "Comment text is required" }, { status: 400 });

    const mou = await getOrCreateMouForEngagement(id, {
      projectId: engagement.projectId,
      investorName: engagement.investorName,
      ticketSize: engagement.ticketSize,
    });

    const comment = await createMouFieldComment({
      mouId: mou.id,
      fieldKey,
      authorUserId: actor.userId,
      authorName: actor.name,
      body: commentBody,
    });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "mou.comment_added",
      entityType: "engagement",
      entityId: id,
      metadata: { fieldKey, projectId: engagement.projectId, investorName: engagement.investorName },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
