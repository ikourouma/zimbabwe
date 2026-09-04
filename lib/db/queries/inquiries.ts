import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { strategicInquiries } from "@/lib/db/schema";
import type { InquiryWizardPayload } from "@/lib/governance/inquiry-wizard-validation";

/** The single in-progress Strategic Partnerships application a signed-in applicant can have —
 *  "draft" (never submitted) or "changes_requested" (submitted, sent back for revision) are both
 *  still owner-editable, so autosave/resume treats them as one active slot per user. Investor
 *  Qualification Vetting plan. */
export async function findActiveDraftInquiry(userId: string) {
  const [row] = await db
    .select()
    .from(strategicInquiries)
    .where(and(eq(strategicInquiries.userId, userId), inArray(strategicInquiries.status, ["draft", "changes_requested"])))
    .orderBy(desc(strategicInquiries.createdAt))
    .limit(1);
  return row ?? null;
}

function payloadToDbFields(payload: InquiryWizardPayload) {
  return {
    engagementType: payload.engagementType || null,
    name: payload.name ?? "",
    email: payload.email ?? "",
    organization: payload.organization || null,
    phone: payload.phone || null,
    hqAddress: payload.hqAddress || null,
    businessRegistrationId: payload.businessRegistrationId || null,
    websiteUrl: payload.websiteUrl || null,
    investorType: payload.investorType || null,
    sectorIds: payload.sectorIds && payload.sectorIds.length > 0 ? payload.sectorIds : null,
    ticketSizeRange: payload.ticketSizeRange || null,
    ministryRepresented: payload.ministryRepresented || null,
    natureOfEngagement: payload.natureOfEngagement || null,
    partnershipType: payload.partnershipType || null,
    message: payload.message || null,
  };
}

/**
 * Upserts the current user's single active draft application. `submit: true` flips the status to
 * `pending` (locking it into the staff review queue) and clears any stale reviewedBy/reviewedAt
 * from a prior decision cycle; `submit: false` is the autosave path and never changes an existing
 * row's status (so a "changes_requested" draft stays visibly flagged for revision until the
 * applicant actually resubmits, not on every keystroke).
 */
export async function upsertDraftInquiry(userId: string, payload: InquiryWizardPayload, submit: boolean) {
  const existing = await findActiveDraftInquiry(userId);
  const fields = payloadToDbFields(payload);

  if (existing) {
    const [updated] = await db
      .update(strategicInquiries)
      .set({
        ...fields,
        ...(submit ? { status: "pending" as const, reviewedBy: null, reviewedAt: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(strategicInquiries.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(strategicInquiries)
    .values({
      type: "strategic_partnership",
      userId,
      status: submit ? "pending" : "draft",
      ...fields,
    })
    .returning();
  return inserted;
}
