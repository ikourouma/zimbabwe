import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { mapDbInquiryToApp } from "@/lib/db/mappers/inquiry";
import { db } from "@/lib/db/client";
import { strategicInquiries } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { findUserIdByEmail, updateUserProfile, fetchUserDetail } from "@/lib/db/queries/users";
import type { LeadInquiry } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

interface PatchBody extends Partial<LeadInquiry> {
  /** Staff justification / applicant-facing note — required for every decision except the
   *  "reset to pending" no-op. Persisted into reviewNotes and the audit trail. */
  reason?: string;
}

const REASON_REQUIRED_STATUSES: LeadInquiry["status"][] = ["approved", "declined", "changes_requested"];

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const body = (await request.json()) as PatchBody;

    const [current] = await db.select().from(strategicInquiries).where(eq(strategicInquiries.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const nextStatus = body.status;
    const reason = body.reason?.trim();

    if (nextStatus && REASON_REQUIRED_STATUSES.includes(nextStatus) && !reason) {
      return NextResponse.json(
        { error: "A reason is required and is recorded in the audit log." },
        { status: 400 }
      );
    }

    // Closes the "approve inquiry as qualified investor" loop the dashboard audit flagged as
    // open: approving an investor-type inquiry now actually upgrades the matching account's
    // role, rather than only flipping a cosmetic CRM status. No-op (documented, not silently
    // dropped) if the applicant has no account yet — they'd need to register/sign in first.
    let roleUpgraded = false;
    let kycBlocked = false;

    if (nextStatus === "approved" && current.engagementType === "investor") {
      const matchedUserId = current.userId ?? (await findUserIdByEmail(current.email));

      // All five KYC fields must be complete — checked on the inquiry row first (the wizard now
      // captures these up-front), falling back to whatever's already on the matched profile (a
      // returning applicant who completed KYC on a prior cycle). `role` can never become
      // `qualified` with incomplete KYC — this is the core rule of the Investor Qualification
      // Vetting plan. Use "Request More Info" instead of Approve when this blocks.
      const profile = matchedUserId ? await fetchUserDetail(matchedUserId) : null;
      const kyc = {
        organization: current.organization || profile?.organization || "",
        phone: current.phone || profile?.phone || "",
        hqAddress: current.hqAddress || profile?.hqAddress || "",
        businessRegistrationId: current.businessRegistrationId || profile?.businessRegistrationId || "",
        websiteUrl: current.websiteUrl || profile?.websiteUrl || "",
      };
      const kycComplete = Object.values(kyc).every((v) => v.trim().length > 0);

      if (!kycComplete) {
        kycBlocked = true;
      } else if (matchedUserId) {
        await updateUserProfile(matchedUserId, {
          role: "qualified",
          organization: current.organization || undefined,
          phone: current.phone || undefined,
          hqAddress: current.hqAddress || undefined,
          businessRegistrationId: current.businessRegistrationId || undefined,
          websiteUrl: current.websiteUrl || undefined,
        });
        roleUpgraded = true;
      }
    }

    if (kycBlocked) {
      return NextResponse.json(
        {
          error:
            "This applicant's KYC information is incomplete, so their role cannot become Qualified Investor. Use \"Request More Info\" to ask them to complete it, or Decline.",
          code: "KYC_INCOMPLETE",
        },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(strategicInquiries)
      .set({
        status: nextStatus,
        reviewedBy: nextStatus ? actor.name : undefined,
        reviewedAt: nextStatus ? new Date() : undefined,
        ...(nextStatus && REASON_REQUIRED_STATUSES.includes(nextStatus) ? { reviewNotes: reason } : {}),
        updatedAt: new Date(),
      })
      .where(eq(strategicInquiries.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "inquiry.status_changed",
      entityType: "inquiry",
      entityId: id,
      metadata: {
        status: nextStatus,
        reason: reason ?? null,
        applicantEmail: updated.email,
        roleUpgradedToQualified: roleUpgraded,
      },
    });

    return NextResponse.json(mapDbInquiryToApp(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
