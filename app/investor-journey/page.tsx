import type { Metadata } from "next";
import { InvestorJourneyContent } from "@/components/investor-journey/investor-journey-content";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/investor-journey`;

export const metadata: Metadata = {
  title: "Investor Journey",
  description:
    "From browsing the ZIDA project registry to a qualified investment conversation — the governed, four-step pathway and access tiers for institutional investors.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "From Discovery to Strategic Partnership",
    description:
      "A governed, four-step pathway with entitlements that expand as investors register and qualify for deeper access.",
    url: PAGE_URL,
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Platform Concept", item: `${SITE_URL}/platform` },
    { "@type": "ListItem", position: 3, name: "Investor Journey", item: PAGE_URL },
  ],
};

export default function InvestorJourneyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <InvestorJourneyContent />
    </>
  );
}
