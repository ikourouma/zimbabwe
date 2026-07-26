import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Demo (Internal Preview)",
  description: "Internal preview of the institutional admin console — not for public indexing.",
  robots: { index: false, follow: false },
};

export default function AdminDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
