import { NextResponse } from "next/server";
import { desc, ne } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { mapAppInquiryToDb, mapDbInquiryToApp } from "@/lib/db/mappers/inquiry";
import { db } from "@/lib/db/client";
import { strategicInquiries } from "@/lib/db/schema";
import { resolveProjectDbId } from "@/lib/db/queries/projects";
import { findUserIdsByEmails } from "@/lib/db/queries/users";
import type { LeadInquiry } from "@/lib/types";

export async function GET() {
  try {
    // ministry_admin (Ministry Desk management dashboard plan, Part 5) — gets full read visibility
    // for platform-wide context (mirrors Part 2's "mine first, everything visible" pattern; the
    // "mine first" grouping is computed client-side in app/ministry/inquiries/page.tsx using
    // projectMatchesMinistry + a ministryRepresented text match, same taxonomy data it already has
    // via useTaxonomyStore/useAuth). Approve/Decline stay admin/super_admin-only — see PATCH below
    // and app/api/inquiries/[id]/route.ts — since Approve auto-upgrades the applicant's account to
    // Qualified Investor, a platform-wide account-governance decision, not ministry business.
    await requireRole(["admin", "super_admin", "ministry_admin"]);
    // "draft" rows are the applicant's own private, still-editable wizard-in-progress work — never
    // surfaced to the staff review queue until they submit (draft -> pending).
    const rows = await db
      .select()
      .from(strategicInquiries)
      .where(ne(strategicInquiries.status, "draft"))
      .orderBy(desc(strategicInquiries.createdAt));

    // Best-effort account match for the "Open Dossier" link — prefers the soft-linked userId
    // captured at wizard submission time, falling back to an email match for older rows (or
    // anonymous submissions where the applicant later registered under the same address).
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
    const body = (await request.json()) as Omit<LeadInquiry, "id" | "createdAt">;
    const dbProjectId = body.projectId ? await resolveProjectDbId(body.projectId) : undefined;

    const [inserted] = await db
      .insert(strategicInquiries)
      .values(mapAppInquiryToDb(body, dbProjectId ?? undefined))
      .returning();

    return NextResponse.json(
      mapDbInquiryToApp(inserted, body.projectId),
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
