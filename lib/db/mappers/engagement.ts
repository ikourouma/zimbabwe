import type { InferSelectModel } from "drizzle-orm";
import type { InvestorEngagement } from "@/lib/types";
import type { investorEngagements } from "@/lib/db/schema";

type EngagementRow = InferSelectModel<typeof investorEngagements>;

export function mapDbEngagementToApp(row: EngagementRow): InvestorEngagement {
  return {
    id: row.id,
    projectId: row.projectId,
    investorName: row.investorName,
    investorOrganization: row.investorOrganization ?? undefined,
    userId: row.userId ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    ticketSize: row.ticketSize ?? undefined,
    signatoryTitle: row.signatoryTitle ?? undefined,
    certifiedAt: row.certifiedAt?.toISOString() ?? undefined,
    publishedAt: row.publishedAt?.toISOString() ?? undefined,
    archivedAt: row.archivedAt?.toISOString() ?? undefined,
    deletedAt: row.deletedAt?.toISOString() ?? undefined,
    deleteRequestedAt: row.deleteRequestedAt?.toISOString() ?? undefined,
    deleteRequestReason: row.deleteRequestReason ?? undefined,
    deleteRequestStatus: (row.deleteRequestStatus as InvestorEngagement["deleteRequestStatus"]) ?? undefined,
    followThroughStatus: row.followThroughStatus ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
