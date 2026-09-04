"use client";

import type { AccessLevel } from "@/lib/entitlements/visibility";
import { canAccessContent } from "@/lib/entitlements/visibility";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

interface GatedSectionProps {
  requiredLevel: AccessLevel;
  fallback: React.ReactNode;
  children: React.ReactNode;
  blur?: boolean;
  className?: string;
}

export function GatedSection({
  requiredLevel,
  fallback,
  children,
  blur = true,
  className,
}: GatedSectionProps) {
  const { persona } = useAuth();
  const allowed = canAccessContent(persona, requiredLevel);

  if (allowed) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      {blur && (
        <div className="pointer-events-none select-none blur-sm opacity-60" aria-hidden="true">
          {children}
        </div>
      )}
      <div className={blur ? "absolute inset-0 flex items-center justify-center" : ""}>
        {fallback}
      </div>
    </div>
  );
}
