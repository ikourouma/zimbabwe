import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { mapDbEngagementToApp } from "@/lib/db/mappers/engagement";
import { db } from "@/lib/db/client";
import { investorEngagements } from "@/lib/db/schema";
import { resolveProjectDbId } from "@/lib/db/queries/projects";
import { logAuditEvent } from "@/lib/db/queries/audit";
import type { InvestorEngagement } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified"]);
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
    if (actor.role === "qualified") conditions.push(eq(investorEngagements.userId, actor.userId));

    const rows = await db
      .select()
      .from(investorEngagements)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(investorEngagements.createdAt));

    return NextResponse.json(rows.map(mapDbEngagementToApp));
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
