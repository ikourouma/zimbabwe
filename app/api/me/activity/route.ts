import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchAuditLogsByActor } from "@/lib/db/queries/audit";

/**
 * GET /api/me/activity — the caller's own recent audit trail, for the Investor Dashboard's
 * Recent Activity panel. Unlike GET /api/audit-logs (staff-only, platform-wide), this is safe for
 * any authenticated role since it's strictly scoped to the requester's own actions
 * (`fetchAuditLogsByActor`), same data already used in the Institutional Compliance Dossier.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    const logs = await fetchAuditLogsByActor(user.userId, 25);
    // fetchAuditLogsByActor always returns actorName: null (it doesn't join the actor's own
    // profile) — since every row here is guaranteed to be the caller's own action, "You" reads
    // far better in ActivityFeed than the generic "Someone" fallback.
    return NextResponse.json(logs.map((entry) => ({ ...entry, actorName: "You" })));
  } catch (error) {
    return handleRouteError(error);
  }
}
