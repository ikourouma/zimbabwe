import type { AccountRole } from "@/lib/auth/types";

/** Role tiers a console admin (ZIDA staff) may create or assign. Admins operate strictly below the
 *  platform-owner (super_admin) tier and can never mint another admin or super_admin — only the
 *  super_admin (Afronovation) can. Super_admin may assign any role. `ministry_admin` gets a single,
 *  narrow exception (Platform Feedback Batch v3, Phase 1): they may create ordinary `government`-
 *  role staff for their own ministry (force-locked server-side in POST /api/users/create), but
 *  never another `ministry_admin` peer — a second Ministry Admin seat stays a distinct,
 *  ZIDA-validated action via the org-invite pipeline, not a routine direct creation. */
export function assignableRoles(actorRole: AccountRole): AccountRole[] {
  if (actorRole === "super_admin")
    return ["registered", "qualified", "government", "ministry_admin", "admin", "super_admin"];
  if (actorRole === "admin") return ["registered", "qualified", "government", "ministry_admin"];
  if (actorRole === "ministry_admin") return ["government"];
  return [];
}

/** Whether `actorRole` is allowed to manage (change role/status of) an account currently at
 *  `targetRole`. A console admin may never act on an admin or super_admin account; the super_admin
 *  has no ceiling. Used as the server-side authorization ceiling shared by every user-mutation route
 *  (never trust the client to enforce this). */
export function canManageTarget(actorRole: AccountRole, targetRole: AccountRole): boolean {
  if (actorRole === "super_admin") return true;
  if (actorRole === "admin") return targetRole !== "admin" && targetRole !== "super_admin";
  return false;
}
