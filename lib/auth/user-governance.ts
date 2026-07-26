import type { AccountRole } from "@/lib/auth/types";

/** Role tiers a console admin (ZIDA staff) may create or assign. Admins operate strictly below the
 *  platform-owner (super_admin) tier and can never mint another admin or super_admin — only the
 *  super_admin (Afronovation) can. Super_admin may assign any role. */
export function assignableRoles(actorRole: AccountRole): AccountRole[] {
  if (actorRole === "super_admin") return ["registered", "qualified", "government", "admin", "super_admin"];
  if (actorRole === "admin") return ["registered", "qualified", "government"];
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
