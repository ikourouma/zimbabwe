import type { InvestmentProject, Ministry } from "@/lib/types";

/** Whether a project is tied to `ministryId` as either its primary or a secondary beneficiary —
 *  the one shared predicate both the /ministry console's data-visibility gates (Deal Room Feedback
 *  Batch v2, Phase 6) and its list-filtering UI should use, so "which projects belong to my
 *  ministry" is never redefined in two places. */
export function projectMatchesMinistry(project: InvestmentProject, ministryId: string): boolean {
  return (
    project.primaryBeneficiaryMinistryId === ministryId ||
    Boolean(project.secondaryBeneficiaryMinistryIds?.includes(ministryId))
  );
}

/**
 * `ministry_admin` project visibility (Phase 6): full staff-like visibility (every status,
 * including drafts/under-review) for their own ministry's projects — the same "responsible for
 * all activities related to their designated ministry" authority a console admin has, just
 * narrowed to one ministry — but only once an investor-authored proposal has actually been
 * submitted for review; a still-private investor draft isn't ministry business yet even if it's
 * tagged to that ministry. Everything outside their ministry falls back to the standard
 * published-only visibility every non-staff viewer gets (enforced by the caller alongside this,
 * via the existing `!p.investorSubmitted || p.projectStatus === "published" || …` condition).
 */
export function isVisibleToMinistryAdmin(project: InvestmentProject, ministryId: string): boolean {
  if (!projectMatchesMinistry(project, ministryId)) return false;
  return !project.investorSubmitted || project.projectStatus !== "draft";
}

/**
 * The effective ZIDA Case Manager (`admin`/`super_admin` userId) for a project (Team Ministry
 * Traceability Batch, Phase 2, item 6) — a per-project override always wins; otherwise falls
 * back to the project's primary ministry's own default desk officer. `null` means nobody has
 * been assigned yet (perfectly valid — assignment is advisory metadata, never an access gate).
 */
export function resolveProjectCaseManager(project: InvestmentProject, ministry: Ministry | undefined | null): string | null {
  return project.assignedStaffUserId ?? ministry?.assignedStaffUserId ?? null;
}
