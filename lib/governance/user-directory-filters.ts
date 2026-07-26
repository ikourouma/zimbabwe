import type { AccountStatus, AdminUserRecord } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";
import { formatAccountRef } from "@/lib/utils/account-ref";

/**
 * Users & Roles "Sovereign Compliance & Identity Drawer" filter taxonomy — every dimension here is
 * backed by a real, already-collected field (NDA clickwrap timestamp, KYC-at-NDA capture, ministry
 * binding). MFA posture is the one deliberate exception: no per-user MFA enforcement field exists
 * anywhere in the schema yet (see the "MFA Compliance: 0% — Not enforced" KPI on the workspace and
 * the disabled "Console Policy Enforced" action in the Security & Governance tab), so that filter
 * reflects the honest platform-wide reality rather than fabricating a per-user flag.
 */
export type NdaStatus = "all" | "signed" | "pending";
export type AccreditationStatus = "all" | "verified" | "pending";
export type MfaPosture = "all" | "enforced" | "optional";

export const NDA_STATUS_LABELS: Record<Exclude<NdaStatus, "all">, string> = {
  signed: "NDA Signed",
  pending: "NDA Pending",
};

export const ACCREDITATION_LABELS: Record<Exclude<AccreditationStatus, "all">, string> = {
  verified: "Verified",
  pending: "Pending Vetting",
};

export const MFA_POSTURE_LABELS: Record<Exclude<MfaPosture, "all">, string> = {
  enforced: "MFA Enforced",
  optional: "MFA Optional",
};

export interface UserComplianceFilters {
  search: string;
  ndaStatus: NdaStatus;
  accreditation: AccreditationStatus;
  mfaPosture: MfaPosture;
  ministryId: string; // "all" or a real ministries.id
}

export const DEFAULT_USER_COMPLIANCE_FILTERS: UserComplianceFilters = {
  search: "",
  ndaStatus: "all",
  accreditation: "all",
  mfaPosture: "all",
  ministryId: "all",
};

export type RoleFilter = "all" | AccountRole;
export type StatusFilter = "all" | AccountStatus;

type UserFilterDimension = "role" | "status" | "search" | "ndaStatus" | "accreditation" | "mfaPosture" | "ministryId";

/** Matches one user row against the full filter set (role + status + the compliance drawer).
 *  `exclude` skips a single dimension — used to compute each pill/button's own "live" count
 *  against everything *except* itself, the same pattern used by the audit log filter bar and the
 *  project registries' governance-stage pills. */
export function matchesUserRow(
  user: AdminUserRecord,
  roleFilter: RoleFilter,
  statusFilter: StatusFilter,
  filters: UserComplianceFilters,
  exclude?: UserFilterDimension
): boolean {
  if (exclude !== "role" && roleFilter !== "all" && user.role !== roleFilter) return false;
  if (exclude !== "status" && statusFilter !== "all" && user.accountStatus !== statusFilter) return false;

  if (exclude !== "search" && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const haystack = [user.name, user.email, formatAccountRef(user.accountSeq), user.organization ?? ""].join(" ").toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (exclude !== "ndaStatus" && filters.ndaStatus !== "all") {
    const signed = Boolean(user.ndaAcceptedAt);
    if (filters.ndaStatus === "signed" && !signed) return false;
    if (filters.ndaStatus === "pending" && signed) return false;
  }
  if (exclude !== "accreditation" && filters.accreditation !== "all") {
    if (filters.accreditation === "verified" && !user.hasCompletedKyc) return false;
    if (filters.accreditation === "pending" && user.hasCompletedKyc) return false;
  }
  // See the module doc comment — "enforced" has no real accounts yet by design, "optional"/"all"
  // never filter anything out.
  if (exclude !== "mfaPosture" && filters.mfaPosture === "enforced") return false;
  if (exclude !== "ministryId" && filters.ministryId !== "all" && user.ministryId !== filters.ministryId) return false;

  return true;
}
