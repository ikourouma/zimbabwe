import type { Metadata } from "next";
import { AuthShellSwitch } from "@/components/layout/auth-shell-switch";
import { SITE_URL } from "@/lib/config/site";

// Route-specific <title>/canonical (Sign In vs. Create Account) come from the nested
// app/auth/sign-in/layout.tsx and app/auth/sign-up/layout.tsx — Next.js lets the closest
// defined `title`/`alternates` win, so this is just a safe fallback.
export const metadata: Metadata = {
  title: "Account Access",
  description: "Sign in or create your governed investor profile on the Zimbabwe Investment Platform.",
  alternates: { canonical: `${SITE_URL}/auth/sign-in` },
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShellSwitch>{children}</AuthShellSwitch>;
}
