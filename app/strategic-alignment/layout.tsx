import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/strategic-alignment`;

export const metadata: Metadata = {
  title: "Strategic Pillars",
  description:
    "Zimbabwe's transformation pillars — strategic objectives, target outcomes, and priority projects aligned to ZIDA's investment themes.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Zimbabwe's Strategic Transformation Pillars",
    description: "Transformation pillars aligned to ZIDA investment themes, with priority projects and estimated investment ranges.",
    url: PAGE_URL,
    type: "website",
  },
};

export default function StrategicAlignmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
