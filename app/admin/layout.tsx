import { ConsoleRedirect } from "@/components/dashboard/console-redirect";
import { guardConsoleLayout } from "@/lib/auth/guard-console-layout";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await guardConsoleLayout("admin");
  if (!gate.allowed) return <ConsoleRedirect destination={gate.destination} />;
  return children;
}
