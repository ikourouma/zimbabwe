import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/zimbabwe`;

export const metadata: Metadata = {
  title: "The Republic of Zimbabwe — National Profile",
  description:
    "Zimbabwe's national investment profile — provinces, priority sectors, and strategic pillars curated from the ZIDA 2025 Projects deck.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "The Republic of Zimbabwe",
    description: "A diversified ZIDA investment catalogue spanning provinces and strategic pillars.",
    url: PAGE_URL,
    type: "website",
  },
};

export default function ZimbabweLayout({ children }: { children: React.ReactNode }) {
  return children;
}
