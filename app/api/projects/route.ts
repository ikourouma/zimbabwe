import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser, requireRole } from "@/lib/auth/session";
import { accessLevelForRole, sanitizeProjectForAccess } from "@/lib/entitlements/visibility";
import { mapAppProjectToDbRow } from "@/lib/db/mappers/project";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { fetchAllProjects, syncProjectRelations } from "@/lib/db/queries/projects";
import { logAuditEvent } from "@/lib/db/queries/audit";
import type { InvestmentProject } from "@/lib/types";

export async function GET() {
  try {
    // Resolve the caller's tier and strip data-room-only financial fields for sub-qualified viewers
    // (previously these were returned unauthenticated). Qualified+/admin dashboards get full records.
    const user = await getCurrentUser();
    const level = accessLevelForRole(user?.role ?? null);
    const items = await fetchAllProjects();
    return NextResponse.json(items.map((p) => sanitizeProjectForAccess(p, level)));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["admin", "super_admin"]);
    const body = (await request.json()) as Partial<InvestmentProject>;
    const now = new Date();

    const row = mapAppProjectToDbRow({
      ...body,
      createdBy: body.createdBy ?? user.name,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      projectStatus: body.projectStatus ?? "draft",
      visibilityLevel: body.visibilityLevel ?? "public",
      dataVerificationStatus: body.dataVerificationStatus ?? "pending_review",
      scope: body.scope ?? [],
      developmentImpact: body.developmentImpact ?? [],
      strategicPillarIds: body.strategicPillarIds ?? [],
      sdgIds: body.sdgIds ?? [],
      documents: body.documents ?? [],
    });

    const [inserted] = await db
      .insert(projects)
      .values({
        title: row.title!,
        slug: row.slug!,
        sectorId: row.sectorId!,
        subsectorId: row.subsectorId,
        pipelineType: row.pipelineType!,
        primaryBeneficiaryMinistryId: row.primaryBeneficiaryMinistryId!,
        implementingAgencyId: row.implementingAgencyId,
        projectOwner: row.projectOwner!,
        location: row.location!,
        province: row.province,
        district: row.district,
        capitalRequired: row.capitalRequired,
        financingType: row.financingType,
        projectReadiness: row.projectReadiness!,
        projectStatus: row.projectStatus!,
        visibilityLevel: row.visibilityLevel!,
        irr: row.irr,
        npv: row.npv,
        roi: row.roi,
        paybackPeriod: row.paybackPeriod,
        projectedRevenue: row.projectedRevenue,
        opportunitySummary: row.opportunitySummary!,
        description: row.description!,
        scope: row.scope!,
        developmentImpact: row.developmentImpact!,
        sourceReference: row.sourceReference,
        dataVerificationStatus: row.dataVerificationStatus!,
        reviewerNotes: row.reviewerNotes,
        createdBy: row.createdBy!,
        submittedBy: row.submittedBy,
        reviewedBy: row.reviewedBy,
        approvedBy: row.approvedBy,
        publishedBy: row.publishedBy,
        submittedAt: row.submittedAt,
        reviewedAt: row.reviewedAt,
        approvedAt: row.approvedAt,
        publishedAt: row.publishedAt,
      })
      .returning({ id: projects.id });

    await syncProjectRelations(inserted.id, body);

    // Seeds GET /api/projects/[id]/history so the drawer's Timeline tab has a real "Created"
    // opening event instead of relying on the (now-removed) client-synthesized one.
    await logAuditEvent({
      actorUserId: user.userId,
      actorName: user.name,
      action: "project.created",
      entityType: "project",
      entityId: inserted.id,
      metadata: { title: row.title },
    });

    const all = await fetchAllProjects();
    const created = all.find((p) => p.id === inserted.id);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
