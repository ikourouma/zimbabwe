import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchMessagesForActor } from "@/lib/db/queries/messages";

/** GET /api/messages — the signed-in user's full Communication Hub inbox across every project
 *  they can see a thread on (see lib/db/queries/messages.ts for the visibility rules). Powers
 *  app/deal-room/communication/page.tsx. */
export async function GET() {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const messages = await fetchMessagesForActor(actor);
    return NextResponse.json(messages);
  } catch (error) {
    return handleRouteError(error);
  }
}
