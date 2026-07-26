import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchMinistryOfficialCounts } from "@/lib/db/queries/users";

export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);
    const counts = await fetchMinistryOfficialCounts();
    return NextResponse.json({ counts });
  } catch (error) {
    return handleRouteError(error);
  }
}
