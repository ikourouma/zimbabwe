import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser, requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { accreditationDocuments } from "@/lib/db/schema";
import { getSignedDownloadUrl, isR2Configured, putObject } from "@/lib/storage/r2";
import { logAuditEvent } from "@/lib/db/queries/audit";

const KINDS = ["commitment_letter", "investment_guarantee"] as const;
const EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
    const targetId = new URL(request.url).searchParams.get("userId") ?? user.userId;
    if (targetId !== user.userId && !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await db
      .select()
      .from(accreditationDocuments)
      .where(eq(accreditationDocuments.userId, targetId))
      .orderBy(desc(accreditationDocuments.createdAt));
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        fileName: r.fileName,
        status: r.status,
        reviewNotes: r.reviewNotes,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
    if (!isR2Configured()) return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });

    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");
    if (!KINDS.includes(kind as (typeof KINDS)[number])) {
      return NextResponse.json({ error: "Unknown document kind." }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    const ext = EXT_BY_TYPE[file.type];
    if (!ext) return NextResponse.json({ error: "Use a PDF, Word document, PNG, JPEG, or WebP scan" }, { status: 415 });

    const storageKey = `accreditation/${user.userId}/${kind}/${randomUUID()}.${ext}`;
    await putObject(storageKey, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");

    const [inserted] = await db
      .insert(accreditationDocuments)
      .values({
        userId: user.userId,
        kind: kind as (typeof KINDS)[number],
        storageKey,
        fileName: file.name,
        status: "pending",
      })
      .returning();

    await logAuditEvent({
      actorUserId: user.userId,
      actorName: user.name,
      action: "user.accreditation_uploaded",
      entityType: "user",
      entityId: user.userId,
      metadata: { kind, id: inserted.id },
    });

    return NextResponse.json({ id: inserted.id, kind: inserted.kind, status: inserted.status, fileName: inserted.fileName }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const body = (await request.json()) as { id?: string; decision?: "approved" | "declined"; notes?: string };
    if (!body.id || (body.decision !== "approved" && body.decision !== "declined")) {
      return NextResponse.json({ error: "id and decision are required." }, { status: 400 });
    }
    const [updated] = await db
      .update(accreditationDocuments)
      .set({
        status: body.decision,
        reviewNotes: body.notes?.trim() || null,
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
      })
      .where(eq(accreditationDocuments.id, body.id))
      .returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "user.accreditation_reviewed",
      entityType: "user",
      entityId: updated.userId,
      metadata: { id: updated.id, decision: body.decision },
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const [row] = await db.select().from(accreditationDocuments).where(eq(accreditationDocuments.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.userId !== user.userId && !user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isR2Configured()) return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
    const url = await getSignedDownloadUrl(row.storageKey, row.fileName, 300, "inline");
    return NextResponse.redirect(url, 307);
  } catch (error) {
    return handleRouteError(error);
  }
}
