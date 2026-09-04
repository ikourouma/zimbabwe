import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { isR2Configured, putObject } from "@/lib/storage/r2";

type RouteParams = { params: Promise<{ id: string }> };

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

// Conservative allowlist for a data room — documents, common images, spreadsheets, archives.
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
]);

/**
 * POST /api/projects/[id]/messages/attachments (multipart) — uploads one file to R2 and returns a
 * reference the client then passes to the message POST. Kept as a separate step from message
 * creation so the composer can show upload progress / pending chips before sending. Access is the
 * same Communication Hub role set; per-message read enforcement happens on download
 * (GET /api/attachments/[id]).
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!isR2Configured()) {
      return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds the 25 MB limit" }, { status: 413 });
    }
    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "file";
    const storageKey = `messages/${project.id}/${actor.userId}/${randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await putObject(storageKey, buffer, contentType);
    } catch (storageError) {
      // Distinguish a storage-provider rejection (e.g. a read-only R2 token) from a real bug so the
      // composer can show an actionable message instead of a generic 500.
      console.error("R2 putObject failed", storageError);
      const name = storageError instanceof Error ? storageError.name : "";
      const message =
        name === "AccessDenied"
          ? "File storage rejected the upload (the R2 token needs Object Read & Write access)."
          : "Could not store the file. Please try again.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json({
      storageKey,
      fileName: file.name,
      contentType,
      size: file.size,
      uploadedBy: actor.userId,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
