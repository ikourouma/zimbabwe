import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { isR2Configured, putObject } from "@/lib/storage/r2";
import { logAuditEvent } from "@/lib/db/queries/audit";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * POST /api/account/avatar (multipart) — uploads the signed-in user's own avatar image to R2 and
 * stores the object key on their profile. Any authenticated role. Reuses the same R2 adapter as
 * Communication Hub attachments; the image is served back (private) via GET /api/avatars/[userId].
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });

    if (!isR2Configured()) {
      return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image exceeds the 5 MB limit" }, { status: 413 });
    }

    const contentType = file.type || "application/octet-stream";
    const ext = EXT_BY_TYPE[contentType];
    if (!ext) {
      return NextResponse.json({ error: "Use a PNG, JPEG, WebP, or GIF image" }, { status: 415 });
    }

    const storageKey = `avatars/${user.userId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await putObject(storageKey, buffer, contentType);
    } catch (storageError) {
      console.error("R2 putObject (avatar) failed", storageError);
      const name = storageError instanceof Error ? storageError.name : "";
      const message =
        name === "AccessDenied"
          ? "File storage rejected the upload (the R2 token needs Object Read & Write access)."
          : "Could not store the image. Please try again.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    await db
      .update(profiles)
      .set({ avatarKey: storageKey, updatedAt: new Date() })
      .where(eq(profiles.userId, user.userId));

    await logAuditEvent({
      actorUserId: user.userId,
      actorName: user.name,
      action: "user.avatar_updated",
      entityType: "user",
      entityId: user.userId,
      metadata: { storageKey },
    });

    return NextResponse.json({ avatarKey: storageKey });
  } catch (error) {
    return handleRouteError(error);
  }
}
