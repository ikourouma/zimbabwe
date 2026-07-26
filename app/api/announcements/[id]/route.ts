import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { deleteAnnouncement, updateAnnouncement } from "@/lib/db/queries/announcements";

type RouteParams = { params: Promise<{ id: string }> };

interface PatchBody {
  title?: string;
  body?: string;
  audienceRole?: string;
  style?: string;
  priority?: number;
  startsAt?: string;
  endsAt?: string | null;
  dismissable?: boolean;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  status?: string;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["super_admin"]);
    const { id } = await params;
    const body = (await request.json()) as PatchBody;

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.body !== undefined) updates.body = body.body.trim();
    if (body.audienceRole !== undefined) updates.audienceRole = body.audienceRole;
    if (body.style !== undefined) updates.style = body.style;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.startsAt !== undefined) updates.startsAt = new Date(body.startsAt);
    if (body.endsAt !== undefined) updates.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (body.dismissable !== undefined) updates.dismissable = body.dismissable;
    if (body.ctaLabel !== undefined) updates.ctaLabel = body.ctaLabel || null;
    if (body.ctaHref !== undefined) updates.ctaHref = body.ctaHref || null;
    if (body.status !== undefined) updates.status = body.status;

    const updated = await updateAnnouncement(id, updates);
    if (!updated) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "announcement.updated",
      entityType: "announcement",
      entityId: id,
      metadata: { title: updated.title, status: updated.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["super_admin"]);
    const { id } = await params;
    const ok = await deleteAnnouncement(id);
    if (!ok) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "announcement.deleted",
      entityType: "announcement",
      entityId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
