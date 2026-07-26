import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { deleteFaqEntry, updateFaqEntry } from "@/lib/db/queries/content";
import { logAuditEvent } from "@/lib/db/queries/audit";

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/faq/[id] — super_admin only. Edits fields and/or toggles active/archived status. */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["super_admin"]);
    const { id } = await params;
    const body = (await request.json()) as {
      category?: string;
      question?: string;
      answer?: string;
      sortOrder?: number;
      status?: "active" | "archived";
    };

    const updated = await updateFaqEntry(id, body);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "faq.updated",
      entityType: "faq_entry",
      entityId: id,
      metadata: body,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/faq/[id] — super_admin only. FAQ entries are pure content with no downstream
 *  references, so a hard delete is safe (unlike taxonomies, which guard against orphaning linked
 *  projects) — "Archive" (via PATCH status) remains the reversible option for most edits. */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["super_admin"]);
    const { id } = await params;
    await deleteFaqEntry(id);

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "faq.deleted",
      entityType: "faq_entry",
      entityId: id,
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
