import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { mapAppProjectToDbRow } from "@/lib/db/mappers/project";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { fetchAllProjects, fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { logAuditEvent } from "@/lib/db/queries/audit";
import type { InvestmentProject, ProjectStatus, VisibilityLevel } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

const REASON_CODES = [
  "Regulatory Compliance Clearance",
  "Executive/Ministerial Directive",
  "Emergency Retraction",
  "Administrative QA Correction",
] as const;

interface OverrideBody {
  status: ProjectStatus;
  visibility: VisibilityLevel;
  reasonCode: string;
  referenceId: string;
  justificationNote: string;
  confirmTitle: string;
}

/**
 * Sovereign Circuit Breaker — a Super-Admin-only forced status/visibility override that
 * deliberately bypasses the normal workflow state machine. Kept as its own endpoint (not the
 * general project PATCH) so every override is unambiguously auditable as `project.override_applied`
 * and always carries a mandatory reason code, authorization reference, and free-text justification.
 * A type-to-confirm title match is required as a real (no-fake-2FA) safety interlock.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["super_admin"]);
    const { id } = await params;
    const existing = await fetchProjectByIdOrSlug(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await request.json()) as OverrideBody;
    const reasonCode = (body.reasonCode ?? "").trim();
    const referenceId = (body.referenceId ?? "").trim();
    const justificationNote = (body.justificationNote ?? "").trim();

    if (!REASON_CODES.includes(reasonCode as (typeof REASON_CODES)[number])) {
      return NextResponse.json({ error: "A valid override reason code is required" }, { status: 400 });
    }
    if (!referenceId || !justificationNote) {
      return NextResponse.json(
        { error: "Authorization reference and justification note are required" },
        { status: 400 }
      );
    }
    if ((body.confirmTitle ?? "").trim().toLowerCase() !== existing.title.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "Confirmation title does not match the project title" },
        { status: 400 }
      );
    }

    const from = { status: existing.projectStatus, visibility: existing.visibilityLevel };
    const to = { status: body.status, visibility: body.visibility };

    const merged: InvestmentProject = {
      ...existing,
      projectStatus: body.status,
      visibilityLevel: body.visibility,
      id: existing.id,
    };

    const row = mapAppProjectToDbRow(merged);
    await db.update(projects).set({ ...row, updatedAt: new Date() }).where(eq(projects.id, existing.id));

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "project.override_applied",
      entityType: "project",
      entityId: existing.id,
      metadata: { from, to, reasonCode, referenceId, justificationNote, title: existing.title },
    });

    const all = await fetchAllProjects();
    return NextResponse.json(all.find((p) => p.id === existing.id));
  } catch (error) {
    return handleRouteError(error);
  }
}
