import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { destinationForWrongConsole, isConsoleAllowedForRole } from "@/lib/auth/console-guard";

export default async function MinistryLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user && !isConsoleAllowedForRole("ministry", user.role)) {
    redirect(destinationForWrongConsole(user));
  }
  return children;
}
