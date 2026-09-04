import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { fetchAuditLogsByActor, logAuditEvent, logRoleChangeEvent } from "@/lib/db/queries/audit";
import { fetchEngagementsByUserId } from "@/lib/db/queries/engagements";
import { fetchUserDetail, fetchUserRole, updateUserProfile } from "@/lib/db/queries/users";
import { assignableRoles, canManageTarget } from "@/lib/auth/user-governance";
import type { AccountRole } from "@/lib/auth/types";
import type { AccountStatus, UserDossierDownload } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

interface UpdateUserBody {
  role?: AccountRole;
  accountStatus?: AccountStatus;
  /** "Edit details" row action — safe-to-admin-edit profile metadata (deliberately not Name/Email,
   *  which are Better-Auth-owned). `null` clears the field. */
  organization?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  /** Institutional KYC + Executive Representative fields (Platform Feedback Batch v4, Phase 4) —
   *  same admin-editable set already captured at KYC-at-NDA time, now correctable here too instead
   *  of only ever being self-edited by the account holder. `null` clears the field. */
  hqAddress?: string | null;
  businessRegistrationId?: string | null;
  websiteUrl?: string | null;
  executiveRepresentativeName?: string | null;
  executiveRepresentativeTitle?: string | null;
  /** Ministry rebind (Institutional Compliance Dossier round) — previously only set at account
   *  creation; this lets Admin/Platform Admin correct a government account's ministry binding
   *  afterward. `null` unassigns it. */
  ministryId?: string | null;
  /** Mandatory justification captured by the role-change confirmation modal — persisted into the
   *  audit trail so privileged changes are always attributable and reviewable. */
  reason?: string;
}

/**
 * Single-user Institutional Compliance Dossier payload — base directory fields, institutional KYC
 * + NDA acceptance trail (previously only exposed to the user themself via /api/me), a real
 * domain-verification signal, and this user's own engagement/document activity. Same admin/
 * super_admin ceiling as the directory list (GET /api/users); no per-target ceiling here since
 * viewing (unlike mutating) an admin/super_admin account's dossier is not itself a privilege
 * escalation.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await params;

    const dossier = await fetchUserDetail(id);
    if (!dossier) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [engagements, actorAuditRows] = await Promise.all([
      fetchEngagementsByUserId(id),
      fetchAuditLogsByActor(id, 100),
    ]);

    const toDossierDownload = (row: (typeof actorAuditRows)[number]): UserDossierDownload => ({
      id: row.id,
      documentTitle: (row.metadata?.title as string | undefined) ?? null,
      projectId: (row.metadata?.projectId as string | undefined) ?? null,
      downloadedAt: row.createdAt,
    });

    const downloadItems = actorAuditRows.filter((row) => row.action === "document.downloaded").map(toDossierDownload);
    const previewItems = actorAuditRows.filter((row) => row.action === "document.previewed").map(toDossierDownload);

    dossier.engagements = engagements;
    dossier.documentDownloads = { count: downloadItems.length, items: downloadItems };
    dossier.documentPreviews = { count: previewItems.length, items: previewItems };

    return NextResponse.json(dossier);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // Console admins may manage users too, but only below their tier — enforced server-side below
    // (the client UI mirrors this, but the ceiling is authoritative here).
    const actor = await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const body = (await request.json()) as UpdateUserBody;

    const { reason, ...patch } = body;

    // Ceiling 1: an admin may never act on an admin/super_admin account.
    const targetRole = await fetchUserRole(id);
    if (targetRole === null) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!canManageTarget(actor.role, targetRole)) {
      return NextResponse.json({ error: "You are not permitted to manage this account." }, { status: 403 });
    }
    // Ceiling 2: an admin may never promote anyone into the admin/super_admin tier.
    if (patch.role && !assignableRoles(actor.role).includes(patch.role)) {
      return NextResponse.json({ error: "You are not permitted to assign this role." }, { status: 403 });
    }

    // Same KYC-complete rule the inquiry-approval path enforces (Investor Qualification Vetting
    // plan) — without this, a direct Users-console edit was the one way to reach `qualified` with
    // no KYC on file and no application record at all (entitlement governance follow-up). Checked
    // against the *effective* fields — this patch's own values where present, the existing profile
    // otherwise — so an admin can legitimately fill in KYC and promote in the same request.
    if (patch.role === "qualified" && targetRole !== "qualified") {
      const existing = await fetchUserDetail(id);
      const effective = {
        organization: patch.organization !== undefined ? patch.organization : existing?.organization,
        phone: patch.phone !== undefined ? patch.phone : existing?.phone,
        hqAddress: patch.hqAddress !== undefined ? patch.hqAddress : existing?.hqAddress,
        businessRegistrationId:
          patch.businessRegistrationId !== undefined ? patch.businessRegistrationId : existing?.businessRegistrationId,
        websiteUrl: patch.websiteUrl !== undefined ? patch.websiteUrl : existing?.websiteUrl,
      };
      const kycComplete = Object.values(effective).every((v) => typeof v === "string" && v.trim().length > 0);
      if (!kycComplete) {
        return NextResponse.json(
          {
            error:
              "This account's KYC information is incomplete, so its role cannot become Qualified Investor here. Add organization, phone, HQ address, business registration ID, and corporate website via \"Edit details\" first, or approve their Strategic Partnerships application instead.",
            code: "KYC_INCOMPLETE",
          },
          { status: 400 }
        );
      }
    }

    const updated = await updateUserProfile(id, patch);
    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (patch.role && patch.role !== targetRole) {
      await logRoleChangeEvent({
        actorUserId: actor.userId,
        actorName: actor.name,
        targetUserId: id,
        targetEmail: updated.email,
        fromRole: targetRole,
        toRole: patch.role,
        reason: reason?.trim() || null,
        source: "manual",
      });
    }

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "user.updated",
      entityType: "user",
      entityId: id,
      metadata: {
        role: patch.role,
        accountStatus: patch.accountStatus,
        ...(patch.organization !== undefined ? { organization: patch.organization } : {}),
        ...(patch.jobTitle !== undefined ? { jobTitle: patch.jobTitle } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.ministryId !== undefined ? { ministryId: patch.ministryId } : {}),
        ...(patch.hqAddress !== undefined ? { hqAddress: patch.hqAddress } : {}),
        ...(patch.businessRegistrationId !== undefined
          ? { businessRegistrationId: patch.businessRegistrationId }
          : {}),
        ...(patch.websiteUrl !== undefined ? { websiteUrl: patch.websiteUrl } : {}),
        ...(patch.executiveRepresentativeName !== undefined
          ? { executiveRepresentativeName: patch.executiveRepresentativeName }
          : {}),
        ...(patch.executiveRepresentativeTitle !== undefined
          ? { executiveRepresentativeTitle: patch.executiveRepresentativeTitle }
          : {}),
        targetEmail: updated.email,
        reason: reason?.trim() || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
