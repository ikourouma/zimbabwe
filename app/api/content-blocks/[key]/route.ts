import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchContentBlock, upsertContentBlock } from "@/lib/db/queries/content";
import { logAuditEvent } from "@/lib/db/queries/audit";

type RouteParams = { params: Promise<{ key: string }> };

/** GET /api/content-blocks/[key] — public. Powers the home hero + About-page CMS overrides
 *  (Phase 1 marketing CMS); the consuming page falls back to its hardcoded/i18n default when this
 *  returns 404 (no row yet) or an empty body. */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { key } = await params;
    const block = await fetchContentBlock(key);
    if (!block) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(block);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** PATCH /api/content-blocks/[key] — super_admin only. Upserts the block's JSON body. */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["super_admin"]);
    const { key } = await params;
    const body = (await request.json()) as { body?: unknown };
    if (body.body === undefined) {
      return NextResponse.json({ error: "A body payload is required." }, { status: 400 });
    }

    const block = await upsertContentBlock(key, body.body, actor.userId);

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "content_block.updated",
      entityType: "site_content_block",
      entityId: key,
      metadata: { key },
    });

    return NextResponse.json(block);
  } catch (error) {
    return handleRouteError(error);
  }
}
