import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { assignTeamMemberToProject, fetchProjectTeamAssignments, removeTeamAssignment } from "@/lib/db/queries/org-team";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { notifyUser } from "@/lib/email/notify";
import type { InvestmentProject } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

/** Per-proposal co-editor roster (Deal Room Feedback Batch v2, Phase 5). Only the proposal's own
 *  owner may assign/unassign — staff manage project stage/content through the normal governance
 *  workflow instead, not this roster (see the plan's "the org owner assigns" wording). Returns a
 *  ready-to-return NextResponse instead of throwing, since handleRouteError only special-cases
 *  AuthorizationError and would otherwise flatten a real 404/403 into a generic 500. */
async function requireOwnedProject(
  id: string,
  userId: string
): Promise<{ project: InvestmentProject } | { error: NextResponse }> {
  const project = await fetchProjectByIdOrSlug(id);
  if (!project) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (project.createdBy !== userId) {
    return { error: NextResponse.json({ error: "Only this proposal's owner can manage its team." }, { status: 403 }) };
  }
  return { project };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["qualified", "admin", "super_admin"]);
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isStaff = actor.role === "admin" || actor.role === "super_admin";
    const isOwner = project.createdBy === actor.userId;
    const isAssigned = project.teamAssignedUserIds?.includes(actor.userId) ?? false;
    if (!isStaff && !isOwner && !isAssigned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const team = await fetchProjectTeamAssignments(project.id);
    return NextResponse.json(team);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["qualified"]);
    const { id } = await params;
    const result = await requireOwnedProject(id, actor.userId);
    if ("error" in result) return result.error;
    const { project } = result;
    const body = (await request.json()) as { userId?: string };
    if (!body.userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    await assignTeamMemberToProject(project.id, body.userId, actor.userId);

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "project.team_member_assigned",
      entityType: "project",
      entityId: project.id,
      metadata: { assignedUserId: body.userId, title: project.title },
    });

    // Notification hook (Phase 8, item 1): the new co-editor finds out they now have edit access.
    void notifyUser({
      userId: body.userId,
      prefKey: "teamActivity",
      subject: "You've been added as a co-editor on a proposal",
      bodyHtml: `<p>You've been added as a co-editor on the proposal <strong>${project.title}</strong>. You can now help manage it alongside the owner.</p>`,
    });

    const team = await fetchProjectTeamAssignments(project.id);
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["qualified"]);
    const { id } = await params;
    const result = await requireOwnedProject(id, actor.userId);
    if ("error" in result) return result.error;
    const { project } = result;
    const body = (await request.json().catch(() => ({}))) as { userId?: string };
    if (!body.userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    await removeTeamAssignment(project.id, body.userId);

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "project.team_member_removed",
      entityType: "project",
      entityId: project.id,
      metadata: { removedUserId: body.userId, title: project.title },
    });

    // Notification hook (Phase 8, item 1): the removed co-editor finds out their edit access on
    // this proposal was revoked.
    void notifyUser({
      userId: body.userId,
      prefKey: "teamActivity",
      subject: "You've been removed as co-editor on a proposal",
      bodyHtml: `<p>You're no longer a co-editor on the proposal <strong>${project.title}</strong>.</p>`,
    });

    const team = await fetchProjectTeamAssignments(project.id);
    return NextResponse.json(team);
  } catch (error) {
    return handleRouteError(error);
  }
}
