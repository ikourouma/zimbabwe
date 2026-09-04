import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { NDA_VERSION } from "@/lib/governance/nda";

interface NdaAcceptBody {
  title?: string;
}

/**
 * POST /api/nda/accept — records a non-staff account's clickwrap acceptance of the current NDA
 * version onto their `profiles` row (immutable legal audit trail: timestamp, version, IP, and the
 * legal title they attested under). Idempotent-ish: re-accepting simply re-stamps the record.
 *
 * Broadened (Platform Feedback Batch v3, Phase 3) from `qualified`-only to every role
 * `requiresNdaAcceptance()` covers — `registered`, `qualified`, `government`, `ministry_admin`.
 *
 * Institutional KYC (company, phone, HQ address, business registration id, corporate website) is
 * no longer submitted here — the Investor Qualification Vetting plan made KYC completeness a hard
 * prerequisite for `role` ever becoming `qualified` (enforced in PATCH /api/inquiries/[id]), so by
 * the time a *qualified* investor reaches this route their KYC is already on file. That check is
 * deliberately scoped to `qualified` only: `registered`/`government`/`ministry_admin` accounts have
 * no institutional-KYC prerequisite at all, so gating them on it here would make the NDA
 * unacceptable for roles that were never meant to complete that flow.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireRole(["registered", "qualified", "government", "ministry_admin"]);
    const body = (await request.json().catch(() => ({}))) as NdaAcceptBody;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Your title / capacity is required to accept the Confidentiality Framework." }, { status: 400 });
    }

    if (actor.role === "qualified") {
      const [profile] = await db
        .select({
          organization: profiles.organization,
          phone: profiles.phone,
          hqAddress: profiles.hqAddress,
          businessRegistrationId: profiles.businessRegistrationId,
          websiteUrl: profiles.websiteUrl,
        })
        .from(profiles)
        .where(eq(profiles.userId, actor.userId));

      const kycComplete = Boolean(
        profile?.organization && profile?.phone && profile?.hqAddress && profile?.businessRegistrationId && profile?.websiteUrl
      );
      if (!kycComplete) {
        return NextResponse.json(
          { error: "Your institutional details are incomplete on file. Please contact ZIDA before accepting the Confidentiality Framework." },
          { status: 400 }
        );
      }
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const now = new Date();

    await db
      .update(profiles)
      .set({
        ndaAcceptedAt: now,
        ndaVersion: NDA_VERSION,
        ndaAcceptedIp: ip,
        ndaAcceptedTitle: body.title.trim(),
        updatedAt: now,
      })
      .where(eq(profiles.userId, actor.userId));

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "nda.accepted",
      entityType: "profile",
      entityId: actor.userId,
      metadata: { version: NDA_VERSION, title: body.title.trim() },
    });

    return NextResponse.json({ ndaAcceptedAt: now.toISOString(), version: NDA_VERSION });
  } catch (error) {
    return handleRouteError(error);
  }
}
