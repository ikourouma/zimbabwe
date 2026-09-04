import { guardConsoleLayout } from "@/lib/auth/guard-console-layout";

export const dynamic = "force-dynamic";

export default async function DealRoomLayout({ children }: { children: React.ReactNode }) {
  await guardConsoleLayout("deal-room");
  return children;
}
