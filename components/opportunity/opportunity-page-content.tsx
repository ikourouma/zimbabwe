"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/cinematic-reveal";
import { ExecutiveCard } from "@/components/system/executive-card";
import { useSiteStats } from "@/lib/hooks/use-site-stats";

export function OpportunityPageContent() {
  const stats = useSiteStats();

  const statAnchors = [
    { value: String(stats.totalProjects), unit: "Projects", desc: "ZIDA catalogue entries" },
    { value: String(stats.sectorCount), unit: "Sectors", desc: "Priority economic domains" },
    { value: String(stats.publishedProjects), unit: "Published", desc: "Governed registry entries" },
    { value: String(stats.provinceCount), unit: "Provinces", desc: "Geographic coverage" },
  ];

  const threeForces = [
    {
      number: "01",
      title: "Resource & Energy Transition Demand",
      body: "Zimbabwe holds Africa's largest lithium reserves and supplies roughly 9–10% of global output, alongside gold, platinum, and chrome. Mining now drives ~14.5% of GDP and 70–80% of export earnings, with $3.52 billion in new mining licences issued since 2023 — positioning the country at the center of the global battery-metals and energy-transition supply chain.",
      source: "Ministry of Finance · Mining Weekly, June 2026",
      color: "rgba(0,100,0,0.12)",
      border: "rgba(0,100,0,0.3)",
      accent: "#86efac",
    },
    {
      number: "02",
      title: "Diaspora & Regional Capital Momentum",
      body: "A roughly 5-million-strong diaspora sent home $2.45 billion in 2025, up 15% year-on-year — a growing, direct channel for investment capital. AfCFTA and SADC membership extend that momentum continentally, giving investors based in Zimbabwe preferential access to regional markets beyond the domestic economy.",
      source: "RBZ 2026 Monetary Policy Statement · AfCFTA/SADC Framework",
      color: "rgba(255,211,0,0.08)",
      border: "rgba(255,211,0,0.2)",
      accent: "var(--color-gold)",
    },
    {
      number: "03",
      title: "Macro Stabilisation & Investor Protections",
      body: "The economy grew 6.6% in 2025 and is forecast to expand up to 8.5% in 2026, backed by record foreign currency receipts of $16.1 billion. ZIDA's one-stop licensing centre offers qualifying investors 0% corporate tax for five years, plus statutory protection against expropriation and guaranteed profit repatriation.",
      source: "RBZ MPS · ZIDA Investment Regulations, 2026",
      color: "rgba(0,128,0,0.1)",
      border: "rgba(0,128,0,0.25)",
      accent: "#008000",
    },
  ];

  return (
    <DeepDiveShell
      overline="Strategic Context · The National Opportunity"
      title="Zimbabwe's Investment Inflection Point"
    >
      <FadeUp>
        <p
          className="text-base leading-relaxed mb-16 -mt-6 max-w-2xl"
          style={{ color: "var(--color-text-secondary)", lineHeight: "1.9" }}
        >
          Zimbabwe is growing at its fastest pace in over a decade — 6.6% in 2025, projected up to 8.5%
          in 2026 — anchored by a resurgent mining sector, record foreign currency earnings, and a
          diaspora capital base sending home more than $2.45 billion a year. Across eight priority
          sectors and every province, ZIDA&apos;s governed pipeline turns that momentum into vetted,
          investable opportunity for institutional investors, DFIs, and diaspora capital.
        </p>
      </FadeUp>

      <FadeIn delay={0.2}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-20">
          {statAnchors.map((stat) => (
            <div
              key={stat.unit}
              className="p-6 rounded-xl"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid var(--color-sovereign-border)",
              }}
            >
              <p
                className="font-light leading-none mb-1"
                style={{ fontSize: "2.5rem", color: "var(--color-gold)", letterSpacing: "-0.02em" }}
              >
                {stat.value}
              </p>
              <p className="text-sm font-semibold mb-1 text-white">{stat.unit}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {stat.desc}
              </p>
            </div>
          ))}
        </div>
      </FadeIn>

      <section
        className="border-y rounded-lg py-12 px-6 md:py-16 md:px-10 lg:px-14 mb-16"
        style={{
          borderColor: "var(--color-sovereign-border)",
          backgroundColor: "var(--color-sovereign-panel)",
        }}
      >
        <FadeUp>
          <p className="section-overline mb-4">Why Now</p>
          <h2
            className="font-light mb-4 text-2xl md:text-3xl text-white"
            style={{ letterSpacing: "var(--type-heading-tracking)", maxWidth: "600px" }}
          >
            Three Forces Creating the Window
          </h2>
          <p
            className="text-sm leading-relaxed mb-12 max-w-xl"
            style={{ color: "var(--color-text-secondary)", lineHeight: "1.85" }}
          >
            Transformation windows are defined by convergence. Zimbabwe&apos;s is defined by three
            structural forces aligning simultaneously — each independently significant, together,
            unprecedented for ZIDA-led investment promotion.
          </p>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {threeForces.map((force) => (
            <StaggerItem key={force.number}>
              <ExecutiveCard variant="panel" className="h-full !p-7">
                <p
                  className="text-3xl font-light mb-5"
                  style={{ color: force.accent, letterSpacing: "-0.02em", opacity: 0.5 }}
                >
                  {force.number}
                </p>
                <h3 className="text-base font-medium mb-4 text-white">{force.title}</h3>
                <ExecutiveCard.Body>
                  <p className="mb-5 leading-relaxed">{force.body}</p>
                  <div className="pt-4 border-t" style={{ borderColor: force.border }}>
                    <p className="text-xs" style={{ color: force.accent }}>
                      {force.source}
                    </p>
                  </div>
                </ExecutiveCard.Body>
              </ExecutiveCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <section className="mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <FadeUp>
              <p className="section-overline mb-4">The Strategic Case</p>
              <h2
                className="font-light mb-6 text-xl md:text-2xl text-white"
                style={{ letterSpacing: "var(--type-heading-tracking)" }}
              >
                Breadth, Governance, and a Widening Window
              </h2>
              <div className="space-y-5 text-sm" style={{ color: "var(--color-text-secondary)", lineHeight: "1.85" }}>
                <p>
                  Zimbabwe&apos;s pipeline spans health, agriculture, ICT, manufacturing, mining,
                  infrastructure, renewable energy, and tourism — distributed across {stats.provinceCount}{" "}
                  provinces. That breadth matters for portfolio construction: institutional and DFI capital
                  can diversify sector and geographic exposure within a single, governed pipeline rather than
                  sourcing deals market by market.
                </p>
                <p>
                  Zimbabwe&apos;s May 2026 Critical Minerals framework — mandatory local beneficiation and
                  state co-participation for 14 strategic minerals — signals a maturing, rules-based regime:
                  predictable and transparent for investors who structure around it, though it raises the
                  cost of entry for mining specifically. The other seven sectors in this pipeline are
                  unaffected by that framework.
                </p>
                <p>
                  {stats.pillarCount} strategic pillars, {stats.sdgCount} SDG alignments, and {stats.ministryCount}
                  beneficiary ministries give DFIs and development-mandated investors the policy and institutional
                  coherence they need for diligence — visible on every project, ungated. Registering unlocks full
                  project scope and financing detail; capital estimates and financial indicators unlock once
                  verified as a qualified investor. Ministry mappings remain illustrative pending official
                  Government of Zimbabwe validation.
                </p>
              </div>
            </FadeUp>
          </div>

          <div className="lg:col-span-5">
            <FadeIn delay={0.2} className="sticky top-32">
              <ExecutiveCard variant="highlighted">
                <ExecutiveCard.Header
                  overline="Seed Data Indicators"
                  title="Investment Horizon"
                />
                <ExecutiveCard.Body>
                  <ul className="space-y-4">
                    {[
                      { label: "Catalogue Projects", value: String(stats.totalProjects), note: stats.verificationNote },
                      { label: "Published Entries", value: String(stats.publishedProjects), note: "Review-governed workflow" },
                      { label: "Priority Sectors", value: String(stats.sectorCount), note: "Seed-derived pipelines" },
                      { label: "Subsector Coverage", value: String(stats.subsectorCount), note: "Mapped to projects" },
                    ].map((item) => (
                      <li
                        key={item.label}
                        className="pb-4 border-b flex items-start justify-between gap-4"
                        style={{ borderColor: "var(--color-sovereign-border)" }}
                      >
                        <div>
                          <p className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>
                            {item.label}
                          </p>
                          <p className="text-xs italic opacity-70">{item.note}</p>
                        </div>
                        <p className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--color-gold)" }}>
                          {item.value}
                        </p>
                      </li>
                    ))}
                  </ul>
                </ExecutiveCard.Body>
              </ExecutiveCard>
            </FadeIn>
          </div>
        </div>
      </section>

      <FadeUp>
        <ExecutiveCard variant="panel" className="text-center">
          <h2 className="text-xl md:text-2xl font-light text-white mb-3" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
            Ready to Explore This Opportunity?
          </h2>
          <p
            className="text-sm leading-relaxed mb-8 max-w-lg mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Register for expanded project details, then request investor verification to unlock capital
            estimates — or browse the governed ZIDA project registry directly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-sovereign w-full sm:w-auto">
              Register as Investor <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/projects" className="btn-sovereign-ghost w-full sm:w-auto">
              Browse Project Registry
            </Link>
          </div>
        </ExecutiveCard>
      </FadeUp>

      <FadeIn delay={0.15}>
        <div className="mt-10 text-center">
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 text-sm transition-colors hover:text-white"
            style={{ color: "var(--color-text-muted)" }}
          >
            Continue the narrative: Platform Concept <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </FadeIn>
    </DeepDiveShell>
  );
}
