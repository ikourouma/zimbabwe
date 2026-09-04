import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { strategicInquiries } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";

const ALL_ROLES = ["registered", "qualified", "government", "ministry_admin", "admin", "super_admin"] as const;

/**
 * POST /api/account/request-elevation — a signed-in user asks ZIDA to review their access level
 * (Account & Security suite "Request elevated permissions"). Files a strategic inquiry (so it lands
 * in the Admin Inquiries console) and logs an audit event. Reuses the existing inquiry plumbing
 * rather than inventing a new review queue.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireRole([...ALL_ROLES]);
    const body = (await request.json().catch(() => ({}))) as { note?: string };

    const message = [
      `Access elevation request from ${actor.name} (${actor.email}).`,
      `Current role: ${actor.role}.`,
      body.note?.trim() ? `Note: ${body.note.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const [inserted] = await db
      .insert(strategicInquiries)
      .values({
        type: "contact",
        name: actor.name,
        email: actor.email,
        organization: actor.organization ?? undefined,
        message,
        status: "pending",
      })
      .returning();

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "account.elevation_requested",
      entityType: "inquiry",
      entityId: inserted.id,
      metadata: { currentRole: actor.role },
    });

    return NextResponse.json({ ok: true, inquiryId: inserted.id }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
