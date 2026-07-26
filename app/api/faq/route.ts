import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { createFaqEntry, fetchFaqEntries } from "@/lib/db/queries/content";
import { logAuditEvent } from "@/lib/db/queries/audit";

/** GET /api/faq — public, active entries only by default. `?all=true` (super_admin only)
 *  additionally returns archived entries, for the Settings → Page Content manager. */
export async function GET(request: Request) {
  try {
    const wantsAll = new URL(request.url).searchParams.get("all") === "true";
    let includeArchived = false;
    if (wantsAll) {
      const actor = await requireRole(["super_admin"]).catch(() => null);
      includeArchived = Boolean(actor);
    }
    const entries = await fetchFaqEntries(includeArchived);
    return NextResponse.json(entries);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/faq — super_admin only. Creates a new FAQ entry (Phase 1 marketing CMS). */
export async function POST(request: Request) {
  try {
    const actor = await requireRole(["super_admin"]);
    const body = (await request.json()) as { category?: string; question?: string; answer?: string; sortOrder?: number };
    const category = (body.category ?? "").trim();
    const question = (body.question ?? "").trim();
    const answer = (body.answer ?? "").trim();
    if (!category || !question || !answer) {
      return NextResponse.json({ error: "Category, question, and answer are all required." }, { status: 400 });
    }

    const entry = await createFaqEntry({ category, question, answer, sortOrder: body.sortOrder });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "faq.created",
      entityType: "faq_entry",
      entityId: entry.id,
      metadata: { category, question },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
