"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin } from "lucide-react";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/cinematic-reveal";
import { ExecutiveCard } from "@/components/system/executive-card";
import { getSiteStats } from "@/lib/data/site-stats";
import { platformName } from "@/content/zimbabwe-site";
import { SITE_URL } from "@/lib/config/site";

const stats = getSiteStats();

const profileStats = [
  { value: String(stats.totalProjects), label: "Catalogue Projects", desc: "ZIDA seed pipeline" },
  { value: String(stats.sectorCount), label: "Economic Sectors", desc: "Priority domains" },
  { value: String(stats.publishedProjects), label: "Published", desc: "Investor-facing entries" },
  { value: String(stats.pillarCount), label: "Strategic Pillars", desc: "Transformation themes" },
];

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Zimbabwe", item: `${SITE_URL}/zimbabwe` },
  ],
};

export default function ZimbabwePage() {
  return (
    <DeepDiveShell overline="National Profile" title="The Republic of Zimbabwe" backLabel="Back to Gateway">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <FadeUp>
        <div className="flex flex-col md:flex-row items-start gap-8 mb-12 -mt-6">
          <Image
            src="/brand/zimbabwe-coat-of-arms.png"
            alt="Coat of Arms of Zimbabwe"
            width={120}
            height={120}
            className="object-contain shrink-0"
            priority
            sizes="120px"
          />
          <p
            className="text-lg md:text-xl leading-relaxed max-w-3xl"
            style={{ color: "var(--color-text-secondary)" }}
          >
            A land of diversified investment opportunity across {stats.provinceCount} provinces and{" "}
            {stats.sectorCount} priority economic sectors. Curated from the ZIDA {stats.sourceYear} Projects
            deck, {platformName.short} transforms static catalogue intelligence into a governed,
            investor-facing registry — powered by Afronovation.
          </p>
        </div>
      </FadeUp>

      <FadeIn delay={0.15}>
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-16">
          {profileStats.map((stat) => (
            <StaggerItem key={stat.label}>
              <div
                className="p-6 rounded h-full"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--color-sovereign-border)",
                }}
              >
                <p
                  className="font-black leading-none mb-2"
                  style={{ fontSize: "2.25rem", color: "#FFD300", letterSpacing: "-0.05em" }}
                >
                  {stat.value}
                </p>
                <p className="text-sm font-semibold text-white mb-1">{stat.label}</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {stat.desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </FadeIn>

      <section className="mb-16">
        <FadeUp>
          <p className="section-overline mb-4">Geographic Coverage</p>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
            Provinces Represented in the ZIDA Catalogue
          </h2>
          <p
            className="text-sm leading-relaxed mb-8 max-w-2xl"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Seed project data spans {stats.provinceCount} provinces across Zimbabwe. Province assignments
            are derived from the ZIDA {stats.sourceYear} deck — {stats.verificationNote.toLowerCase()}.
          </p>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.provinces.map((province) => (
            <StaggerItem key={province}>
              <ExecutiveCard className="!p-4 flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0" style={{ color: "#006400" }} />
                <span className="text-sm font-medium text-white">{province}</span>
              </ExecutiveCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <section className="mb-8">
        <FadeUp>
          <ExecutiveCard variant="panel">
            <p className="section-overline mb-4">Investment Architecture</p>
            <h2 className="text-xl font-bold text-white mb-4">
              Multi-Sector Pipeline with Strategic Alignment
            </h2>
            <div className="grid gap-6 md:grid-cols-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <div>
                <p className="font-semibold text-white mb-1">{stats.sectorCount} Priority Sectors</p>
                <p>Health, agriculture, ICT, manufacturing, mining, infrastructure, renewable energy, and tourism.</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">{stats.subsectorCount} Subsectors</p>
                <p>Granular investment domains mapped to individual catalogue projects.</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">{stats.sdgCount} SDG Alignments</p>
                <p>Policy coherence for DFI discoverability and impact reporting.</p>
              </div>
            </div>
          </ExecutiveCard>
        </FadeUp>
      </section>

      <FadeUp>
        <div
          className="rounded-lg p-8 md:p-12 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(0,100,0,0.2) 0%, rgba(0,100,0,0.05) 100%)",
            border: "1px solid var(--color-sovereign-border)",
          }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Explore Zimbabwe&apos;s Investment Pipeline
          </h2>
          <p
            className="text-sm leading-relaxed mb-8 max-w-xl mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Browse priority sectors or dive directly into the searchable ZIDA project registry.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sectors" className="btn-sovereign w-full sm:w-auto">
              Priority Sectors <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/projects" className="btn-sovereign-ghost w-full sm:w-auto">
              Browse Project Registry
            </Link>
          </div>
        </div>
      </FadeUp>
    </DeepDiveShell>
  );
}
