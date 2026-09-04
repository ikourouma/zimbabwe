"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { getPostLoginDestination } from "@/lib/auth/post-login-destination";

interface AccessGateProps {
  title: string;
  description: string;
  isLoading?: boolean;
}

/** Renders inside the dashboard shell so an unauthorized visitor still sees the branded console
 *  frame. Distinguishes "not signed in" from "signed in but this console is not yours" so a
 *  registered investor who hits /admin is never told to sign in again. */
export function AccessGate({ title, description, isLoading }: AccessGateProps) {
  const { isAuthenticated, isSuperAdmin, isAdmin, isMinistryAdmin, isQualified } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="dashboard-skeleton h-8 w-8 rounded-full" />
        <div className="dashboard-skeleton h-3 w-48" />
      </div>
    );
  }

  const dest = getPostLoginDestination({ isSuperAdmin, isAdmin, isMinistryAdmin, isQualified });
  const signedInWrongRole = isAuthenticated;
  const heading = signedInWrongRole && /sign in required/i.test(title) ? "Access denied" : title;
  const body = signedInWrongRole
    ? "This console is not available for your account. Return to your workspace to continue."
    : description;

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 max-w-md mx-auto">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(255, 211, 0, 0.14)" }}
      >
        <ShieldAlert className="h-5 w-5" style={{ color: "var(--color-gold)" }} />
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">{heading}</h2>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
        {body}
      </p>
      {signedInWrongRole ? (
        <Button asChild>
          <Link href={dest}>Go to your console</Link>
        </Button>
      ) : (
        <Button asChild>
          <Link href="/auth/sign-in">Sign in</Link>
        </Button>
      )}
    </div>
  );
}
