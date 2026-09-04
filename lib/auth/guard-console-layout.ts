import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DashboardConsole } from "@/lib/auth/console-access";
import { destinationForWrongConsole, isConsoleAllowedForRole } from "@/lib/auth/console-guard";
import { getCurrentUser } from "@/lib/auth/session";

/** Server-side console gate — used by /admin, /super-admin, /deal-room, and /ministry layouts.
 *  Calls cookies() so the segment stays dynamic and session cookies are always read per request. */
export async function guardConsoleLayout(targetConsole: DashboardConsole) {
  await cookies();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }
  if (!isConsoleAllowedForRole(targetConsole, user.role)) {
    redirect(destinationForWrongConsole(user));
  }
  return user;
}
