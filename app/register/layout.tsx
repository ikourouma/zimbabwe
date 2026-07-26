import type { Metadata } from "next";
import { RegisterShell } from "@/components/layout/register-shell";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/register`;

export const metadata: Metadata = {
  title: "Register for Access",
  description:
    "Create an investor profile to unlock expanded project details and start your credential review for qualified-investor access.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Register for Access — Zimbabwe Investment Platform",
    description: "Join the ZIDA investment intelligence network to unlock expanded project details.",
    url: PAGE_URL,
    type: "website",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <RegisterShell>{children}</RegisterShell>;
}
