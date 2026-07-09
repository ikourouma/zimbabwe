"use client";

import Link from "next/link";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { EngagementWizard } from "@/components/strategic-partnerships/engagement-wizard";
import { SITE_URL } from "@/lib/config/site";

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Strategic Partnerships & Inquiries", item: `${SITE_URL}/strategic-partnerships` },
  ],
};

export default function StrategicPartnershipsPage() {
  return (
    <DeepDiveShell overline="Executive Gateway" title="Strategic Partnerships & Inquiries">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <p className="max-w-2xl text-sm leading-relaxed mb-12" style={{ color: "var(--color-text-secondary)" }}>
        For investors, government and DFI counterparts, and strategic or technical partners with a
        specific mandate — this three-step form routes your inquiry to the desk best placed to respond.
        Looking for a general question or press inquiry instead? Use the{" "}
        <Link href="/contact" className="underline" style={{ color: "var(--color-gold)" }}>
          standard contact form
        </Link>
        .
      </p>
      <EngagementWizard />
    </DeepDiveShell>
  );
}
