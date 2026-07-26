import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { investorEngagements, projectMessages } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { mapDbMessageToApp } from "@/lib/db/mappers/message";
import type { CorrectionField, MessageActionPayload } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

const CORRECTION_FIELD_LABELS: Record<CorrectionField, string> = {
  investorOrganization: "Organization",
  ticketSize: "Indicative ticket size",
  signatoryTitle: "Signatory title",
};

/**
 * POST /api/engagements/[id]/correction — the compliant "Request Correction" path for a LOCKED
 * (post-draft) engagement. Because a published engagement is immutable, the investor cannot edit
 * it inline; instead they file a correction request, which (a) posts an investor-visible message
 * into the engagement's Communication Hub thread and (b) records an `engagement.correction_requested`
 * event so the change trail is preserved in the project timeline. Staff then action it off the
 * message (e.g. an addendum) — the original record is never mutated.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified"]);
    const { id } = await params;
    const body = (await request.json()) as {
      reason?: string;
      field?: CorrectionField;
      proposedValue?: string;
    };
    if (!body.reason || !body.reason.trim()) {
      return NextResponse.json({ error: "A correction reason is required." }, { status: 400 });
    }
    const proposedField =
      body.field && body.field in CORRECTION_FIELD_LABELS && body.proposedValue?.trim()
        ? body.field
        : undefined;

    const [engagement] = await db
      .select()
      .from(investorEngagements)
      .where(eq(investorEngagements.id, id))
      .limit(1);
    if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Owner-gate for investors; staff may file on an investor's behalf.
    if (actor.role === "qualified" && engagement.userId !== actor.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Corrections only make sense once the record is locked (still-draft records are edited inline).
    if (engagement.status === "draft") {
      return NextResponse.json(
        { error: "This engagement is still a draft — edit it directly instead of requesting a correction." },
        { status: 400 }
      );
    }

    const text = body.reason.trim();

    // Emit an interactive Action Card (kind='action') rather than a plain note, so staff can
    // Approve/Counter/Decline inline (see POST /api/messages/[id]/action). When the investor
    // proposed a concrete field value, capture the current + proposed values on the card so an
    // approval can apply the governed amendment.
    const currentValue = proposedField
      ? (engagement[proposedField as keyof typeof engagement] as string | null) ?? null
      : undefined;
    const payload: MessageActionPayload = {
      type: "correction",
      engagementId: engagement.id,
      reason: text,
      status: "open",
      ...(proposedField
        ? {
            field: proposedField,
            fieldLabel: CORRECTION_FIELD_LABELS[proposedField],
            currentValue,
            proposedValue: body.proposedValue!.trim(),
          }
        : {}),
    };
    const summary = proposedField
      ? `Correction requested — ${CORRECTION_FIELD_LABELS[proposedField]}: “${currentValue ?? "—"}” → “${body.proposedValue!.trim()}”. ${text}`
      : `Correction requested: ${text}`;

    const [inserted] = await db
      .insert(projectMessages)
      .values({
        projectId: engagement.projectId,
        engagementId: engagement.id,
        authorUserId: actor.userId,
        authorName: actor.name,
        authorRole: actor.role,
        visibility: "investor_visible",
        kind: "action",
        payload,
        body: summary,
      })
      .returning();

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "engagement.correction_requested",
      entityType: "engagement",
      entityId: engagement.id,
      metadata: {
        investorName: engagement.investorName,
        projectId: engagement.projectId,
        reason: text,
        ...(proposedField ? { field: proposedField, proposedValue: body.proposedValue!.trim() } : {}),
      },
    });

    return NextResponse.json(mapDbMessageToApp(inserted), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
