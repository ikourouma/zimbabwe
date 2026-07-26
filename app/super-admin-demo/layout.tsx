import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Admin Demo (Internal Preview)",
  description: "Internal preview of the super admin console — not for public indexing.",
  robots: { index: false, follow: false },
};

export default function SuperAdminDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
