import { guardConsoleLayout } from "@/lib/auth/guard-console-layout";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await guardConsoleLayout("admin");
  return children;
}
