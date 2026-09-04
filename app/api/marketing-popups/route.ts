import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/db/queries/audit";
import {
  createMarketingPopup,
  fetchActiveMarketingPopups,
  fetchAllMarketingPopups,
} from "@/lib/db/queries/marketing-popups";

/**
 * GET /api/marketing-popups — public callers get currently-active, in-window popups.
 * Super Admin can request the full management list with `?all=1`.
 */
export async function GET(request: Request) {
  try {
    const wantAll = new URL(request.url).searchParams.get("all") === "1";
    if (wantAll) {
      await requireRole(["super_admin"]);
      return NextResponse.json(await fetchAllMarketingPopups());
    }
    return NextResponse.json(await fetchActiveMarketingPopups());
  } catch (error) {
    return handleRouteError(error);
  }
}

interface CreateBody {
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

export async function POST(request: Request) {
  try {
    const actor = await requireRole(["super_admin"]);
    const body = (await request.json()) as CreateBody;
    if (!body.title?.trim() || !body.body?.trim()) {
      return NextResponse.json({ error: "Title and text are required." }, { status: 400 });
    }

    const created = await createMarketingPopup({
      title: body.title.trim(),
      body: body.body.trim(),
      subtext: body.subtext?.trim() || null,
      imageUrl: body.imageUrl?.trim() || null,
      linkHref: body.linkHref?.trim() || null,
      linkLabel: body.linkLabel?.trim() || null,
      priority: body.priority ?? 0,
      startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      status: body.status ?? "draft",
      createdBy: actor.name ?? actor.userId,
    });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "marketing_popup.created",
      entityType: "marketing_popup",
      entityId: created.id,
      metadata: { title: created.title, status: created.status },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
