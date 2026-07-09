import { DealRoomContent } from "@/components/deal-room/deal-room-content";
import { SITE_URL } from "@/lib/config/site";

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Platform Concept", item: `${SITE_URL}/platform` },
    { "@type": "ListItem", position: 3, name: "Deal Room (Demo)", item: `${SITE_URL}/deal-room-demo` },
  ],
};

export default function DealRoomDemoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <DealRoomContent />
    </>
  );
}
