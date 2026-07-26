import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { createAnnouncement, fetchActiveAnnouncements, fetchAllAnnouncements } from "@/lib/db/queries/announcements";

/**
 * GET returns announcements. Public callers (and any non-super-admin) get only the currently-active,
 * in-window set (audience filtering is applied client-side by role). Super admins can request the
 * full management list with `?all=1`.
 */
export async function GET(request: Request) {
  try {
    const wantAll = new URL(request.url).searchParams.get("all") === "1";
    if (wantAll) {
      await requireRole(["super_admin"]);
      return NextResponse.json(await fetchAllAnnouncements());
    }
    return NextResponse.json(await fetchActiveAnnouncements());
  } catch (error) {
    return handleRouteError(error);
  }
}

interface CreateBody {
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

export async function POST(request: Request) {
  try {
    const actor = await requireRole(["super_admin"]);
    const body = (await request.json()) as CreateBody;
    if (!body.title?.trim() || !body.body?.trim()) {
      return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
    }

    const created = await createAnnouncement({
      title: body.title.trim(),
      body: body.body.trim(),
      audienceRole: body.audienceRole ?? "all",
      style: body.style ?? "info",
      priority: body.priority ?? 0,
      startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      dismissable: body.dismissable ?? true,
      ctaLabel: body.ctaLabel ?? null,
      ctaHref: body.ctaHref ?? null,
      status: body.status ?? "active",
      createdBy: actor.name ?? actor.userId,
    });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "announcement.created",
      entityType: "announcement",
      entityId: created.id,
      metadata: { title: created.title, audienceRole: created.audienceRole, style: created.style },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
