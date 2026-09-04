import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { getSignedDownloadUrl, isR2Configured, putObject } from "@/lib/storage/r2";
import { logAuditEvent } from "@/lib/db/queries/audit";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/**
 * My Profile document vault (Deal Room Feedback Batch v2, Phase 2) — a single business
 * registration certificate per user, reusing the exact private-object pattern already
 * established for avatars (`/api/account/avatar`, `/api/avatars/[userId]`), just with a
 * short-lived signed URL instead of a public redirect since this is a real compliance artifact.
 */

/** GET — self-only: redirects to a fresh short-lived signed URL for the caller's own uploaded
 *  business registration document, or 404 if none uploaded yet. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
    if (!user.businessRegistrationDocKey) return NextResponse.json({ error: "No document uploaded" }, { status: 404 });
    if (!isR2Configured()) return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });

    const url = await getSignedDownloadUrl(user.businessRegistrationDocKey, "business-registration", 300, "inline");
    return NextResponse.redirect(url, 307);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST (multipart) — uploads/replaces the caller's own business registration document. */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
    if (!isR2Configured()) return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds the 10 MB limit" }, { status: 413 });

    const contentType = file.type || "application/octet-stream";
    const ext = EXT_BY_TYPE[contentType];
    if (!ext) return NextResponse.json({ error: "Use a PDF, Word document, PNG, JPEG, or WebP scan" }, { status: 415 });

    const storageKey = `company-documents/${user.userId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await putObject(storageKey, buffer, contentType);
    } catch (storageError) {
      console.error("R2 putObject (company document) failed", storageError);
      return NextResponse.json({ error: "Could not store the document. Please try again." }, { status: 502 });
    }

    await db
      .update(profiles)
      .set({ businessRegistrationDocKey: storageKey, updatedAt: new Date() })
      .where(eq(profiles.userId, user.userId));

    await logAuditEvent({
      actorUserId: user.userId,
      actorName: user.name,
      action: "user.company_document_uploaded",
      entityType: "user",
      entityId: user.userId,
      metadata: { storageKey },
    });

    return NextResponse.json({ businessRegistrationDocKey: storageKey });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE — clears the reference (object left in R2 for audit purposes, same as other vault
 *  deletions in this codebase — nothing here re-derives a "documents deleted" retention job). */
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });

    await db
      .update(profiles)
      .set({ businessRegistrationDocKey: null, updatedAt: new Date() })
      .where(eq(profiles.userId, user.userId));

    await logAuditEvent({
      actorUserId: user.userId,
      actorName: user.name,
      action: "user.company_document_removed",
      entityType: "user",
      entityId: user.userId,
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
