"use client";

import Link from "next/link";
import { Handshake } from "lucide-react";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/cinematic-reveal";
import { ExecutiveCard } from "@/components/system/executive-card";
import { EstInvestmentRange } from "@/components/projects/est-investment-range";
import { CapitalBreakdown } from "@/components/projects/capital-breakdown";
import { useProjectStore } from "@/context/project-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useSiteStats } from "@/lib/hooks/use-site-stats";
import { getPillarById } from "@/lib/data/taxonomies";
import { getSectorStats, getLargestCapitalProject } from "@/lib/data/site-stats";
import { SITE_URL } from "@/lib/config/site";

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Priority Sectors", item: `${SITE_URL}/sectors` },
  ],
};

export default function SectorsPage() {
  const { sectors } = useTaxonomyStore();
  const { projects } = useProjectStore();
  const stats = useSiteStats();

  return (
    <>
      <DeepDiveShell overline="Investment Intelligence · Priority Sectors" title="Sector Explorer" minHeightScreen={false}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <FadeUp>
          <p className="text-base mb-10 max-w-3xl" style={{ color: "var(--color-text-secondary)" }}>
            Browse investment opportunities across {stats.sectorCount} priority sectors from the ZIDA 2025 project
            catalogue. Every project also aligns to one or more strategic pillars, SDGs, and beneficiary
            ministries — see <Link href="/strategic-alignment" className="underline hover:text-white">Strategic Alignment</Link> for
            that view of the same registry.
          </p>
        </FadeUp>
        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector) => {
            const sectorStats = getSectorStats(sector.id, projects);
            const sectorProjects = projects.filter((p) => p.sectorId === sector.id && p.projectStatus === "published");
            const largest = getLargestCapitalProject(sectorProjects);
            const pillarIds = Array.from(
              new Set(
                projects
                  .filter((p) => p.sectorId === sector.id)
                  .flatMap((p) => p.strategicPillarIds)
              )
            );
            const pillars = pillarIds.map((id) => getPillarById(id)).filter(Boolean);

            return (
              <StaggerItem key={sector.id}>
                <ExecutiveCard className="h-full flex flex-col transition-colors hover:border-[var(--color-zim-green)]/50">
                  <Link href={`/sectors/${sector.slug}`} className="block flex-1">
                    <ExecutiveCard.Header
                      title={sector.name}
                      badge={<span className="status-badge status-badge-active">{sectorStats.published} published</span>}
                    />
                    <ExecutiveCard.Body>
                      <p className="mb-4 line-clamp-2">{sector.description}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
                        <span>Subsectors: {sectorStats.subsectorCount}</span>
                        <span>Provinces: {sectorStats.provinceCount}</span>
                      </div>

                      <EstInvestmentRange
                        capitalRange={sectorStats.capitalRange}
                        publishedCount={sectorStats.published}
                        dark
                        className="mb-3"
                        valueClassName="text-sm font-mono"
                      />

                      {pillars.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {pillars.slice(0, 3).map((p) => p && (
                            <span key={p.id} className="status-badge status-badge-info text-[0.65rem]">
                              {p.name.split("&")[0].trim()}
                            </span>
                          ))}
                          {pillars.length > 3 && (
                            <span className="status-badge status-badge-info text-[0.65rem]">+{pillars.length - 3} more</span>
                          )}
                        </div>
                      )}

                      <CapitalBreakdown value={largest?.capitalRequired} maxItems={1} label="Largest project" dark className="text-xs" />
                    </ExecutiveCard.Body>
                  </Link>

                  <div
                    className="mt-4 pt-3 flex items-center justify-between border-t"
                    style={{ borderColor: "var(--color-sovereign-border)" }}
                  >
                    <Link href={`/sectors/${sector.slug}`} className="text-xs hover:underline" style={{ color: "var(--color-text-muted)" }}>
                      View sector detail →
                    </Link>
                    <Link href={`/projects?sectorId=${sector.id}`} className="text-xs text-[var(--color-gold)] hover:underline">
                      Browse projects in registry →
                    </Link>
                  </div>
                </ExecutiveCard>
              </StaggerItem>
            );
          })}

          <StaggerItem>
            <ExecutiveCard className="h-full flex flex-col justify-center border-[var(--color-gold)] bg-[rgba(255,211,0,0.06)]">
              <Handshake className="h-6 w-6 mb-3" style={{ color: "var(--color-gold)" }} />
              <h3 className="text-lg font-medium text-white mb-2" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
                Have a Cross-Sector Opportunity?
              </h3>
              <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
                Some of the strongest investment cases don&apos;t fit neatly into one sector. Talk to our
                investment promotion team about a bespoke opportunity.
              </p>
              <Link href="/strategic-partnerships" className="btn-sovereign text-xs px-4 py-2 mt-auto">
                Talk to our team →
              </Link>
            </ExecutiveCard>
          </StaggerItem>
        </StaggerContainer>
      </DeepDiveShell>

      <section className="py-16" style={{ backgroundColor: "var(--color-zim-green)" }}>
        <div className="page-container flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <h2 className="text-2xl font-light text-white mb-2" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
              Ready to invest in Zimbabwe?
            </h2>
            <p className="text-white/85 text-sm">Register for full project detail — verified investors unlock capital estimates and financial indicators.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/register" className="btn-sovereign bg-[var(--color-gold)] text-black hover:opacity-90">
              Register
            </Link>
            <Link href="/investor-journey" className="btn-sovereign-ghost border-white/30">
              Investor Journey
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
