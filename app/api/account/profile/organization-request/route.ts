import { NextResponse } from "next/server";
import { handleRouteError, ApiError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { fetchOrgOwnership } from "@/lib/db/queries/org-team";
import { notifyUser } from "@/lib/email/notify";

interface Body {
  note?: string;
}

/**
 * POST /api/account/profile/organization-request — a team member's escape hatch now that they can
 * no longer rename their own `organization` field directly (see the guard in
 * PATCH /api/account/profile). Does not change any data itself; it notifies the org owner and
 * writes an audit row so ZIDA staff see the request in the existing Audit Logs console. The owner
 * (or staff) still makes the actual correction via their own profile / the Users & Roles console.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });

    const ownership = await fetchOrgOwnership(user.userId);
    if (!ownership) {
      throw new ApiError("You don't belong to a team with an organisation owner to ask.", 400);
    }

    const { note } = (await request.json().catch(() => ({}))) as Body;
    const trimmedNote = note?.trim() || null;

    await logAuditEvent({
      actorUserId: user.userId,
      actorName: user.name,
      action: "user.organization_change_requested",
      entityType: "user",
      entityId: ownership.ownerUserId,
      metadata: {
        requestedByName: user.name,
        requestedByEmail: user.email,
        ownerName: ownership.ownerName,
        note: trimmedNote,
      },
    });

    void notifyUser({
      userId: ownership.ownerUserId,
      prefKey: "teamActivity",
      subject: "A teammate flagged your organisation name",
      bodyHtml: `<p><strong>${user.name}</strong> (${user.email}) thinks your organisation's name on file may be out of date${
        trimmedNote ? `:</p><p>"${trimmedNote}"` : "."
      }</p><p>Update it from your My Profile page whenever convenient — it's shared by your whole team.</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
