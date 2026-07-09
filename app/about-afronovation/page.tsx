"use client";

import Link from "next/link";
import { ArrowRight, Shield, Settings, Layers, Globe, Lock } from "lucide-react";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/cinematic-reveal";
import { ExecutiveCard } from "@/components/system/executive-card";
import { SITE_URL } from "@/lib/config/site";

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Afronovation", item: `${SITE_URL}/about-afronovation` },
  ],
};

const deliverables = [
  { icon: Layers, title: "Governed Registry", desc: "Transforms static catalogues into searchable, filterable digital registries." },
  { icon: Globe, title: "Investor Engagement", desc: "Registration, lead capture, and capital estimate gating for qualified access." },
  { icon: Shield, title: "Governance Workflow", desc: "Review and approval before publication with full audit trail." },
  { icon: Settings, title: "Super Admin Control", desc: "Taxonomies, entitlements, publishing rules, and platform configuration." },
  { icon: Lock, title: "Data Sovereignty", desc: "Government/ZIDA data owned by Zimbabwean authorities; Afronovation operates SaaS." },
  { icon: ArrowRight, title: "Pilot Pathway", desc: "Demo → 60–90 day pilot → production scale deployment." },
];

export default function AboutAfronovationPage() {
  return (
    <DeepDiveShell overline="Implementation Role · Technology Partner" title="Afronovation">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <FadeUp>
        <blockquote className="border-l-4 pl-6 mb-10 text-lg italic" style={{ borderColor: "var(--color-gold)", color: "var(--color-text-secondary)" }}>
          Afronovation is the platform owner, operator, and technology partner for the Zimbabwe Digital Investment
          & Economic Intelligence Platform — delivering proprietary SaaS infrastructure configured for Zimbabwe&apos;s investment promotion ecosystem.
        </blockquote>
      </FadeUp>

      <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
        {deliverables.map(({ icon: Icon, title, desc }) => (
          <StaggerItem key={title}>
            <ExecutiveCard>
              <Icon className="h-7 w-7 mb-3" style={{ color: "var(--color-gold)" }} />
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{desc}</p>
            </ExecutiveCard>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <FadeUp>
        <ExecutiveCard variant="highlighted">
          <h2 className="text-xl font-bold text-white mb-4">Three Commitments</h2>
          <ul className="space-y-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            <li><strong className="text-white">Ownership:</strong> Afronovation owns platform IP; Zimbabwe owns institutional data.</li>
            <li><strong className="text-white">Governance:</strong> No project publishes without review and approval workflow.</li>
            <li><strong className="text-white">Sovereignty:</strong> Platform strengthens ZIDA visibility without replacing government systems.</li>
          </ul>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/platform" className="btn-sovereign-ghost text-xs px-4 py-2">Platform Overview</Link>
            <Link href="/contact" className="btn-sovereign text-xs px-4 py-2">Contact Afronovation</Link>
            <Link href="/super-admin-demo" className="btn-sovereign-ghost text-xs px-4 py-2">Super Admin Demo</Link>
          </div>
        </ExecutiveCard>
      </FadeUp>
    </DeepDiveShell>
  );
}
