import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { mapDbInquiryToApp } from "@/lib/db/mappers/inquiry";
import { db } from "@/lib/db/client";
import { strategicInquiries } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { findUserIdByEmail, updateUserProfile } from "@/lib/db/queries/users";
import type { LeadInquiry } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const body = (await request.json()) as Partial<LeadInquiry>;

    const [updated] = await db
      .update(strategicInquiries)
      .set({
        status: body.status,
        reviewedBy: body.status ? actor.name : undefined,
        reviewedAt: body.status ? new Date() : undefined,
      })
      .where(eq(strategicInquiries.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Closes the "approve inquiry as qualified investor" loop the dashboard audit flagged as
    // open: approving an investor-type inquiry now actually upgrades the matching account's
    // role, rather than only flipping a cosmetic CRM status. No-op (documented, not silently
    // dropped) if the applicant has no account yet — they'd need to register/sign in first.
    let roleUpgraded = false;
    if (body.status === "approved" && updated.engagementType === "investor") {
      const matchedUserId = await findUserIdByEmail(updated.email);
      if (matchedUserId) {
        await updateUserProfile(matchedUserId, { role: "qualified" });
        roleUpgraded = true;
      }
    }

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "inquiry.status_changed",
      entityType: "inquiry",
      entityId: id,
      metadata: {
        status: body.status,
        applicantEmail: updated.email,
        roleUpgradedToQualified: roleUpgraded,
      },
    });

    return NextResponse.json(mapDbInquiryToApp(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
