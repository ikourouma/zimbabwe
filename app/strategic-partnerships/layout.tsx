import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/strategic-partnerships`;

export const metadata: Metadata = {
  title: "Strategic Partnerships & Inquiries",
  description:
    "Executive gateway for institutional investors, government/DFI counterparts, and strategic partners to engage with Zimbabwe's ZIDA project pipeline.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Strategic Partnerships & Inquiries",
    description: "A governed, three-step inquiry pathway that routes investors and partners to the right desk.",
    url: PAGE_URL,
    type: "website",
  },
};

export default function StrategicPartnershipsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
