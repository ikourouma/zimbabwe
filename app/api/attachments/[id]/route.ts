import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { messageAttachments, projectMessages, investorEngagements } from "@/lib/db/schema";
import { getSignedDownloadUrl, isR2Configured } from "@/lib/storage/r2";
import type { AccountRole } from "@/lib/auth/types";

type RouteParams = { params: Promise<{ id: string }> };

const STAFF_ROLES: AccountRole[] = ["admin", "super_admin", "government"];

/**
 * GET /api/attachments/[id] — re-checks the caller can see the attachment's parent message (same
 * visibility model as GET /api/projects/[id]/messages), then 302-redirects to a short-lived signed
 * R2 URL. The R2 storage key is never exposed to the client.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "registered"]);
    const { id } = await params;

    const [row] = await db
      .select({
        storageKey: messageAttachments.storageKey,
        fileName: messageAttachments.fileName,
        msgAuthor: projectMessages.authorUserId,
        msgEngagementId: projectMessages.engagementId,
        msgThreadOwner: projectMessages.threadOwnerUserId,
      })
      .from(messageAttachments)
      .innerJoin(projectMessages, eq(messageAttachments.messageId, projectMessages.id))
      .where(eq(messageAttachments.id, id))
      .limit(1);

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isStaff = STAFF_ROLES.includes(actor.role);
    if (!isStaff) {
      // An investor may download only if they authored the parent message, own the engagement it
      // belongs to, or own the concierge thread it lives in — mirrors the GET messages scoping.
      const authored = row.msgAuthor === actor.userId;
      const ownsConciergeThread = row.msgThreadOwner === actor.userId;
      let ownsEngagement = false;
      if (!authored && !ownsConciergeThread && row.msgEngagementId) {
        const own = await db
          .select({ id: investorEngagements.id })
          .from(investorEngagements)
          .where(and(eq(investorEngagements.id, row.msgEngagementId), eq(investorEngagements.userId, actor.userId)))
          .limit(1);
        ownsEngagement = own.length > 0;
      }
      if (!authored && !ownsConciergeThread && !ownsEngagement) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!isR2Configured()) {
      return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
    }

    const url = await getSignedDownloadUrl(row.storageKey, row.fileName);
    return NextResponse.redirect(url, 302);
  } catch (error) {
    return handleRouteError(error);
  }
}
