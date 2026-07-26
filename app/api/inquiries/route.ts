import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { mapAppInquiryToDb, mapDbInquiryToApp } from "@/lib/db/mappers/inquiry";
import { db } from "@/lib/db/client";
import { strategicInquiries } from "@/lib/db/schema";
import { resolveProjectDbId } from "@/lib/db/queries/projects";
import type { LeadInquiry } from "@/lib/types";

export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);
    const rows = await db
      .select()
      .from(strategicInquiries)
      .orderBy(desc(strategicInquiries.createdAt));
    return NextResponse.json(rows.map((row) => mapDbInquiryToApp(row)));
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
