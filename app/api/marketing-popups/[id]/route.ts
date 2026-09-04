import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { deleteMarketingPopup, updateMarketingPopup } from "@/lib/db/queries/marketing-popups";

type RouteParams = { params: Promise<{ id: string }> };

interface PatchBody {
  title?: string;
  body?: string;
  subtext?: string | null;
  imageUrl?: string | null;
  linkHref?: string | null;
  linkLabel?: string | null;
  priority?: number;
  startsAt?: string;
  endsAt?: string | null;
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
    if (body.subtext !== undefined) updates.subtext = body.subtext?.trim() || null;
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl?.trim() || null;
    if (body.linkHref !== undefined) updates.linkHref = body.linkHref?.trim() || null;
    if (body.linkLabel !== undefined) updates.linkLabel = body.linkLabel?.trim() || null;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.startsAt !== undefined) updates.startsAt = new Date(body.startsAt);
    if (body.endsAt !== undefined) updates.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (body.status !== undefined) updates.status = body.status;

    const updated = await updateMarketingPopup(id, updates);
    if (!updated) return NextResponse.json({ error: "Popup not found" }, { status: 404 });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "marketing_popup.updated",
      entityType: "marketing_popup",
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
    const ok = await deleteMarketingPopup(id);
    if (!ok) return NextResponse.json({ error: "Popup not found" }, { status: 404 });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "marketing_popup.deleted",
      entityType: "marketing_popup",
      entityId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
