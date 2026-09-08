import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchAuditLogs, fetchAuditLogsByActor, fetchAuditLogsForMinistry } from "@/lib/db/queries/audit";

/**
 * GET /api/me/activity — the Recent Activity panel on the Deal Room overview.
 *
 * Scoped by remit rather than by authorship, on the same reasoning the personal Activity Report
 * uses. An investor's own actions are the right answer for an investor, because transacting is what
 * they do here. A Government Reviewer does not author engagements — they assess other people's —
 * so scoping their panel to their own clicks left the national console reading "No recent activity
 * yet" beside its own counters reporting thirty-seven projects and ten engagements, while a single
 * ministry desk showed seven entries. That inverts the hierarchy of oversight on the page a
 * reviewer lands on.
 *
 * The scopes below are exactly those GET /api/audit-logs already grants each role, so this widens
 * no one's visibility; it only stops the Deal Room asking the narrower question of readers for whom
 * the narrow answer is empty by definition.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });

    if (user.role === "government" || user.role === "admin" || user.role === "super_admin") {
      return NextResponse.json(await fetchAuditLogs(25));
    }

    if (user.role === "ministry_admin") {
      return NextResponse.json(user.ministryId ? await fetchAuditLogsForMinistry(user.ministryId, 25) : []);
    }

    const logs = await fetchAuditLogsByActor(user.userId, 25);
    // fetchAuditLogsByActor always returns actorName: null (it doesn't join the actor's own
    // profile) — since every row here is guaranteed to be the caller's own action, "You" reads
    // far better in ActivityFeed than the generic "Someone" fallback. The branches above must not
    // do this: those rows are other people's acts and have to keep their own names.
    return NextResponse.json(logs.map((entry) => ({ ...entry, actorName: "You" })));
  } catch (error) {
    return handleRouteError(error);
  }
}
