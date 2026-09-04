import type { MouStatus } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";

export interface MouEngagementParty {
  userId: string | null;
  assignedUserId?: string | null;
}

export interface MouDraftEditActor {
  role: AccountRole;
  userId: string;
}
/**
 * Production-shaped MOU lifecycle (see the Deal Room Engagement and MOU Upgrade plan):
 * drafting -> in_review -> both_approved -> finalized -> ready_for_signature -> executed, with
 * an in_review <-> drafting correction loop and a staff-only "reopen" escape hatch from
 * finalized/ready_for_signature back to drafting (e.g. a late-discovered mistake). Real
 * e-signature capture is deliberately out of scope — "executed" only ever records signer
 * metadata (see lib/db/schema/mous.ts), never a live signature.
 */
const MOU_TRANSITIONS: Record<MouStatus, MouStatus[]> = {
  drafting: ["in_review"],
  in_review: ["drafting", "both_approved"],
  both_approved: ["drafting", "finalized"],
  finalized: ["ready_for_signature", "drafting"],
  ready_for_signature: ["executed", "drafting"],
  executed: [],
};

export function canTransitionMou(from: MouStatus, to: MouStatus): boolean {
  if (from === to) return true;
  return MOU_TRANSITIONS[from]?.includes(to) ?? false;
}

export const MOU_STATUS_LABELS: Record<MouStatus, string> = {
  drafting: "Drafting",
  in_review: "In Review",
  both_approved: "Both Parties Approved",
  finalized: "Finalized",
  ready_for_signature: "Ready for Signature",
  executed: "Executed",
};

/** Left-to-right stepper order for the MOU tab's progress indicator. */
export const MOU_STATUS_ORDER: MouStatus[] = [
  "drafting",
  "in_review",
  "both_approved",
  "finalized",
  "ready_for_signature",
  "executed",
];

/** ZIDA-side approver for the dual-approval gate — Admin/Super Admin/Government, mirroring the
 *  schema comment on engagement_mous.zidaApprovedBy (oversight roles may approve without
 *  drafting). */
export function isZidaApproverRole(role: AccountRole): boolean {
  return role === "admin" || role === "super_admin" || role === "government";
}

/** Only Admin/Super Admin draft content and drive the doc through finalize/ready-for-signature/
 *  execution — Government is approve-only oversight. Investors co-draft content while status is
 *  drafting (see canEditMouDraft). */
export function canEditMouContent(role: AccountRole): boolean {
  return role === "admin" || role === "super_admin";
}

/** Qualified owner or assigned delegate on the engagement. */
export function isEngagementInvestorParty(
  actor: MouDraftEditActor,
  engagement: MouEngagementParty
): boolean {
  if (actor.role !== "qualified") return false;
  return actor.userId === engagement.userId || actor.userId === engagement.assignedUserId;
}

/** Investor-side co-drafting is limited to the drafting stage only. */
export function canInvestorCoDraftMou(
  actor: MouDraftEditActor,
  engagement: MouEngagementParty,
  mouStatus: MouStatus
): boolean {
  return mouStatus === "drafting" && isEngagementInvestorParty(actor, engagement);
}

/** Staff always; investors only while drafting on their own engagement. */
export function canEditMouDraft(
  actor: MouDraftEditActor,
  engagement: MouEngagementParty,
  mouStatus: MouStatus
): boolean {
  return canEditMouContent(actor.role) || canInvestorCoDraftMou(actor, engagement, mouStatus);
}