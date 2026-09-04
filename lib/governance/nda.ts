import type { AccountRole } from "@/lib/auth/types";

/**
 * Sovereign Confidentiality Framework (clickwrap NDA) shown to qualified investors on first Deal
 * Room access. Bump NDA_VERSION whenever the terms change — the NdaGate re-prompts any investor
 * whose recorded acceptance version differs from the current one.
 */
export const NDA_VERSION = "1.0";

/**
 * The clickwrap gates every non-staff role — `registered`, `qualified`, `government`, and
 * `ministry_admin` — before they can access their own console (Platform Feedback Batch v3, Phase
 * 3: broadened from `qualified`-only). `admin`/`super_admin` remain exempt: they're ZIDA-internal
 * oversight roles, not confidential-information recipients under the NDA (mirrors the existing
 * check in the document download route). `government`/`ministry_admin` were previously treated as
 * staff for this purpose too, which was inconsistent with them being non-staff, ministry-scoped
 * console users everywhere else in the platform.
 */
export function requiresNdaAcceptance(role: AccountRole): boolean {
  return role === "registered" || role === "qualified" || role === "government" || role === "ministry_admin";
}

/** Shared 403 body for every server-side NDA gate (document downloads, MOU routes) so the
 *  message a caller sees is identical no matter which endpoint blocked them. */
export const NDA_REQUIRED_MESSAGE =
  "Accept the Sovereign Confidentiality Framework in the Deal Room before accessing this record.";

export const NDA_TITLE = "Sovereign Confidentiality Framework";

export const NDA_CLAUSES: string[] = [
  "All project information, financial data, and deal terms accessed in the ZIDA Deal Room are strictly confidential and provided solely to evaluate a potential investment.",
  "I will not disclose, reproduce, or distribute any confidential information to third parties without the prior written consent of the Zimbabwe Investment and Development Agency (ZIDA).",
  "I will use confidential information only for the purpose of assessing and progressing a bona fide investment engagement, and for no other purpose.",
  "I understand that no information in the Deal Room constitutes a binding offer, and that any commitment arises only from a duly executed agreement between the parties.",
  "I confirm that I am authorized to accept these terms on behalf of the organization I represent, and that unauthorized use may give rise to legal liability.",
];
