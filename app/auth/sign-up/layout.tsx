import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create your governed investor profile on the Zimbabwe Investment Platform — instant registry access, upgrade to Qualified Investor via a Strategic Partnership inquiry.",
  alternates: { canonical: `${SITE_URL}/auth/sign-up` },
  robots: { index: false, follow: false },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
