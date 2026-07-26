import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { savedSearches, strategicInquiries } from "@/lib/db/schema";
import { mapAppInquiryToDb } from "@/lib/db/mappers/inquiry";
import { summarizeFiltersForLead } from "@/lib/utils/saved-search";
import type { ProjectFilters, SavedSearch } from "@/lib/types";

const ALL_ROLES = ["registered", "qualified", "government", "admin", "super_admin"] as const;

type SavedSearchRow = typeof savedSearches.$inferSelect;

function mapRow(row: SavedSearchRow): SavedSearch {
  return {
    id: row.id,
    name: row.name,
    filters: row.filters,
    alertEnabled: row.alertEnabled,
    createdAt: row.createdAt.toISOString(),
  };
}

/** GET /api/user/saved-searches — the signed-in user's own saved registry searches, newest first. */
export async function GET() {
  try {
    const actor = await requireRole([...ALL_ROLES]);
    const rows = await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, actor.userId))
      .orderBy(desc(savedSearches.createdAt));
    return NextResponse.json(rows.map(mapRow));
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/user/saved-searches — persist a saved search for the signed-in user AND file one
 * `investment_interest` inquiry summarizing the mandate (sector/capital/province) so it lands in
 * the admin inbox. `alertEnabled` is stored now; real email delivery is deferred (Resend = Phase 5).
 */
export async function POST(request: Request) {
  try {
    const actor = await requireRole([...ALL_ROLES]);
    const body = (await request.json()) as { name?: string; filters?: ProjectFilters; alertEnabled?: boolean };

    const name = body.name?.trim();
    const filters = body.filters ?? {};
    if (!name) {
      return NextResponse.json({ error: "A name is required." }, { status: 400 });
    }

    const [inserted] = await db
      .insert(savedSearches)
      .values({
        userId: actor.userId,
        name,
        filters,
        alertEnabled: Boolean(body.alertEnabled),
      })
      .returning();

    // File a structured lead for the deal team so the mandate surfaces in the admin inbox.
    // describeInterest() renders the sector/ticket; the message carries the full filter summary.
    // Saved searches aren't project-scoped, so no projectId is attached to the inquiry.
    const summary = summarizeFiltersForLead(filters);
    await db.insert(strategicInquiries).values(
      mapAppInquiryToDb({
        type: "investment_interest",
        name: actor.name,
        email: actor.email,
        organization: actor.organization ?? undefined,
        sectorIds: summary.sectorIds,
        message: `Saved search "${name}"${body.alertEnabled ? " (email alerts requested — delivery pending)" : ""}: ${summary.text}`,
        status: "pending",
      })
    );
    // NOTE: When Resend is enabled (Phase 5), a saved search with alertEnabled would also register a
    // recurring digest here. Deferred by decision — only the admin-inbox lead is created for now.

    return NextResponse.json(mapRow(inserted), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
