import { ConsoleRedirect } from "@/components/dashboard/console-redirect";
import { guardConsoleLayout } from "@/lib/auth/guard-console-layout";

export const dynamic = "force-dynamic";

export default async function DealRoomLayout({ children }: { children: React.ReactNode }) {
  const gate = await guardConsoleLayout("deal-room");
  if (!gate.allowed) return <ConsoleRedirect destination={gate.destination} />;
  return children;
}
