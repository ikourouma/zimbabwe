import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/about-afronovation`;

export const metadata: Metadata = {
  title: "About Afronovation",
  description:
    "Afronovation is the implementation partner behind Zimbabwe's governed digital investment intelligence platform.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "About Afronovation",
    description: "The implementation partner powering Zimbabwe's ZIDA investment intelligence platform.",
    url: PAGE_URL,
    type: "website",
  },
};

export default function AboutAfronovationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
