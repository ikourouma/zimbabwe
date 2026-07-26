import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { isR2Configured, putObject } from "@/lib/storage/r2";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { db } from "@/lib/db/client";
import { projectDocuments } from "@/lib/db/schema";
import type { VisibilityLevel } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

// Same conservative data-room allowlist as the Communication Hub attachment route.
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

const VALID_VISIBILITY: VisibilityLevel[] = ["public", "registered", "qualified_investor"];

/**
 * POST /api/projects/[id]/documents (multipart, admin/super_admin) — uploads a real project
 * artifact to R2 and inserts a `project_documents` row. Replaces the old placeholder-title-only
 * flow (see lib/db/queries/projects.ts syncProjectRelations, kept for back-compat but no longer
 * driven by the project form). Downloads are gated separately (see [docId]/download/route.ts).
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
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

    const rawVisibility = form.get("visibilityLevel");
    const visibilityLevel: VisibilityLevel =
      typeof rawVisibility === "string" && VALID_VISIBILITY.includes(rawVisibility as VisibilityLevel)
        ? (rawVisibility as VisibilityLevel)
        : "qualified_investor";
    const rawTitle = form.get("title");
    const title = typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : file.name;

    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "file";
    const storageKey = `projects/${project.id}/${randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await putObject(storageKey, buffer, contentType);
    } catch (storageError) {
      console.error("R2 putObject failed", storageError);
      const name = storageError instanceof Error ? storageError.name : "";
      const message =
        name === "AccessDenied"
          ? "File storage rejected the upload (the R2 token needs Object Read & Write access)."
          : "Could not store the file. Please try again.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const [inserted] = await db
      .insert(projectDocuments)
      .values({
        projectId: project.id,
        title,
        storageKey,
        fileName: file.name,
        visibilityLevel,
        uploadedBy: actor.userId,
      })
      .returning();

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "project.document_uploaded",
      entityType: "project",
      entityId: project.id,
      metadata: { documentId: inserted.id, title, visibilityLevel, fileName: file.name },
    });

    return NextResponse.json(
      {
        id: inserted.id,
        title: inserted.title,
        visibilityLevel: inserted.visibilityLevel,
        fileName: inserted.fileName ?? inserted.title,
        createdAt: inserted.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
