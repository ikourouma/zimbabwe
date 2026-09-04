import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { accessLevelForRole, canAccessVisibilityLevel } from "@/lib/entitlements/visibility";
import { NDA_REQUIRED_MESSAGE, requiresNdaAcceptance } from "@/lib/governance/nda";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { getSignedDownloadUrl, isR2Configured, objectExists } from "@/lib/storage/r2";
import { db } from "@/lib/db/client";
import { projectDocuments } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";

type RouteParams = { params: Promise<{ id: string; docId: string }> };

/**
 * GET /api/projects/[id]/documents/[docId]/download — re-checks the caller's role against the
 * document's `visibilityLevel` (same rank model as the project registry's own gating), plus the
 * Sovereign Confidentiality Framework NDA clickwrap for qualified-tier documents, before
 * 302-redirecting to a short-lived signed R2 URL. Never exposes the raw storage key.
 *
 * `?mode=preview` requests an inline-disposition URL (renders in-tab) and logs a distinct
 * `document.previewed` event instead of `document.downloaded` — the lightweight, real VDR-preview
 * telemetry signal (no watermarking pipeline yet — see BACKLOG.md).
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const isPreview = new URL(request.url).searchParams.get("mode") === "preview";
    const { id, docId } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [doc] = await db
      .select()
      .from(projectDocuments)
      .where(and(eq(projectDocuments.id, docId), eq(projectDocuments.projectId, project.id)))
      .limit(1);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const user = await getCurrentUser();
    const isStaff = user?.role === "admin" || user?.role === "super_admin";

    if (!isStaff) {
      const level = accessLevelForRole(user?.role ?? null);
      if (!canAccessVisibilityLevel(level, doc.visibilityLevel)) {
        return NextResponse.json({ error: "You do not have access to this document." }, { status: 403 });
      }
      // Deal Room documents gated at qualified-investor tier also require the clickwrap NDA
      // acceptance, mirroring the Deal Room data room's own gate.
      if (doc.visibilityLevel === "qualified_investor" && user && requiresNdaAcceptance(user.role) && !user.ndaAcceptedAt) {
        return NextResponse.json({ error: NDA_REQUIRED_MESSAGE }, { status: 403 });
      }
    }

    if (!isR2Configured()) {
      return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
    }

    const exists = await objectExists(doc.storageKey);
    if (!exists) {
      return NextResponse.json(
        { error: "This file is not available in this environment." },
        { status: 404 }
      );
    }

    const url = await getSignedDownloadUrl(
      doc.storageKey,
      doc.fileName ?? doc.title,
      300,
      isPreview ? "inline" : "attachment"
    );

    // Real (never-faked) telemetry for the Government Executive Report's "Document Downloads"
    // tile — fire-and-log, never blocks the redirect. Starts at 0 and only grows from genuine
    // investor/staff activity; the report hides the tile entirely while the count is 0.
    void logAuditEvent({
      actorUserId: user?.userId ?? null,
      actorName: user?.name ?? null,
      action: isPreview ? "document.previewed" : "document.downloaded",
      entityType: "project_document",
      entityId: doc.id,
      metadata: { projectId: project.id, title: doc.title },
    });

    return NextResponse.redirect(url, 302);
  } catch (error) {
    return handleRouteError(error);
  }
}
