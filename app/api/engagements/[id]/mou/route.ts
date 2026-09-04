import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { engagementMous, investorEngagements } from "@/lib/db/schema";
import { getOrCreateMouForEngagement } from "@/lib/db/queries/mous";
import { mapDbMouToApp } from "@/lib/db/mappers/mou";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { canEditMouContent } from "@/lib/governance/mou-workflow";
import { NDA_REQUIRED_MESSAGE, requiresNdaAcceptance } from "@/lib/governance/nda";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import type { MouContent, MouFormatting } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

/** Confidentiality mirror of GET /api/engagements — a qualified investor may only ever open the
 *  MOU for their own engagement; a ministry_admin (read-only oversight — see the mou/comments and
 *  mou/export siblings for the same pattern) only ever opens one tied to their own ministry's
 *  project. Throws the same shape `handleRouteError` already understands. */
async function loadEngagementForActor(engagementId: string, actor: { role: string; userId: string; ministryId?: string | null }) {
  const [engagement] = await db
    .select()
    .from(investorEngagements)
    .where(eq(investorEngagements.id, engagementId))
    .limit(1);
  if (!engagement) return { engagement: null, forbidden: false };
  // Reconcile plan + Phase 3, item B5: a validated Delegate (assignedUserId) has equal authority
  // to the owner on their assigned engagement — same rule as the engagement PATCH route — so they
  // must not 403 opening its MOU tab either.
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

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const { id } = await params;
    const { engagement, forbidden } = await loadEngagementForActor(id, actor);
    if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (requiresNdaAcceptance(actor.role) && !actor.ndaAcceptedAt) {
      return NextResponse.json({ error: NDA_REQUIRED_MESSAGE }, { status: 403 });
    }

    // The MOU only exists once the engagement itself has been approved — surfaced to the client
    // as `mou: null` + the engagement's current status, not a 404, so the MOU tab can render a
    // helpful "not yet available" state instead of an error.
    if (engagement.status !== "approved") {
      return NextResponse.json({ mou: null, engagementStatus: engagement.status });
    }

    const mou = await getOrCreateMouForEngagement(id, {
      projectId: engagement.projectId,
      investorName: engagement.investorName,
      ticketSize: engagement.ticketSize,
    });
    return NextResponse.json({ mou, engagementStatus: engagement.status });
  } catch (error) {
    return handleRouteError(error);
  }
}

interface MouPatchBody {
  content?: Partial<MouContent>;
  formatting?: Partial<MouFormatting>;
}

/** Draft-editing endpoint — content and formatting only. Status transitions (submit for review,
 *  approve, finalize, ready-for-signature, execute, reopen) live in ./actions/route.ts so every
 *  state change is a single, auditable, named action instead of an implicit side effect of a
 *  field edit. */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const { engagement, forbidden } = await loadEngagementForActor(id, actor);
    if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (engagement.status !== "approved") {
      return NextResponse.json({ error: "Engagement is not approved yet" }, { status: 400 });
    }
    if (!canEditMouContent(actor.role)) {
      return NextResponse.json({ error: "Only ZIDA Admin/Platform Admin may edit MOU drafts" }, { status: 403 });
    }

    const body = (await request.json()) as MouPatchBody;
    const mou = await getOrCreateMouForEngagement(id, {
      projectId: engagement.projectId,
      investorName: engagement.investorName,
      ticketSize: engagement.ticketSize,
    });

    if (body.content) {
      if (mou.status !== "drafting") {
        return NextResponse.json(
          { error: "Content can only be edited while the MOU is in Drafting — use 'Request Changes' first." },
          { status: 400 }
        );
      }
    }
    if (body.formatting && mou.formattingLocked) {
      return NextResponse.json({ error: "Formatting is locked — the MOU has been executed." }, { status: 400 });
    }

    const [updated] = await db
      .update(engagementMous)
      .set({
        ...(body.content ? { content: { ...mou.content, ...body.content } } : {}),
        ...(body.formatting ? { formatting: { ...mou.formatting, ...body.formatting } } : {}),
        updatedAt: new Date(),
      })
      .where(eq(engagementMous.engagementId, id))
      .returning();

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "mou.draft_updated",
      entityType: "engagement",
      entityId: id,
      metadata: {
        projectId: engagement.projectId,
        investorName: engagement.investorName,
        field: body.content ? "content" : "formatting",
      },
    });

    return NextResponse.json(mapDbMouToApp(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
