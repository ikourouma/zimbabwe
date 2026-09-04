import { cookies } from "next/headers";
import type { DashboardConsole } from "@/lib/auth/console-access";
import { destinationForWrongConsole, isConsoleAllowedForRole } from "@/lib/auth/console-guard";
import { getCurrentUser, type CurrentUserContext } from "@/lib/auth/session";

export type ConsoleGateDecision =
  | { allowed: true; user: CurrentUserContext }
  | { allowed: false; destination: string };

/**
 * Server-side console gate for the /admin, /super-admin, /deal-room, and /ministry layouts.
 *
 * Returns a decision instead of calling redirect(). redirect() is unreliable here: the root
 * layout renders synchronously, so React can commit the HTML shell before this async layout
 * resolves, and Next then downgrades the throw to an RSC-stream redirect carrying
 * `NEXT_REDIRECT;replace;/deal-room;307;` on a 200 response — with the whole console page still
 * rendered into the body. /ministry lost that race on every request. Returning a decision lets
 * the layout skip `children` entirely, so an unauthorized user can never be served console HTML
 * regardless of when the shell flushes.
 *
 * Calls cookies() so the segment stays dynamic and session cookies are read per request.
 */
export async function guardConsoleLayout(targetConsole: DashboardConsole): Promise<ConsoleGateDecision> {
  await cookies();
  const user = await getCurrentUser();

  if (!user) {
    return { allowed: false, destination: "/auth/sign-in" };
  }
  if (!isConsoleAllowedForRole(targetConsole, user.role)) {
    return { allowed: false, destination: destinationForWrongConsole(user) };
  }
  return { allowed: true, user };
}
