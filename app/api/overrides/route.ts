import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchOverrideHistory } from "@/lib/db/queries/audit";

/** Recent Publishing-Override activity for the Sovereign Circuit Breaker queue (super_admin only). */
export async function GET() {
  try {
    await requireRole(["super_admin"]);
    const history = await fetchOverrideHistory(30);
    return NextResponse.json(history);
  } catch (error) {
    return handleRouteError(error);
  }
}
