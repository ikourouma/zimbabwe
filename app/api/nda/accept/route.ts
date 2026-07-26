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
  organization?: string;
  phone?: string;
  hqAddress?: string;
  businessRegistrationId?: string;
  websiteUrl?: string;
}

/**
 * POST /api/nda/accept — records a qualified investor's clickwrap acceptance of the current NDA
 * version onto their `profiles` row (immutable legal audit trail: timestamp, version, IP, and the
 * legal title they attested under). Idempotent-ish: re-accepting simply re-stamps the record.
 *
 * Also gates on the institutional KYC fields (company, phone, HQ address, business registration
 * id, corporate website) required at Tier-2 access — enforced server-side too, not just in the
 * nda-gate.tsx dialog, since this is the actual authorization boundary.
 */
export async function POST(request: Request) {
  try {
    // Only Deal Room personas need the NDA; staff roles are ZIDA-internal and exempt.
    const actor = await requireRole(["qualified"]);
    const body = (await request.json().catch(() => ({}))) as NdaAcceptBody;

    const kyc = {
      organization: body.organization?.trim() || "",
      phone: body.phone?.trim() || "",
      hqAddress: body.hqAddress?.trim() || "",
      businessRegistrationId: body.businessRegistrationId?.trim() || "",
      websiteUrl: body.websiteUrl?.trim() || "",
    };
    const missing = Object.entries(kyc).filter(([, v]) => !v);
    if (!body.title?.trim() || missing.length > 0) {
      return NextResponse.json(
        { error: "Company name, phone, HQ address, business registration ID, and website are all required to accept the Confidentiality Framework." },
        { status: 400 }
      );
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
        organization: kyc.organization,
        phone: kyc.phone,
        hqAddress: kyc.hqAddress,
        businessRegistrationId: kyc.businessRegistrationId,
        websiteUrl: kyc.websiteUrl,
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
