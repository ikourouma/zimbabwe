import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { reinstateTeamMember, revokeOrgInvite, suspendTeamMember } from "@/lib/db/queries/org-team";
import { logAuditEvent } from "@/lib/db/queries/audit";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Owner-initiated cancellation of a still-pending invite, or revocation of an already-`active`
 * teammate's access (Team Ministry Traceability Batch, Phase 8 — "safe reassignment handoff").
 * Staff decisions (approve/reject) live on the separate PATCH
 * app/api/org-team/invites/[id]/decision/route.ts — deliberately split so the two very different
 * authority ceilings (owner-on-their-own-row vs. staff-on-anyone's-row) never share one handler's
 * conditional logic.
 *
 * `fallbackToOwner` is optional and only meaningful when revoking an `active` teammate: omitted
 * (or false), the query layer 409s if that teammate still holds any co-editor/Delegate
 * assignments, listing the count — the client is expected to have already shown the owner the
 * affected proposals/engagements (from the `assignments` map it already loads) and re-call with
 * `fallbackToOwner: true` once confirmed.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["qualified", "ministry_admin"]);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { fallbackToOwner?: boolean };
    const invite = await revokeOrgInvite(id, actor.userId, { fallbackToOwner: body.fallbackToOwner });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: invite.status === "revoked" && invite.invitedUserId ? "org_invite.access_revoked" : "org_invite.cancelled",
      entityType: "org_invite",
      entityId: id,
      metadata: { inviteEmail: invite.inviteEmail, fallbackToOwner: Boolean(body.fallbackToOwner) },
    });

    return NextResponse.json(invite);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Owner-initiated Suspend/Reinstate (Reconcile plan + Phase 3, team lifecycle, item B2) — the
 * reversible counterpart to DELETE's Archive. Suspend blocks the teammate's platform access
 * (`profiles.accountStatus`) without touching the roster or their assignments; Reinstate undoes
 * either that or a prior Archive. Same owner-on-their-own-row ceiling as DELETE above.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["qualified", "ministry_admin"]);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { action?: "suspend" | "reinstate" };

    if (body.action !== "suspend" && body.action !== "reinstate") {
      return NextResponse.json({ error: "action must be 'suspend' or 'reinstate'" }, { status: 400 });
    }

    const invite =
      body.action === "suspend"
        ? await suspendTeamMember(id, actor.userId)
        : await reinstateTeamMember(id, actor.userId);

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: body.action === "suspend" ? "org_invite.access_suspended" : "org_invite.reinstated",
      entityType: "org_invite",
      entityId: id,
      metadata: { inviteEmail: invite.inviteEmail },
    });

    return NextResponse.json(invite);
  } catch (error) {
    return handleRouteError(error);
  }
}
