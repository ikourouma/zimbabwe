import type { Metadata } from "next";
import { ContactPageContent } from "@/components/contact/contact-page-content";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/contact`;

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Zimbabwe Investment Platform team — investment inquiries, partnerships, government and DFI liaison, media, and general questions.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Talk to the Platform Team",
    description:
      "Investment and partnership inquiries are routed to the right desk — typically acknowledged within one business day.",
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
    { "@type": "ListItem", position: 3, name: "Contact", item: PAGE_URL },
  ],
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ContactPageContent />
    </>
  );
}
