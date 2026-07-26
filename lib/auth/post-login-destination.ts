export interface PostLoginProfile {
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  isQualified?: boolean;
}

/** Role-aware landing route after successful sign-in. */
export function getPostLoginDestination(me: PostLoginProfile | null): string {
  if (me?.isSuperAdmin) return "/super-admin";
  if (me?.isAdmin) return "/admin";
  if (me?.isQualified) return "/deal-room";
  return "/projects?welcome=1";
}
