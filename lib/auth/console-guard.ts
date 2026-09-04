import { isConsoleAllowedForRole, type DashboardConsole } from "@/lib/auth/console-access";
import { getPostLoginDestination } from "@/lib/auth/post-login-destination";

export { isConsoleAllowedForRole };

export function destinationForWrongConsole(user: {
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  isMinistryAdmin?: boolean;
  isQualified?: boolean;
}): string {
  return getPostLoginDestination(user);
}

export type { DashboardConsole };
