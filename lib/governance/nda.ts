import type { AccountRole } from "@/lib/auth/types";

/**
 * Sovereign Confidentiality Framework (clickwrap NDA) shown to qualified investors on first Deal
 * Room access. Bump NDA_VERSION whenever the terms change — the NdaGate re-prompts any investor
 * whose recorded acceptance version differs from the current one.
 */
export const NDA_VERSION = "1.0";

/**
 * The clickwrap only ever gates the `qualified` investor persona — admin/super_admin/government
 * are ZIDA-side oversight roles, not confidential-information recipients under the NDA, so they
 * are never asked to accept it (mirrors the existing check in the document download route).
 */
export function requiresNdaAcceptance(role: AccountRole): boolean {
  return role === "qualified";
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
