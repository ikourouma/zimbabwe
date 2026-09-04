import { guardConsoleLayout } from "@/lib/auth/guard-console-layout";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await guardConsoleLayout("super-admin");
  return children;
}
