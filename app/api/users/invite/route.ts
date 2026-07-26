import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { assignableRoles } from "@/lib/auth/user-governance";
import { logAuditEvent } from "@/lib/db/queries/audit";
import type { AccountRole } from "@/lib/auth/types";

interface InviteBody {
  email?: string;
  role?: AccountRole;
  note?: string;
  /** Universal invite-intent metadata — read back by ensureProfileForUser on the invitee's first
   *  sign-up, so the invited role/org/title/phone actually take effect (see lib/auth/ensure-profile.ts). */
  organization?: string;
  jobTitle?: string;
  phone?: string;
  /** Role-specific invite-intent metadata (recorded only; onboarding wiring is deferred). */
  ministryId?: string;
  firmType?: string;
  mandate?: string;
  enforceMfa?: boolean;
  sendTempPassword?: boolean;
}

/**
 * Records a user invitation intent in the audit trail. Email delivery + credential provisioning are
 * deferred (no admin auth plugin in the managed Better Auth setup), so this does NOT send a message
 * or create the account — it files a tracked, attributable record (incl. any role-specific intent
 * metadata) so staff can see who invited whom and follow up manually. Admins may invite only below
 * their tier (server-side ceiling); super_admin may invite any role.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const body = (await request.json()) as InviteBody;
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const role = body.role ?? "registered";
    if (!assignableRoles(actor.role).includes(role)) {
      return NextResponse.json({ error: "You are not permitted to invite this role." }, { status: 403 });
    }

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "user.invite_requested",
      entityType: "user_invite",
      entityId: email,
      metadata: {
        email,
        role,
        note: body.note?.trim() || null,
        ...(body.organization?.trim() ? { organization: body.organization.trim() } : {}),
        ...(body.jobTitle?.trim() ? { jobTitle: body.jobTitle.trim() } : {}),
        ...(body.phone?.trim() ? { phone: body.phone.trim() } : {}),
        ...(body.ministryId ? { ministryId: body.ministryId } : {}),
        ...(body.firmType ? { firmType: body.firmType } : {}),
        ...(body.mandate ? { mandate: body.mandate } : {}),
        enforceMfa: Boolean(body.enforceMfa),
        sendTempPassword: Boolean(body.sendTempPassword),
        emailDelivery: "deferred",
      },
    });

    return NextResponse.json({ ok: true, emailDelivery: "deferred" });
  } catch (error) {
    return handleRouteError(error);
  }
}
