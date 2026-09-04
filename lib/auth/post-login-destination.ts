export interface PostLoginProfile {
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  isQualified?: boolean;
  isMinistryAdmin?: boolean;
}

/** Role-aware landing route after successful sign-in. `/deal-room` (the Investor Dashboard) is
 *  tiered for `registered` users too (Investor Dashboard Expansion plan), so it's the landing spot
 *  for every non-staff authenticated role except `ministry_admin`, who has their own console-admin-
 *  at-ministry-level shell at `/ministry` (Platform Feedback Batch v3, Phase 1) and previously fell
 *  through to `/deal-room` by mistake since `consolesForRole()` never actually granted them access
 *  to it. */
export function getPostLoginDestination(me: PostLoginProfile | null): string {
  if (me?.isSuperAdmin) return "/super-admin";
  if (me?.isAdmin) return "/admin";
  if (me?.isMinistryAdmin) return "/ministry";
  return "/deal-room";
}
