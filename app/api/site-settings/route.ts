import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { siteSettings } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { mergePublicNavVisibility } from "@/lib/governance/public-nav";
import { mergeFieldVisibility } from "@/lib/entitlements/matrix";

export async function GET() {
  try {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, "singleton")).limit(1);
    return NextResponse.json({
      costStructureHidden: row?.costStructureHidden ?? false,
      flashBannerEnabled: row?.flashBannerEnabled ?? false,
      flashBannerMessage: row?.flashBannerMessage ?? null,
      flashBannerCtaLabel: row?.flashBannerCtaLabel ?? null,
      flashBannerCtaHref: row?.flashBannerCtaHref ?? null,
      bannerDisplayMode: row?.bannerDisplayMode ?? "stack",
      publicNavVisibility: mergePublicNavVisibility(row?.publicNavVisibility),
      fieldVisibility: mergeFieldVisibility(row?.fieldVisibility),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole(["super_admin"]);
    const body = (await request.json()) as Record<string, unknown>;

    await db
      .insert(siteSettings)
      .values({ id: "singleton" })
      .onConflictDoNothing();

    const patch: Record<string, unknown> = {
      updatedBy: user.userId,
      updatedAt: new Date(),
    };
    if (typeof body.costStructureHidden === "boolean") patch.costStructureHidden = body.costStructureHidden;
    if (typeof body.flashBannerEnabled === "boolean") patch.flashBannerEnabled = body.flashBannerEnabled;
    if ("flashBannerMessage" in body) patch.flashBannerMessage = body.flashBannerMessage;
    if ("flashBannerCtaLabel" in body) patch.flashBannerCtaLabel = body.flashBannerCtaLabel;
    if ("flashBannerCtaHref" in body) patch.flashBannerCtaHref = body.flashBannerCtaHref;
    if (body.bannerDisplayMode === "stack" || body.bannerDisplayMode === "rotate") {
      patch.bannerDisplayMode = body.bannerDisplayMode;
    }
    if ("publicNavVisibility" in body) {
      patch.publicNavVisibility = mergePublicNavVisibility(body.publicNavVisibility);
    }
    if ("fieldVisibility" in body) {
      patch.fieldVisibility = mergeFieldVisibility(body.fieldVisibility);
    }

    const [updated] = await db
      .update(siteSettings)
      .set(patch)
      .where(eq(siteSettings.id, "singleton"))
      .returning();

    await logAuditEvent({
      actorUserId: user.userId,
      actorName: user.name,
      action: "site_settings.updated",
      entityType: "site_settings",
      entityId: "singleton",
      metadata: body,
    });

    return NextResponse.json({
      costStructureHidden: updated.costStructureHidden,
      flashBannerEnabled: updated.flashBannerEnabled,
      flashBannerMessage: updated.flashBannerMessage,
      flashBannerCtaLabel: updated.flashBannerCtaLabel,
      flashBannerCtaHref: updated.flashBannerCtaHref,
      bannerDisplayMode: updated.bannerDisplayMode,
      publicNavVisibility: mergePublicNavVisibility(updated.publicNavVisibility),
      fieldVisibility: mergeFieldVisibility(updated.fieldVisibility),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
