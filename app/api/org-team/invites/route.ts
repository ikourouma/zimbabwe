import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { createOrgInvite, fetchOrgInvitesByOwner } from "@/lib/db/queries/org-team";
import { logAuditEvent } from "@/lib/db/queries/audit";

/** GET/POST org-team invites, owner-scoped — the qualified investor's own "My Team" panel
 *  (Deal Room Feedback Batch v2, Phase 5), reused unmodified by `ministry_admin` (Phase 6) for
 *  inviting their own ministry staff. `approveOrgInvite` resolves the invitee's role/scope from
 *  the *owner's own* role at approval time — a qualified owner's invitees become `qualified` +
 *  `organization`; a ministry_admin owner's invitees become `ministry_admin` + the same
 *  `ministryId` (peers on the same ministry desk, not a lesser sub-role). See
 *  app/api/org-team/pending/route.ts for the separate staff-facing platform-wide validation queue. */
export async function GET() {
  try {
    const actor = await requireRole(["qualified", "ministry_admin"]);
    const invites = await fetchOrgInvitesByOwner(actor.userId);
    return NextResponse.json(invites);
  } catch (error) {
    return handleRouteError(error);
  }
}

type InviteInput = { inviteEmail?: string; inviteName?: string; justification?: string; phone?: string; address?: string };

/** Validates one invite entry against the actor's own email — shared by both the single-invite and
 *  bulk-invite bodies below so the two paths can never drift on what counts as a valid row. */
function validateInviteInput(
  input: InviteInput,
  actorEmail: string
): { inviteEmail: string; inviteName: string; justification?: string; phone?: string; address?: string } | { error: string } {
  const inviteEmail = input.inviteEmail?.trim().toLowerCase();
  const inviteName = input.inviteName?.trim();
  if (!inviteEmail || !inviteEmail.includes("@")) return { error: "A valid email is required." };
  if (!inviteName) return { error: "A full name is required." };
  if (inviteEmail === actorEmail.toLowerCase()) return { error: "You can't invite yourself." };
  return {
    inviteEmail,
    inviteName,
    justification: input.justification?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
  };
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole(["qualified", "ministry_admin"]);
    const body = (await request.json()) as InviteInput & { invites?: InviteInput[] };

    // Bulk path (Team Ministry Traceability Batch, Phase 4, item 4) — an array of rows from the
    // Teams page's "Invite multiple" form. Each row is validated/created independently and the
    // response reports per-row success/failure rather than all-or-nothing, so one bad email in a
    // batch of ten doesn't block the other nine.
    if (Array.isArray(body.invites)) {
      const seenEmails = new Set<string>();
      const results: { inviteEmail: string; inviteName: string; ok: boolean; error?: string; invite?: unknown }[] = [];
      for (const raw of body.invites) {
        const validated = validateInviteInput(raw, actor.email);
        if ("error" in validated) {
          results.push({ inviteEmail: raw.inviteEmail ?? "", inviteName: raw.inviteName ?? "", ok: false, error: validated.error });
          continue;
        }
        if (seenEmails.has(validated.inviteEmail)) {
          results.push({ ...validated, ok: false, error: "Duplicate email in this batch." });
          continue;
        }
        seenEmails.add(validated.inviteEmail);
        try {
          const invite = await createOrgInvite(actor.userId, validated.inviteEmail, validated.inviteName, validated);
          await logAuditEvent({
            actorUserId: actor.userId,
            actorName: actor.name,
            action: "org_invite.created",
            entityType: "org_invite",
            entityId: invite.id,
            metadata: { inviteEmail: validated.inviteEmail, inviteName: validated.inviteName, bulk: true },
          });
          results.push({ ...validated, ok: true, invite });
        } catch (err) {
          results.push({ ...validated, ok: false, error: err instanceof Error ? err.message : "Could not send invite" });
        }
      }
      return NextResponse.json({ results }, { status: 200 });
    }

    const validated = validateInviteInput(body, actor.email);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const invite = await createOrgInvite(actor.userId, validated.inviteEmail, validated.inviteName, validated);

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "org_invite.created",
      entityType: "org_invite",
      entityId: invite.id,
      metadata: { inviteEmail: validated.inviteEmail, inviteName: validated.inviteName },
    });

    return NextResponse.json(invite, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
