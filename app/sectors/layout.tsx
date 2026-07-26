import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/sectors`;

export const metadata: Metadata = {
  title: "Priority Sectors",
  description:
    "Eight priority economic sectors in Zimbabwe's ZIDA 2025 catalogue, each with a governed, filterable project pipeline.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Zimbabwe's Priority Investment Sectors",
    description: "Eight economic sectors with seed-derived project pipelines from the ZIDA 2025 catalogue.",
    url: PAGE_URL,
    type: "website",
  },
};

export default function SectorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
