import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { getSignedDownloadUrl, isR2Configured } from "@/lib/storage/r2";

type RouteParams = { params: Promise<{ userId: string }> };

/**
 * GET /api/avatars/[userId] — public avatar image endpoint. Redirects to a fresh short-lived signed
 * R2 URL so the object itself stays private. 404 when the user has no avatar so the client can fall
 * back to the computed initials badge. Public (an avatar image is low-sensitivity, like Gravatar).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await params;
  if (!isR2Configured()) return new NextResponse(null, { status: 404 });

  const [profile] = await db
    .select({ avatarKey: profiles.avatarKey })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (!profile?.avatarKey) return new NextResponse(null, { status: 404 });

  try {
    const url = await getSignedDownloadUrl(profile.avatarKey, undefined, 3600);
    return NextResponse.redirect(url, 307);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
