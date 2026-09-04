import { ConsoleRedirect } from "@/components/dashboard/console-redirect";
import { guardConsoleLayout } from "@/lib/auth/guard-console-layout";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await guardConsoleLayout("super-admin");
  if (!gate.allowed) return <ConsoleRedirect destination={gate.destination} />;
  return children;
}
