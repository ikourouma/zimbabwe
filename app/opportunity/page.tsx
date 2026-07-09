import type { Metadata } from "next";
import { OpportunityPageContent } from "@/components/opportunity/opportunity-page-content";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/opportunity`;

export const metadata: Metadata = {
  title: "The National Opportunity | Zimbabwe Investment Platform",
  description:
    "Zimbabwe's ZIDA 2025 investment catalogue, digitised into a governed, searchable registry — the strategic case for institutional investors, DFIs, and diaspora capital.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Zimbabwe's Investment Inflection Point",
    description:
      "A governed digital registry turns Zimbabwe's ZIDA investment catalogue into searchable, filterable intelligence for institutional investors, DFIs, and diaspora capital.",
    url: PAGE_URL,
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Opportunity", item: PAGE_URL },
  ],
};

export default function OpportunityPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <OpportunityPageContent />
    </>
  );
}
