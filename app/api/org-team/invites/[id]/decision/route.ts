import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { approveOrgInvite, rejectOrgInvite } from "@/lib/db/queries/org-team";
import { logAuditEvent } from "@/lib/db/queries/audit";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Staff-only Four-Eyes validation decision on a pending org-team invite (Deal Room Feedback Batch
 * v2, Phase 5) — the step that lets the platform trust every "qualified" account created this way,
 * since no investor can ever approve their own invite. Reused unmodified by Phase 6's ministry_admin
 * invite flow.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const body = (await request.json()) as { action?: "approve" | "reject" };

    if (body.action === "approve") {
      const { invite, accountCreated, tempPassword } = await approveOrgInvite(id, actor.userId);
      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "org_invite.approved",
        entityType: "org_invite",
        entityId: id,
        metadata: { inviteEmail: invite.inviteEmail, accountCreated },
      });
      return NextResponse.json({ invite, accountCreated, tempPassword });
    }

    if (body.action === "reject") {
      const invite = await rejectOrgInvite(id, actor.userId);
      await logAuditEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "org_invite.rejected",
        entityType: "org_invite",
        entityId: id,
        metadata: { inviteEmail: invite.inviteEmail },
      });
      return NextResponse.json({ invite });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return handleRouteError(error);
  }
}
