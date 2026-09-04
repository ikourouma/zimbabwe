import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { accreditationDocuments, auditLogs, engagementMous, investorEngagements } from "@/lib/db/schema";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign-in required" }, { status: 401 });

    const engagements = await db
      .select({ id: investorEngagements.id, projectId: investorEngagements.projectId })
      .from(investorEngagements)
      .where(eq(investorEngagements.userId, user.userId));
    const engagementIds = engagements.map((e) => e.id);

    const mous =
      engagementIds.length === 0
        ? []
        : await db
            .select()
            .from(engagementMous)
            .where(inArray(engagementMous.engagementId, engagementIds))
            .orderBy(desc(engagementMous.updatedAt));

    const downloads = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.actorUserId, user.userId), eq(auditLogs.action, "document.downloaded")))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);

    const accreditation = await db
      .select()
      .from(accreditationDocuments)
      .where(eq(accreditationDocuments.userId, user.userId))
      .orderBy(desc(accreditationDocuments.createdAt));

    return NextResponse.json({
      nda: user.ndaAcceptedAt
        ? { acceptedAt: user.ndaAcceptedAt, version: user.ndaVersion, ip: user.ndaAcceptedIp }
        : null,
      businessRegistration: Boolean(user.businessRegistrationDocKey),
      accreditation: accreditation.map((r) => ({
        id: r.id,
        kind: r.kind,
        fileName: r.fileName,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      mous: mous.map((m) => ({
        id: m.id,
        engagementId: m.engagementId,
        status: m.status,
        hasSnapshot: Boolean(m.contentSnapshot),
        updatedAt: m.updatedAt.toISOString(),
      })),
      downloads: downloads.map((d) => ({
        id: d.id,
        entityId: d.entityId,
        createdAt: d.createdAt.toISOString(),
        metadata: d.metadata,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
