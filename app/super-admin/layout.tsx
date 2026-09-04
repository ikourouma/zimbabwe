import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { destinationForWrongConsole, isConsoleAllowedForRole } from "@/lib/auth/console-guard";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user && !isConsoleAllowedForRole("super-admin", user.role)) {
    redirect(destinationForWrongConsole(user));
  }
  return children;
}
