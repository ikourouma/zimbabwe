import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your governed investor profile on the Zimbabwe Investment Platform.",
  alternates: { canonical: `${SITE_URL}/auth/sign-in` },
  robots: { index: false, follow: false },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
