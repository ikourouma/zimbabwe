import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/db/queries/audit";

interface Body {
  from: string;
  to: string;
}

/**
 * POST /api/account/profile — records a `user.profile_updated` audit row after the client-side
 * Better Auth `authClient.updateUser({ name })` call succeeds. Better Auth manages the name mutation
 * itself (outside our Drizzle schema), so this exists purely to keep the change in our audit trail
 * and the per-user Activity feed. Self-only; never mutates another account.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });

    const { from, to } = (await request.json()) as Body;
    await logAuditEvent({
      actorUserId: user.userId,
      actorName: user.name,
      action: "user.profile_updated",
      entityType: "user",
      entityId: user.userId,
      metadata: { field: "name", from: from ?? null, to: to ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
