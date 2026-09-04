import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser, requireRole } from "@/lib/auth/session";
import { accessLevelForRole, sanitizeProjectForAccess } from "@/lib/entitlements/visibility";
import { loadEntitlementContext } from "@/lib/entitlements/load";
import { mapAppProjectToDbRow } from "@/lib/db/mappers/project";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { fetchAllProjects, syncProjectRelations } from "@/lib/db/queries/projects";
import { resolveOrCreatePendingSubsector } from "@/lib/db/queries/taxonomies";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { slugify } from "@/lib/utils";
import { INVESTOR_FIRST_SAVE_REQUIRED_FIELDS } from "@/lib/governance/investor-proposal";
import { isVisibleToMinistryAdmin } from "@/lib/entitlements/ministry-scope";
import type { InvestmentProject } from "@/lib/types";

export async function GET() {
  try {
    // Resolve the caller's tier and strip data-room-only financial fields for sub-qualified viewers
    // (previously these were returned unauthenticated). Qualified+/admin dashboards get full records.
    const user = await getCurrentUser();
    const level = accessLevelForRole(user?.role ?? null);
    const isStaffViewer = user?.role === "admin" || user?.role === "super_admin" || user?.role === "government";
    const isMinistryAdmin = user?.role === "ministry_admin" && !!user.ministryId;
    const items = await fetchAllProjects();
    // Staff/government keep seeing every project regardless of status, by existing design (the
    // Deal Room pipeline's governance workflow view depends on this). The one new restriction here
    // (Investor Dashboard Expansion plan, Phase 4): an investor-submitted proposal that hasn't been
    // published yet is that investor's own private draft, not institutional ZIDA data — it should
    // never appear in another non-staff viewer's project list, even though every *staff*-authored
    // draft/under-review project already does today.
    // A validated org teammate (Deal Room Feedback Batch v2, Phase 5) sees any draft proposal
    // they've been assigned to, exactly as if they were its creator — assignment is the whole
    // point of the co-editor grant.
    // ministry_admin (Phase 6) gets staff-like full visibility, but ONLY for their own ministry's
    // projects (isVisibleToMinistryAdmin) — everything else falls back to the standard non-staff
    // published-only view below, same as any other qualified-tier viewer.
    const visible = isStaffViewer
      ? items
      : items.filter(
          (p) =>
            !p.investorSubmitted ||
            p.projectStatus === "published" ||
            p.createdBy === user?.userId ||
            (user?.userId ? p.teamAssignedUserIds?.includes(user.userId) : false) ||
            (isMinistryAdmin && isVisibleToMinistryAdmin(p, user!.ministryId!))
        );
    const entitlements = await loadEntitlementContext();
    return NextResponse.json(visible.map((p) => sanitizeProjectForAccess(p, level, entitlements.matrix, entitlements.costStructureHidden)));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["admin", "super_admin", "qualified", "ministry_admin"]);
    const body = (await request.json()) as Partial<InvestmentProject>;
    const now = new Date();
    const isInvestorSubmission = user.role === "qualified";
    // Team Ministry Traceability Batch, Phase 3 (item 8) — a ministry_admin creates projects
    // directly for their own ministry, like admin/super_admin ("full rights"), but ministry-locked:
    // the client-sent primaryBeneficiaryMinistryId is always ignored in favor of the actor's own
    // ministryId (never trust the client for the one field that gates their entire authority).
    if (user.role === "ministry_admin") {
      if (!user.ministryId) {
        return NextResponse.json({ error: "Your account is not linked to a ministry." }, { status: 403 });
      }
      body.primaryBeneficiaryMinistryId = user.ministryId;
    }

    // "Other (not listed)" subsector (item 7) — resolve/create the pending taxonomy row before
    // the rest of the save proceeds, so the proposal is never blocked waiting on approval.
    if (body.subsectorOther?.trim() && body.sectorId) {
      body.subsectorId = await resolveOrCreatePendingSubsector(body.sectorId, body.subsectorOther);
    }
    delete body.subsectorOther;

    if (isInvestorSubmission) {
      const missing = INVESTOR_FIRST_SAVE_REQUIRED_FIELDS.filter((field) => !body[field]);
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Missing required field(s): ${missing.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const row = mapAppProjectToDbRow({
      ...body,
      // Investor submissions are always self-attributed and start life admin-only/draft
      // regardless of what the client sent — see the "Propose a Project" ownership model
      // (Investor Dashboard Expansion plan, Phase 4). Staff-created projects keep their existing
      // behavior untouched. ministry_admin (Phase 3) is institutional like staff (never an
      // "investor" proposal) but self-attributed by userId (not display name) like an investor —
      // that userId is what the PATCH inline ownership gate below matches against.
      createdBy: isInvestorSubmission || user.role === "ministry_admin" ? user.userId : body.createdBy ?? user.name,
      investorSubmitted: isInvestorSubmission ? true : user.role === "ministry_admin" ? false : body.investorSubmitted ?? false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      projectStatus: isInvestorSubmission ? "draft" : body.projectStatus ?? "draft",
      visibilityLevel: isInvestorSubmission ? "admin_only" : body.visibilityLevel ?? "public",
      dataVerificationStatus: isInvestorSubmission ? "unverified" : body.dataVerificationStatus ?? "pending_review",
      // Draft-leniency backfill: a Propose-a-Project first save only needs
      // INVESTOR_FIRST_SAVE_REQUIRED filled in — every other NOT NULL text/array column gets an
      // empty placeholder here and is completed over the rest of the wizard's steps, mirroring the
      // Strategic Partnerships draft-autosave pattern (see inquiry-wizard-validation.ts).
      opportunitySummary: body.opportunitySummary ?? "",
      description: body.description ?? "",
      scope: body.scope ?? [],
      developmentImpact: body.developmentImpact ?? [],
      strategicPillarIds: body.strategicPillarIds ?? [],
      sdgIds: body.sdgIds ?? [],
      documents: body.documents ?? [],
    });

    // Auto-generate a slug for investor submissions (never trust a client-chosen slug for
    // uniqueness) — staff-created projects keep sending their own pre-computed slug as before.
    const slug =
      row.slug ||
      (isInvestorSubmission ? `${slugify(row.title ?? "proposal")}-${now.getTime().toString(36).slice(-6)}` : undefined);

    const [inserted] = await db
      .insert(projects)
      .values({
        title: row.title!,
        slug: slug!,
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
        investmentSource: row.investmentSource,
        capitalStructure: row.capitalStructure,
        shareholderContribution: row.shareholderContribution,
        sectorExperienceYears: row.sectorExperienceYears,
        priorProjectsCompleted: row.priorProjectsCompleted,
        annualTurnover: row.annualTurnover,
        financingConfirmation: row.financingConfirmation,
        financingPartners: row.financingPartners,
        opportunitySummary: row.opportunitySummary!,
        description: row.description!,
        scope: row.scope!,
        developmentImpact: row.developmentImpact!,
        jobsDirect: row.jobsDirect,
        jobsIndirect: row.jobsIndirect,
        sourceReference: row.sourceReference,
        dataVerificationStatus: row.dataVerificationStatus!,
        reviewerNotes: row.reviewerNotes,
        createdBy: row.createdBy!,
        investorSubmitted: row.investorSubmitted ?? false,
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
      metadata: { title: row.title, investorSubmitted: isInvestorSubmission },
    });

    const all = await fetchAllProjects();
    const created = all.find((p) => p.id === inserted.id);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
