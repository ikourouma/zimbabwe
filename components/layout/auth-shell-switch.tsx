"use client";

import { usePathname } from "next/navigation";
import { ExecutiveAccessShell, type ExecutiveAccessVariant } from "@/components/layout/executive-access-shell";

/** Picks the left-panel marketing variant for the shared /auth layout based on the active route,
 *  so /auth/sign-up gets its own headline/bullets instead of inheriting the sign-in copy. */
export function AuthShellSwitch({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const variant: ExecutiveAccessVariant = pathname?.startsWith("/auth/sign-up") ? "sign-up" : "sign-in";

  return <ExecutiveAccessShell variant={variant}>{children}</ExecutiveAccessShell>;
}
