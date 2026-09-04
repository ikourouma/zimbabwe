import { NextResponse } from "next/server";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { mapDbEngagementToApp } from "@/lib/db/mappers/engagement";
import { db } from "@/lib/db/client";
import { engagementMous, investorEngagements } from "@/lib/db/schema";
import { fetchAllProjects, resolveProjectDbId } from "@/lib/db/queries/projects";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import type { InvestorEngagement } from "@/lib/types";

export async function GET(request: Request) {
  try {
    // ministry_admin (Platform Feedback Batch v3, Phase 8) gets a dedicated MOU registry scoped to
    // their own ministry's projects — see the in-JS filter below (a ministry_admin has no direct
    // `userId`/`assignedUserId` link on the engagement row itself, unlike `qualified`, so this can't
    // be expressed as a SQL WHERE the way the qualified-investor scoping below is).
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    // Deleted rows are the credibility audit trail — only super_admin can pull them back (e.g. for
    // an investor's full engagement history), and only explicitly, never in the default list.
    const includeDeleted = actor.role === "super_admin" && url.searchParams.get("includeDeleted") === "true";

    // Confidentiality scoping (Fortune-100 deal-room norm — Salesforce/Intralinks/Ansarada/
    // DealCloud all wall a counterparty off from other counterparties' deals): a qualified
    // investor may only ever see their own engagements, never another investor's identity,
    // notes, or status. ZIDA/Admin/Government own the process end-to-end and keep full visibility.
    const conditions: SQL[] = [];
    if (!includeDeleted) conditions.push(isNull(investorEngagements.deletedAt));
    if (!includeArchived) conditions.push(isNull(investorEngagements.archivedAt));
    // A validated org teammate assigned as this engagement's Delegate (Team Ministry Traceability
    // Batch, Phase 5) sees it in their own list too — same "assignment grants full visibility"
    // pattern as project_team_assignments' co-editor grant, never exclusive of the owner's own.
    if (actor.role === "qualified")
      conditions.push(
        or(eq(investorEngagements.userId, actor.userId), eq(investorEngagements.assignedUserId, actor.userId))!
      );

    const rows = await db
      .select()
      .from(investorEngagements)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(investorEngagements.createdAt));

    let engagements = rows.map(mapDbEngagementToApp);

    // Denormalize MOU lifecycle stage onto each row (Phase 8) — one extra indexed query rather
    // than N+1 per-engagement MOU fetches, powering the new MOU registry's status pills/filter.
    if (engagements.length > 0) {
      const mouRows = await db
        .select({ engagementId: engagementMous.engagementId, status: engagementMous.status })
        .from(engagementMous)
        .where(inArray(engagementMous.engagementId, engagements.map((e) => e.id)));
      const mouStatusById = new Map(mouRows.map((m) => [m.engagementId, m.status]));
      engagements = engagements.map((e) => ({ ...e, mouStatus: mouStatusById.get(e.id) ?? null }));
    }

    if (actor.role === "ministry_admin") {
      if (!actor.ministryId) return NextResponse.json([]);
      const projects = await fetchAllProjects();
      const projectById = new Map(projects.map((p) => [p.id, p]));
      engagements = engagements.filter((e) => {
        const project = projectById.get(e.projectId);
        return project ? projectMatchesMinistry(project, actor.ministryId!) : false;
      });
    }

    return NextResponse.json(engagements);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole(["admin", "super_admin", "qualified"]);
    const body = (await request.json()) as Omit<InvestorEngagement, "id" | "createdAt" | "updatedAt">;
    const projectId = await resolveProjectDbId(body.projectId);
    if (!projectId) return NextResponse.json({ error: "Project not found" }, { status: 400 });

    // A qualified investor self-initiating always links the engagement to their own account —
    // never lets the client attribute a self-service submission to someone else's userId.
    const userId = actor.role === "qualified" ? actor.userId : body.userId ?? null;

    // Investors always start in `draft` and publish (lock) separately via PATCH — never straight
    // to `submitted` at creation (the Draft-Lock immutability model). Staff may log an engagement
    // directly at any status on an investor's behalf.
    const status = actor.role === "qualified" ? "draft" : body.status ?? "submitted";

    const [inserted] = await db
      .insert(investorEngagements)
      .values({
        projectId,
        investorName: body.investorName,
        investorOrganization: body.investorOrganization ?? null,
        userId,
        status,
        notes: body.notes ?? null,
        ticketSize: body.ticketSize ?? null,
        signatoryTitle: body.signatoryTitle ?? null,
      })
      .returning();

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "engagement.created",
      entityType: "engagement",
      entityId: inserted.id,
      metadata: { investorName: inserted.investorName, projectId, status },
    });

    return NextResponse.json(mapDbEngagementToApp(inserted), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
