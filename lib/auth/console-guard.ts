import { consolesForRole, type DashboardConsole } from "@/components/dashboard/dashboard-nav-config";
import { getPostLoginDestination } from "@/lib/auth/post-login-destination";
import type { AccountRole } from "@/lib/auth/types";

export function isConsoleAllowedForRole(console: DashboardConsole, role: AccountRole | null): boolean {
  return consolesForRole(role).includes(console);
}

export function destinationForWrongConsole(user: {
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  isMinistryAdmin?: boolean;
  isQualified?: boolean;
}): string {
  return getPostLoginDestination(user);
}
