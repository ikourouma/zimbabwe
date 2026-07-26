import type { InferSelectModel } from "drizzle-orm";
import type { EngagementMou, MouContent, MouFormatting, MouSignatureMetadata } from "@/lib/types";
import type { engagementMous } from "@/lib/db/schema";

type MouRow = InferSelectModel<typeof engagementMous>;

export function mapDbMouToApp(row: MouRow): EngagementMou {
  return {
    id: row.id,
    engagementId: row.engagementId,
    status: row.status,
    content: (row.content as MouContent | null) ?? {},
    contentSnapshot: (row.contentSnapshot as MouContent | null) ?? null,
    formatting: (row.formatting as MouFormatting | null) ?? {},
    formattingLocked: row.formattingLocked,
    investorApprovedAt: row.investorApprovedAt?.toISOString() ?? null,
    investorApprovedBy: row.investorApprovedBy ?? null,
    zidaApprovedAt: row.zidaApprovedAt?.toISOString() ?? null,
    zidaApprovedBy: row.zidaApprovedBy ?? null,
    finalizedAt: row.finalizedAt?.toISOString() ?? null,
    finalizedBy: row.finalizedBy ?? null,
    readyForSignatureAt: row.readyForSignatureAt?.toISOString() ?? null,
    readyForSignatureBy: row.readyForSignatureBy ?? null,
    executedAt: row.executedAt?.toISOString() ?? null,
    executedBy: row.executedBy ?? null,
    signatureMetadata: (row.signatureMetadata as MouSignatureMetadata | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
