import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchMyAnalytics } from "@/lib/db/queries/platform-stats";

/** GET /api/me/analytics — the caller's own accurate activity counters (saved projects,
 *  engagements, document downloads/previews, messages sent) for the Investor Dashboard's "My
 *  Analytics" snapshot card. Any authenticated role; strictly self-scoped. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    const analytics = await fetchMyAnalytics(user.userId);
    return NextResponse.json(analytics);
  } catch (error) {
    return handleRouteError(error);
  }
}
