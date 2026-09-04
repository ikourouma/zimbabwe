import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { assignableRoles } from "@/lib/auth/user-governance";
import { createAuthUserDirect, generateTempPassword } from "@/lib/auth/direct-signup";
import { buildCreatedByContext, updateUserProfile } from "@/lib/db/queries/users";
import { logAuditEvent } from "@/lib/db/queries/audit";
import type { AccountRole } from "@/lib/auth/types";

interface CreateUserBody {
  email?: string;
  name?: string;
  role?: AccountRole;
  organization?: string;
  jobTitle?: string;
  phone?: string;
  ministryId?: string;
  /** Optional "why" context (Platform Feedback Batch v3, Phase 2) — audit-log-only, since direct
   *  creation has no separate review queue to surface it in later. */
  justification?: string;
}

/**
 * Super-admin/admin "Create User" — provisions a real, immediately-active Neon Auth account (no
 * email verification, no MFA gate — both deferred platform-wide for the pilot) and returns a
 * one-time temporary password for the operator to hand off out-of-band. This is the direct-creation
 * counterpart to POST /api/users/invite, which only records intent; this one actually creates the
 * sign-in-ready account. Same server-side role ceiling as every other user-mutation route.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireRole(["admin", "super_admin", "ministry_admin"]);
    const body = (await request.json()) as CreateUserBody;

    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "A full name is required." }, { status: 400 });
    }

    // ministry_admin's ceiling is a single fixed role (assignableRoles() returns only
    // ["government"] for them) — force both role and ministryId server-side regardless of what the
    // client sent, so a ministry_admin can never mint staff outside their own ministry or at any
    // other role tier.
    const role = actor.role === "ministry_admin" ? "government" : body.role ?? "registered";
    if (!assignableRoles(actor.role).includes(role)) {
      return NextResponse.json({ error: "You are not permitted to create this role." }, { status: 403 });
    }
    if (role === "ministry_admin" && !body.ministryId) {
      return NextResponse.json({ error: "A designated ministry is required for a Ministry Admin account." }, { status: 400 });
    }
    if (actor.role === "ministry_admin" && !actor.ministryId) {
      return NextResponse.json(
        { error: "Your own account has no designated ministry yet — contact a Platform/ZIDA Admin." },
        { status: 400 }
      );
    }
    const ministryId = actor.role === "ministry_admin" ? actor.ministryId! : body.ministryId;

    const tempPassword = generateTempPassword();
    const { userId } = await createAuthUserDirect(email, tempPassword, name);

    // Chain-of-custody (Team Ministry Traceability Batch, Phase 7): the snapshot is always the
    // operator's own identity — never the new account's. Now reachable by ministry_admin too, so
    // the resulting context correctly names the ministry that created this government staffer.
    const createdByContext = await buildCreatedByContext({
      name: actor.name,
      role: actor.role,
      organization: actor.organization,
      ministryId: actor.ministryId,
    });

    await updateUserProfile(userId, {
      role,
      accountStatus: "active",
      organization: body.organization?.trim() || null,
      jobTitle: body.jobTitle?.trim() || null,
      phone: body.phone?.trim() || null,
      ministryId: role === "government" || role === "ministry_admin" ? ministryId || null : null,
      createdByUserId: actor.userId,
      createdByContext,
    });

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "user.created_directly",
      entityType: "user",
      entityId: userId,
      metadata: {
        email,
        name,
        role,
        organization: body.organization?.trim() || null,
        jobTitle: body.jobTitle?.trim() || null,
        phone: body.phone?.trim() || null,
        ministryId: ministryId ?? null,
        justification: body.justification?.trim() || null,
        emailVerification: "disabled",
        mfa: "disabled",
      },
    });

    return NextResponse.json({ userId, email, name, role, tempPassword });
  } catch (error) {
    return handleRouteError(error);
  }
}
