import type { Metadata } from "next";
import { PlatformPageContent } from "@/components/platform/platform-page-content";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/platform`;

export const metadata: Metadata = {
  title: "Platform Concept | Zimbabwe Investment Platform",
  description:
    "How the Zimbabwe Investment Platform works: a governed project registry, review-to-publish workflow, persona-based entitlements, and admin-managed taxonomies.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Platform Overview",
    description:
      "A governed digital investment intelligence platform that strengthens investment visibility, project discovery, investor engagement, and institutional coordination.",
    url: PAGE_URL,
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Platform Concept", item: PAGE_URL },
  ],
};

export default function PlatformPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PlatformPageContent />
    </>
  );
}
