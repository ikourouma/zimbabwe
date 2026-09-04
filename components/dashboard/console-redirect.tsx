"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Rendered by a console layout in place of `children` when guardConsoleLayout() denies access.
 * Carries no console markup, so the denied user receives only this bounce page, then lands on
 * the console their role does own.
 */
export function ConsoleRedirect({ destination }: { destination: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(destination);
  }, [router, destination]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        You do not have access to this console. Redirecting you to your dashboard.
      </p>
    </div>
  );
}
