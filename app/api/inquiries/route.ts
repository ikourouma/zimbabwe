import { NextResponse } from "next/server";
import { desc, ne } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { filterInquiriesForMinistryAdmin, validatePublicInquiryBody } from "@/lib/api/security-helpers";
import { getCurrentUser, requireRole } from "@/lib/auth/session";
import { mapAppInquiryToDb, mapDbInquiryToApp } from "@/lib/db/mappers/inquiry";
import { db } from "@/lib/db/client";
import { strategicInquiries } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { resolveProjectDbId } from "@/lib/db/queries/projects";
import { findUserIdsByEmails } from "@/lib/db/queries/users";

export async function GET() {
  try {
    const actor = await requireRole(["admin", "super_admin", "ministry_admin"]);
    let rows = await db
      .select()
      .from(strategicInquiries)
      .where(ne(strategicInquiries.status, "draft"))
      .orderBy(desc(strategicInquiries.createdAt));

    if (actor.role === "ministry_admin") {
      if (!actor.ministryId) return NextResponse.json([]);
      rows = await filterInquiriesForMinistryAdmin(rows, actor.ministryId);
    }

    const unmatchedEmails = rows.filter((r) => !r.userId).map((r) => r.email);
    const emailMatches = unmatchedEmails.length ? await findUserIdsByEmails(unmatchedEmails) : {};

    return NextResponse.json(
      rows.map((row) => ({
        ...mapDbInquiryToApp(row),
        matchedUserId: row.userId ?? emailMatches[row.email.toLowerCase()] ?? undefined,
      }))
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = validatePublicInquiryBody(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const sessionUser = await getCurrentUser();
    const inquiry = {
      ...validated.inquiry,
      userId: sessionUser?.userId ?? validated.inquiry.userId,
      status: "pending" as const,
    };
    const dbProjectId = inquiry.projectId ? await resolveProjectDbId(inquiry.projectId) : undefined;

    const [inserted] = await db
      .insert(strategicInquiries)
      .values(mapAppInquiryToDb(inquiry, dbProjectId ?? undefined))
      .returning();

    void logAuditEvent({
      actorUserId: sessionUser?.userId ?? null,
      actorName: sessionUser?.name ?? inquiry.name,
      action: "inquiry.submitted",
      entityType: "inquiry",
      entityId: inserted.id,
      metadata: { type: inquiry.type, email: inquiry.email },
    });

    return NextResponse.json(mapDbInquiryToApp(inserted, inquiry.projectId), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
