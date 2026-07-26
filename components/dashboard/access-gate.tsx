"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessGateProps {
  title: string;
  description: string;
  isLoading?: boolean;
}

/** Renders inside the dashboard shell (not instead of it) so an unauthorized visitor still sees
 *  the branded console frame rather than a jarring blank/plain page — Fortune-100 pattern of
 *  "you're in the right place, you just need different access" over a generic 403. */
export function AccessGate({ title, description, isLoading }: AccessGateProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="dashboard-skeleton h-8 w-8 rounded-full" />
        <div className="dashboard-skeleton h-3 w-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 max-w-md mx-auto">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(255, 211, 0, 0.14)" }}
      >
        <ShieldAlert className="h-5 w-5" style={{ color: "var(--color-gold)" }} />
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
        {description}
      </p>
      <Button asChild>
        <Link href="/auth/sign-in">Sign in</Link>
      </Button>
    </div>
  );
}
