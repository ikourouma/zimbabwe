import type { Metadata } from "next";
import { DealRoomOverview } from "@/components/deal-room/deal-room-overview";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/deal-room`;

export const metadata: Metadata = {
  title: "Deal Room",
  description: "Private workspace for approved investors and government stakeholders.",
  alternates: { canonical: PAGE_URL },
  robots: { index: false, follow: false },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Platform Concept", item: `${SITE_URL}/platform` },
    { "@type": "ListItem", position: 3, name: "Deal Room", item: PAGE_URL },
  ],
};

export default function DealRoomPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <DealRoomOverview />
    </>
  );
}
