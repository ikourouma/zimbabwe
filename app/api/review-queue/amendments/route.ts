import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchOpenActionCards } from "@/lib/db/queries/messages";

/**
 * GET /api/review-queue/amendments — still-pending `project_amendment_request` and
 * `ministry_association_request` Action Cards.
 * Admin/super_admin see every card platform-wide (Phase 7 Unified Review Queue). ministry_admin
 * (Phase 8) sees only government-filed cards from their own ministry that are still `"open"` —
 * that's the stage-1 decision they own; `"escalated"` cards have already left their desk.
 * Decision authority stays with POST /api/messages/[id]/action; this endpoint is read-only.
 */
export async function GET() {
  try {
    const actor = await requireRole(["admin", "super_admin", "ministry_admin"]);
    const cards = await fetchOpenActionCards(["project_amendment_request", "ministry_association_request"]);
    if (actor.role === "ministry_admin") {
      if (!actor.ministryId) return NextResponse.json([]);
      return NextResponse.json(
        cards.filter(
          (card) =>
            card.payload?.type === "project_amendment_request" &&
            card.authorRole === "government" &&
            card.payload?.status === "open" &&
            card.payload.requestingMinistryId === actor.ministryId
        )
      );
    }
    return NextResponse.json(cards);
  } catch (error) {
    return handleRouteError(error);
  }
}
