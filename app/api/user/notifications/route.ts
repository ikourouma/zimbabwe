import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from "@/lib/types";

const ALL_ROLES = ["registered", "qualified", "government", "admin", "super_admin"] as const;

/**
 * PATCH /api/user/notifications — persist the signed-in user's notification preferences to
 * profiles.notificationPrefs (Account & Security suite). Any authenticated role may set their own;
 * this is self-service only (no target user id). Upserts the profile row if one doesn't exist yet.
 */
export async function PATCH(request: Request) {
  try {
    const actor = await requireRole([...ALL_ROLES]);
    const body = (await request.json()) as Partial<NotificationPreferences>;

    // Merge onto current server value (defaults if unset) — only accept the known boolean keys.
    const current = actor.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFERENCES;
    const next: NotificationPreferences = {
      engagementUpdates:
        typeof body.engagementUpdates === "boolean" ? body.engagementUpdates : current.engagementUpdates,
      newMessages: typeof body.newMessages === "boolean" ? body.newMessages : current.newMessages,
      mouActivity: typeof body.mouActivity === "boolean" ? body.mouActivity : current.mouActivity,
    };

    await db
      .insert(profiles)
      .values({ userId: actor.userId, role: actor.role, notificationPrefs: next })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { notificationPrefs: next, updatedAt: new Date() },
      });

    return NextResponse.json(next);
  } catch (error) {
    return handleRouteError(error);
  }
}
