import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchAllUsers } from "@/lib/db/queries/users";

// Both the platform owner (super_admin) and console admins (ZIDA staff) can view the user
// directory; server-side ceilings on the mutation routes (see /api/users/[id]) decide who may
// change whom.
export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);
    const users = await fetchAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    return handleRouteError(error);
  }
}
