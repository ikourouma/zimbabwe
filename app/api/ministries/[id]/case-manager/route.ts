import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { countProjectsInheritingMinistryDefault, setMinistryCaseManager } from "@/lib/db/queries/taxonomies";
import { fetchCaseManagerCandidates } from "@/lib/db/queries/users";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { notifyUser } from "@/lib/email/notify";
import { db } from "@/lib/db/client";
import { ministries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Sets a ministry's default ZIDA Case Manager (Team Ministry Traceability Batch, Phase 2, item
 * 6) — deliberately its own `admin`+`super_admin` endpoint rather than folded into the
 * super_admin-only `PATCH /api/taxonomies` (see the plan's "entitlement parity" note): a ZIDA
 * console admin manages ministry desk officers day-to-day, so this one field can't live behind
 * the full Taxonomies-CRUD boundary the rest of the Ministries table sits behind.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const body = (await request.json()) as { staffUserId?: string | null };

    if (body.staffUserId) {
      const candidates = await fetchCaseManagerCandidates();
      if (!candidates.some((c) => c.userId === body.staffUserId)) {
        return NextResponse.json({ error: "That user is not an active admin/super_admin account." }, { status: 400 });
      }
    }

    await setMinistryCaseManager(id, body.staffUserId ?? null);

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "ministry.case_manager_assigned",
      entityType: "ministry",
      entityId: id,
      metadata: { staffUserId: body.staffUserId ?? null },
    });

    // Notification hook (Phase 8, item 1): the newly-designated Case Manager finds out they now
    // own this ministry's desk by default.
    if (body.staffUserId) {
      const [ministry] = await db.select({ name: ministries.name }).from(ministries).where(eq(ministries.id, id)).limit(1);
      void notifyUser({
        userId: body.staffUserId,
        prefKey: "teamActivity",
        subject: "You've been designated Case Manager for a ministry",
        bodyHtml: `<p>You're now the default ZIDA Case Manager for <strong>${ministry?.name ?? "a ministry"}</strong> — every one of its projects without a specific override will route through you.</p>`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** How many projects currently fall back to this ministry's default (no per-project override) —
 *  powers the Phase 8 safe-handoff confirmation before changing the default. */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const inheritingCount = await countProjectsInheritingMinistryDefault(id);
    return NextResponse.json({ inheritingCount });
  } catch (error) {
    return handleRouteError(error);
  }
}
