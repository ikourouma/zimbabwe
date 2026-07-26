import type { InferSelectModel } from "drizzle-orm";
import type { LeadInquiry } from "@/lib/types";
import type { strategicInquiries } from "@/lib/db/schema";

type InquiryRow = InferSelectModel<typeof strategicInquiries>;

export function mapDbInquiryToApp(row: InquiryRow, projectId?: string): LeadInquiry {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    organization: row.organization ?? undefined,
    message: row.message ?? undefined,
    contactReasonId: row.contactReasonId ?? undefined,
    projectId: projectId ?? row.projectId ?? undefined,
    engagementType: row.engagementType ?? undefined,
    investorType: row.investorType ?? undefined,
    sectorIds: row.sectorIds ?? undefined,
    ticketSizeRange: row.ticketSizeRange ?? undefined,
    partnershipType: row.partnershipType ?? undefined,
    ministryRepresented: row.ministryRepresented ?? undefined,
    natureOfEngagement: row.natureOfEngagement ?? undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapAppInquiryToDb(inquiry: Omit<LeadInquiry, "id" | "createdAt">, dbProjectId?: string) {
  return {
    type: inquiry.type,
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone ?? null,
    organization: inquiry.organization ?? null,
    message: inquiry.message ?? null,
    contactReasonId: inquiry.contactReasonId ?? null,
    projectId: dbProjectId ?? null,
    engagementType: inquiry.engagementType ?? null,
    investorType: inquiry.investorType ?? null,
    sectorIds: inquiry.sectorIds ?? null,
    ticketSizeRange: inquiry.ticketSizeRange ?? null,
    partnershipType: inquiry.partnershipType ?? null,
    ministryRepresented: inquiry.ministryRepresented ?? null,
    natureOfEngagement: inquiry.natureOfEngagement ?? null,
    status: inquiry.status ?? "pending",
  };
}
