import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { assignableRoles } from "@/lib/auth/user-governance";
import { createAuthUserDirect, generateTempPassword } from "@/lib/auth/direct-signup";
import { updateUserProfile } from "@/lib/db/queries/users";
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
    const actor = await requireRole(["admin", "super_admin"]);
    const body = (await request.json()) as CreateUserBody;

    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "A full name is required." }, { status: 400 });
    }

    const role = body.role ?? "registered";
    if (!assignableRoles(actor.role).includes(role)) {
      return NextResponse.json({ error: "You are not permitted to create this role." }, { status: 403 });
    }

    const tempPassword = generateTempPassword();
    const { userId } = await createAuthUserDirect(email, tempPassword, name);

    await updateUserProfile(userId, {
      role,
      accountStatus: "active",
      organization: body.organization?.trim() || null,
      jobTitle: body.jobTitle?.trim() || null,
      phone: body.phone?.trim() || null,
      ministryId: role === "government" ? body.ministryId || null : null,
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
        ministryId: body.ministryId ?? null,
        emailVerification: "disabled",
        mfa: "disabled",
      },
    });

    return NextResponse.json({ userId, email, name, role, tempPassword });
  } catch (error) {
    return handleRouteError(error);
  }
}
