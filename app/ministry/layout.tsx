import { guardConsoleLayout } from "@/lib/auth/guard-console-layout";

export const dynamic = "force-dynamic";

export default async function MinistryLayout({ children }: { children: React.ReactNode }) {
  await guardConsoleLayout("ministry");
  return children;
}
