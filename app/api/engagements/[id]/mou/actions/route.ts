import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { engagementMous, investorEngagements, projectMessages } from "@/lib/db/schema";
import { getOrCreateMouForEngagement } from "@/lib/db/queries/mous";
import { mapDbMouToApp } from "@/lib/db/mappers/mou";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { canEditMouContent, canTransitionMou, isEngagementInvestorParty, isZidaApproverRole } from "@/lib/governance/mou-workflow";
import { NDA_REQUIRED_MESSAGE, requiresNdaAcceptance } from "@/lib/governance/nda";
import type { EngagementMou, MouAction, MouSignatureMetadata, MouStatus } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

interface ActionBody {
  action: MouAction;
  notes?: string;
  signatureMetadata?: MouSignatureMetadata;
}

/**
 * Every MOU state transition is one named, auditable action instead of an implicit side effect
 * of a field PATCH — mirrors the dual-approval CLM checkpoint from the plan: both the investor
 * and an authorized ZIDA/Admin/Government user must approve before `finalize` unlocks.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified"]);
    const { id } = await params;
    const body = (await request.json()) as ActionBody;

    const [engagement] = await db
      .select()
      .from(investorEngagements)
      .where(eq(investorEngagements.id, id))
      .limit(1);
    if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (isEngagementInvestorParty(actor, engagement) === false && actor.role === "qualified") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (requiresNdaAcceptance(actor.role) && !actor.ndaAcceptedAt) {
      return NextResponse.json({ error: NDA_REQUIRED_MESSAGE }, { status: 403 });
    }
    if (engagement.status !== "approved") {
      return NextResponse.json({ error: "Engagement is not approved yet" }, { status: 400 });
    }

    const mou = await getOrCreateMouForEngagement(id, {
      projectId: engagement.projectId,
      investorName: engagement.investorName,
      ticketSize: engagement.ticketSize,
    });
    const isInvestor = isEngagementInvestorParty(actor, engagement);
    const isZida = isZidaApproverRole(actor.role);

    let nextStatus: MouStatus = mou.status;
    const patch: Partial<typeof engagementMous.$inferInsert> = {};
    let auditAction = "mou.status_changed";
    let auditExtra: Record<string, unknown> = {};

    switch (body.action) {
      case "submit_for_review": {
        if (!canEditMouContent(actor.role)) {
          return NextResponse.json({ error: "Only ZIDA Admin/Platform Admin may submit the draft for review" }, { status: 403 });
        }
        if (!requireTransition(mou, "in_review")) return invalidTransition(mou, "in_review");
        nextStatus = "in_review";
        break;
      }
      case "request_changes": {
        if (!isInvestor && !isZida) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (mou.status !== "in_review" && mou.status !== "both_approved") {
          return NextResponse.json({ error: "Changes can only be requested while the MOU is In Review" }, { status: 400 });
        }
        nextStatus = "drafting";
        patch.investorApprovedAt = null;
        patch.investorApprovedBy = null;
        patch.zidaApprovedAt = null;
        patch.zidaApprovedBy = null;
        auditExtra = { requestedBy: isInvestor ? "investor" : "zida" };
        break;
      }
      case "approve": {
        if (!isInvestor && !isZida) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (mou.status !== "in_review") {
          return NextResponse.json({ error: "The MOU must be submitted for review before it can be approved" }, { status: 400 });
        }
        const now = new Date();
        if (isInvestor) {
          if (mou.investorApprovedAt) return NextResponse.json({ error: "You have already approved this draft" }, { status: 400 });
          patch.investorApprovedAt = now;
          patch.investorApprovedBy = actor.name;
        } else {
          if (mou.zidaApprovedAt) return NextResponse.json({ error: "You have already approved this draft" }, { status: 400 });
          patch.zidaApprovedAt = now;
          patch.zidaApprovedBy = actor.name;
        }
        const investorNowApproved = isInvestor ? true : Boolean(mou.investorApprovedAt);
        const zidaNowApproved = isZida ? true : Boolean(mou.zidaApprovedAt);
        if (investorNowApproved && zidaNowApproved) nextStatus = "both_approved";
        auditAction = "mou.approved";
        auditExtra = { approvedBy: isInvestor ? "investor" : "zida", bothApproved: nextStatus === "both_approved" };
        break;
      }
      case "finalize": {
        if (!canEditMouContent(actor.role)) {
          return NextResponse.json({ error: "Only ZIDA Admin/Platform Admin may finalize the MOU" }, { status: 403 });
        }
        if (!requireTransition(mou, "finalized")) return invalidTransition(mou, "finalized");
        nextStatus = "finalized";
        patch.contentSnapshot = mou.content;
        patch.finalizedAt = new Date();
        patch.finalizedBy = actor.name;
        break;
      }
      case "mark_ready_for_signature": {
        if (!canEditMouContent(actor.role)) {
          return NextResponse.json({ error: "Only ZIDA Admin/Platform Admin may mark the MOU ready for signature" }, { status: 403 });
        }
        if (!requireTransition(mou, "ready_for_signature")) return invalidTransition(mou, "ready_for_signature");
        nextStatus = "ready_for_signature";
        patch.readyForSignatureAt = new Date();
        patch.readyForSignatureBy = actor.name;
        break;
      }
      case "record_execution": {
        if (!canEditMouContent(actor.role)) {
          return NextResponse.json({ error: "Only ZIDA Admin/Platform Admin may record execution" }, { status: 403 });
        }
        if (!requireTransition(mou, "executed")) return invalidTransition(mou, "executed");
        if (!body.signatureMetadata?.investorSignedBy || !body.signatureMetadata?.zidaSignedBy) {
          return NextResponse.json(
            { error: "Both an investor signer and a ZIDA signer are required to record execution" },
            { status: 400 }
          );
        }
        nextStatus = "executed";
        patch.executedAt = new Date();
        patch.executedBy = actor.name;
        patch.signatureMetadata = body.signatureMetadata;
        patch.formattingLocked = true;
        break;
      }
      case "reopen": {
        if (!canEditMouContent(actor.role)) {
          return NextResponse.json({ error: "Only ZIDA Admin/Platform Admin may reopen a finalized MOU" }, { status: 403 });
        }
        if (mou.status !== "finalized" && mou.status !== "ready_for_signature") {
          return NextResponse.json({ error: "Only a Finalized or Ready-for-Signature MOU can be reopened" }, { status: 400 });
        }
        nextStatus = "drafting";
        patch.contentSnapshot = null;
        patch.investorApprovedAt = null;
        patch.investorApprovedBy = null;
        patch.zidaApprovedAt = null;
        patch.zidaApprovedBy = null;
        patch.finalizedAt = null;
        patch.finalizedBy = null;
        patch.readyForSignatureAt = null;
        patch.readyForSignatureBy = null;
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const [updated] = await db
      .update(engagementMous)
      .set({ ...patch, status: nextStatus, updatedAt: new Date() })
      .where(eq(engagementMous.engagementId, id))
      .returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Correction notes ride the Communication Hub thread scoped to this engagement (visibility
    // "mou") rather than a separate annotation system — see the plan's Communication Hub section.
    if (body.notes?.trim()) {
      await db.insert(projectMessages).values({
        projectId: engagement.projectId,
        engagementId: id,
        authorUserId: actor.userId,
        authorName: actor.name,
        authorRole: actor.role,
        visibility: "mou",
        body: body.notes.trim(),
      });
    }

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: auditAction,
      entityType: "engagement",
      entityId: id,
      metadata: {
        projectId: engagement.projectId,
        investorName: engagement.investorName,
        from: mou.status,
        to: nextStatus,
        mouAction: body.action,
        ...auditExtra,
      },
    });

    return NextResponse.json(mapDbMouToApp(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}

function requireTransition(mou: EngagementMou, to: MouStatus): boolean {
  return canTransitionMou(mou.status, to);
}

function invalidTransition(mou: EngagementMou, to: MouStatus) {
  return NextResponse.json({ error: `Cannot move MOU from "${mou.status}" to "${to}"` }, { status: 400 });
}
