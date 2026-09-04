import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { generateTotpSecret, totpUri, verifyTotp } from "@/lib/auth/totp";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
    const [row] = await db.select({ mfaEnabled: profiles.mfaEnabled }).from(profiles).where(eq(profiles.userId, user.userId)).limit(1);
    return NextResponse.json({ enabled: row?.mfaEnabled ?? false });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as { action?: string; token?: string };

    if (body.action === "start") {
      const secret = generateTotpSecret();
      await db.update(profiles).set({ mfaSecret: secret, mfaEnabled: false, updatedAt: new Date() }).where(eq(profiles.userId, user.userId));
      return NextResponse.json({ secret, uri: totpUri(secret, user.email) });
    }

    if (body.action === "confirm") {
      const [row] = await db.select({ mfaSecret: profiles.mfaSecret }).from(profiles).where(eq(profiles.userId, user.userId)).limit(1);
      if (!row?.mfaSecret || !body.token || !verifyTotp(row.mfaSecret, body.token)) {
        return NextResponse.json({ error: "Invalid authenticator code." }, { status: 400 });
      }
      await db.update(profiles).set({ mfaEnabled: true, updatedAt: new Date() }).where(eq(profiles.userId, user.userId));
      await logAuditEvent({
        actorUserId: user.userId,
        actorName: user.name,
        action: "user.mfa_enabled",
        entityType: "user",
        entityId: user.userId,
        metadata: {},
      });
      return NextResponse.json({ enabled: true });
    }

    if (body.action === "disable") {
      const [row] = await db.select({ mfaSecret: profiles.mfaSecret, mfaEnabled: profiles.mfaEnabled }).from(profiles).where(eq(profiles.userId, user.userId)).limit(1);
      if (row?.mfaEnabled && (!body.token || !row.mfaSecret || !verifyTotp(row.mfaSecret, body.token))) {
        return NextResponse.json({ error: "Invalid authenticator code." }, { status: 400 });
      }
      await db.update(profiles).set({ mfaEnabled: false, mfaSecret: null, updatedAt: new Date() }).where(eq(profiles.userId, user.userId));
      await logAuditEvent({
        actorUserId: user.userId,
        actorName: user.name,
        action: "user.mfa_disabled",
        entityType: "user",
        entityId: user.userId,
        metadata: {},
      });
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return handleRouteError(error);
  }
}
