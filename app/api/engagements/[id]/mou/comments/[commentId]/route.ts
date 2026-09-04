import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { investorEngagements } from "@/lib/db/schema";
import { resolveMouFieldComment } from "@/lib/db/queries/mou-comments";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { isEngagementInvestorParty } from "@/lib/governance/mou-workflow";

type RouteParams = { params: Promise<{ id: string; commentId: string }> };

/** Marks a per-field MOU comment resolved — never deletes it, just clears it from the "unresolved"
 *  badge (see lib/db/queries/mou-comments.ts). Same viewer set as posting a comment can resolve one;
 *  a qualified investor is still confined to their own engagement via the confidentiality check. */
export async function PATCH(_request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified"]);
    const { id, commentId } = await params;

    const [engagement] = await db
      .select()
      .from(investorEngagements)
      .where(eq(investorEngagements.id, id))
      .limit(1);
    if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (actor.role === "qualified" && !isEngagementInvestorParty(actor, engagement)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comment = await resolveMouFieldComment(commentId, actor.name);

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "mou.comment_resolved",
      entityType: "engagement",
      entityId: id,
      metadata: { fieldKey: comment.fieldKey },
    });

    return NextResponse.json(comment);
  } catch (error) {
    return handleRouteError(error);
  }
}
