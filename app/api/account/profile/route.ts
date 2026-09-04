import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { updateUserProfile } from "@/lib/db/queries/users";

interface Body {
  from: string;
  to: string;
}

/** Self-editable company/KYC fields — the same set the Strategic Partnerships wizard collects,
 *  now also editable from the My Profile page (Deal Room Feedback Batch v2, Phase 2) so a
 *  `registered` investor can self-serve their profile before requesting qualified-investor
 *  review, and a `qualified` investor can keep it current afterwards. Never accepts `role` or
 *  `accountStatus` — those stay staff-only via /api/users/[id]. */
interface KycBody {
  organization?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  hqAddress?: string | null;
  businessRegistrationId?: string | null;
  websiteUrl?: string | null;
  executiveRepresentativeName?: string | null;
  executiveRepresentativeTitle?: string | null;
}

const KYC_KEYS: (keyof KycBody)[] = [
  "organization",
  "jobTitle",
  "phone",
  "hqAddress",
  "businessRegistrationId",
  "websiteUrl",
  "executiveRepresentativeName",
  "executiveRepresentativeTitle",
];

/**
 * PATCH /api/account/profile — self-service update of a user's own company/KYC/representative
 * fields, from the My Profile page. Any authenticated role; only ever touches the caller's own
 * `profiles` row (updateUserProfile keys on the session's userId, never a body-supplied id).
 */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });

    const body = (await request.json()) as KycBody;
    const updates: KycBody = {};
    for (const key of KYC_KEYS) {
      if (body[key] !== undefined) updates[key] = typeof body[key] === "string" ? body[key]!.trim() || null : body[key];
    }

    const updated = await updateUserProfile(user.userId, updates);
    await logAuditEvent({
      actorUserId: user.userId,
      actorName: user.name,
      action: "user.company_profile_updated",
      entityType: "user",
      entityId: user.userId,
      metadata: { fields: Object.keys(updates) },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/account/profile — records a `user.profile_updated` audit row after the client-side
 * Better Auth `authClient.updateUser({ name })` call succeeds. Better Auth manages the name mutation
 * itself (outside our Drizzle schema), so this exists purely to keep the change in our audit trail
 * and the per-user Activity feed. Self-only; never mutates another account.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });

    const { from, to } = (await request.json()) as Body;
    await logAuditEvent({
      actorUserId: user.userId,
      actorName: user.name,
      action: "user.profile_updated",
      entityType: "user",
      entityId: user.userId,
      metadata: { field: "name", from: from ?? null, to: to ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
