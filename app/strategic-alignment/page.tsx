"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, KeyRound, Landmark, Target } from "lucide-react";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/cinematic-reveal";
import { ExecutiveCard } from "@/components/system/executive-card";
import { EstInvestmentRange } from "@/components/projects/est-investment-range";
import { WorkspaceAccessCta } from "@/components/deal-room/workspace-access-cta";
import { useProjectStore } from "@/context/project-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { useSiteStats } from "@/lib/hooks/use-site-stats";
import { sdgs, getSdgById } from "@/lib/data/taxonomies";
import { SdgBadge } from "@/components/ui/sdg-badge";
import {
  getPillarStats,
  getPillarPhase,
  getPillarLeadMinistries,
  getPillarIllustrativeCount,
  getMinistryStats,
  getSdgStats,
} from "@/lib/data/site-stats";
import { nationalPolicyFrameworks, POLICY_ALIGNMENT_DISCLAIMER } from "@/lib/data/policy-frameworks";
import { SITE_URL } from "@/lib/config/site";

/** UN 2030 Agenda thematic groupings (People / Planet / Prosperity / Peace / Partnership).
 *  Our seed project set has no SDG 16 tags, so "Peace" is omitted rather than shown empty. */
const SDG_THEMES: { theme: string; numbers: number[] }[] = [
  { theme: "People", numbers: [1, 2, 3, 4, 5] },
  { theme: "Planet", numbers: [6, 12, 13] },
  { theme: "Prosperity", numbers: [7, 8, 9, 10, 11] },
  { theme: "Partnership", numbers: [17] },
];

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Strategic Pillars", item: `${SITE_URL}/strategic-alignment` },
  ],
};

export default function StrategicAlignmentPage() {
  const { pillars, ministries } = useTaxonomyStore();
  const { projects } = useProjectStore();
  const { isQualified } = useAuth();
  const stats = useSiteStats();
  const [activeId, setActiveId] = useState(pillars[0]?.id ?? "");

  const activeIndex = pillars.findIndex((p) => p.id === activeId);
  const active = activeIndex >= 0 ? pillars[activeIndex] : pillars[0];
  const pillarStats = active ? getPillarStats(active.id, projects) : null;
  const phase = active ? getPillarPhase(active.id, projects) : "Planning";
  const leadMinistries = active ? getPillarLeadMinistries(active.id, projects, ministries) : [];
  const illustrativeCount = active ? getPillarIllustrativeCount(active.id, projects) : 0;
  const pillarSdgIds = active
    ? Array.from(
        new Set(
          projects
            .filter((p) => p.strategicPillarIds.includes(active.id))
            .flatMap((p) => p.sdgIds)
        )
      )
    : [];

  return (
    <>
      <DeepDiveShell
        overline="Strategic Context · Alignment Framework"
        title="Strategic Pillars & Policy Alignment"
        minHeightScreen={false}
      >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <FadeUp>
        <p className="text-base mb-10 max-w-3xl" style={{ color: "var(--color-text-secondary)" }}>
          Every project is mapped to one or more of {stats.pillarCount} universal strategic pillars, {stats.sdgCount} SDGs,
          and beneficiary ministries — with each pillar tied to a strategic mandate, target outcomes, and the national
          policy frameworks it advances. Ministry mappings are demo placeholders pending official validation.
        </p>
      </FadeUp>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr] mb-16">
        <nav className="space-y-1">
          {pillars.map((pillar, i) => {
            const pillarPhase = getPillarPhase(pillar.id, projects);
            const isActive = activeId === pillar.id;
            return (
              <button
                key={pillar.id}
                type="button"
                onClick={() => setActiveId(pillar.id)}
                className="w-full flex items-center gap-3 text-left px-4 py-3 rounded text-sm transition-colors"
                style={{
                  backgroundColor: isActive ? "rgba(0,100,0,0.2)" : "transparent",
                  color: isActive ? "#fff" : "var(--color-text-secondary)",
                  border: isActive ? "1px solid rgba(0,100,0,0.4)" : "1px solid transparent",
                }}
              >
                <span
                  className="shrink-0 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: pillarPhase === "Active" ? "#86efac" : "#fde047" }}
                  aria-hidden="true"
                />
                <span className="shrink-0 font-mono text-xs opacity-60">{String(i + 1).padStart(2, "0")}</span>
                <span>{pillar.name}</span>
              </button>
            );
          })}
        </nav>

        {active && pillarStats && (
          <ExecutiveCard>
            <div className="flex items-start justify-between gap-4 mb-1">
              <p className="section-overline">Pillar {String(activeIndex + 1).padStart(2, "0")}</p>
              <span className={`status-badge ${phase === "Active" ? "status-badge-active" : "status-badge-pending"}`}>
                {phase}
              </span>
            </div>
            <h2 className="text-xl font-medium text-white mb-5" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
              {active.name}
            </h2>

            <div className="rounded-lg border p-4 mb-5" style={{ borderColor: "var(--color-sovereign-border)", backgroundColor: "rgba(255,255,255,0.02)" }}>
              <p className="text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                <Target className="h-3.5 w-3.5" /> Strategic Mandate
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{active.strategicMandate}</p>
            </div>

            <div className="mb-5">
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>Target Outcomes</p>
              <ul className="space-y-1.5">
                {active.targetOutcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    <span className="shrink-0 h-1.5 w-1.5 rounded-full mt-1.5" style={{ backgroundColor: "var(--color-gold)" }} aria-hidden="true" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border p-4 mb-6" style={{ borderColor: "var(--color-sovereign-border)", backgroundColor: "rgba(255,211,0,0.04)" }}>
              <p className="text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                <BookOpen className="h-3.5 w-3.5" /> Policy Alignment
              </p>
              <p className="text-sm text-white mb-1">{active.policyAlignment.primary}</p>
              {active.policyAlignment.secondary && (
                <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>{active.policyAlignment.secondary}</p>
              )}
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{POLICY_ALIGNMENT_DISCLAIMER}</p>
            </div>

            <div className={cn("grid gap-4 mb-6", isQualified ? "sm:grid-cols-2" : "sm:grid-cols-1")}>
              <div className="p-4 rounded border" style={{ borderColor: "var(--color-sovereign-border)" }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--color-text-muted)" }}>Priority Projects</p>
                <p className="text-2xl font-mono text-white">{pillarStats.total}</p>
                {illustrativeCount > 0 && (
                  <p className="text-[10px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                    (includes {illustrativeCount} illustrative policy initiative{illustrativeCount > 1 ? "s" : ""} — technical assistance required)
                  </p>
                )}
              </div>
              <EstInvestmentRange
                capitalRange={pillarStats.capitalRange}
                publishedCount={pillarStats.published}
                dark
                boxed
                className="relative overflow-hidden"
                labelClassName="text-xs uppercase tracking-widest"
                valueClassName="text-lg font-mono text-[var(--color-gold)]"
                footnote={<p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{stats.verificationNote}</p>}
              />
            </div>

            {(leadMinistries.length > 0 || pillarSdgIds.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {leadMinistries.map((name) => (
                  <span key={name} className="status-badge status-badge-info">{name}</span>
                ))}
                {pillarSdgIds.map((id) => {
                  const sdg = getSdgById(id);
                  if (!sdg) return null;
                  return <SdgBadge key={id} sdg={sdg} size="sm" />;
                })}
              </div>
            )}

            <div className="rounded-lg border p-5 mb-5" style={{ borderColor: "var(--color-gold)", backgroundColor: "rgba(255,211,0,0.06)" }}>
              <div className="flex items-start gap-3 mb-4">
                <KeyRound className="h-5 w-5 shrink-0" style={{ color: "var(--color-gold)" }} />
                <div>
                  <p className="text-sm font-medium text-white">Full Blueprint Access — Authorized Stakeholders Only</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    Detailed financial models, governance workflow, and the project Deal Room are reserved for
                    registered investors and government stakeholders.
                  </p>
                </div>
              </div>
              <WorkspaceAccessCta />
            </div>

            <Link href={`/projects?pillarId=${active.id}`} className="text-sm text-[var(--color-gold)] hover:underline">
              Browse priority projects in this pillar →
            </Link>
          </ExecutiveCard>
        )}
      </div>

      <FadeUp>
        <h2 className="text-2xl font-bold text-white mb-2">Aligned with Zimbabwe&apos;s National Policy Framework</h2>
        <p className="text-xs mb-6" style={{ color: "var(--color-text-muted)" }}>{POLICY_ALIGNMENT_DISCLAIMER}</p>
      </FadeUp>
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-16">
        {nationalPolicyFrameworks.map((policy) => (
          <StaggerItem key={policy.id}>
            <ExecutiveCard className="h-full">
              <div className="flex items-start gap-3 mb-2">
                <Landmark className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--color-gold)" }} />
                <div>
                  <p className="text-sm font-medium text-white">{policy.shortName}</p>
                  <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{policy.issuingAuthority}</p>
                </div>
              </div>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{policy.description}</p>
            </ExecutiveCard>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <FadeUp>
        <h2 className="text-2xl font-bold text-white mb-2">SDG Alignment</h2>
        <p className="text-sm mb-8 max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
          Grouped by the UN 2030 Agenda&apos;s thematic pillars. Every SDG shown is actively tagged to one or more
          projects in the registry — click through to see them.
        </p>
      </FadeUp>
      {SDG_THEMES.map(({ theme, numbers }) => {
        const themeSdgs = sdgs.filter((s) => numbers.includes(s.number));
        if (themeSdgs.length === 0) return null;
        return (
          <div key={theme} className="mb-10">
            <p className="section-overline mb-3">{theme}</p>
            <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {themeSdgs.map((sdg) => {
                const sdgStats = getSdgStats(sdg.id, projects);
                return (
                  <StaggerItem key={sdg.id}>
                    <Link
                      href={`/projects?sdgId=${sdg.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 executive-card transition-colors hover:border-[var(--color-gold)]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: sdg.colorToken }}>
                        {sdg.number}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-white">{sdg.name}</div>
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {sdgStats.total} project{sdgStats.total !== 1 ? "s" : ""} aligned
                        </div>
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        );
      })}

      <FadeUp>
        <h2 className="text-2xl font-bold text-white mb-2 mt-6">Ministries & Institutional Alignment</h2>
        <p className="text-sm mb-2 max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
          Every project aligns to at least one beneficiary ministry, alongside its sector, strategic pillar(s), and
          SDG(s) — the same transparency principle applied across this page. Ministry names only; no named
          officials are shown on this platform.
        </p>
        <p className="text-xs mb-6 status-badge status-badge-pending inline-flex">Illustrative mapping — pending official validation</p>
      </FadeUp>
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ministries.filter((m) => m.type === "beneficiary").map((ministry) => {
          const ministryStats = getMinistryStats(ministry.id, projects);
          return (
            <StaggerItem key={ministry.id}>
              <ExecutiveCard className="h-full flex flex-col">
                <div className="flex-1">
                  <div className="font-medium text-sm text-white">{ministry.shortName}</div>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{ministry.name}</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-mono" style={{ color: "var(--color-gold)" }}>
                    {ministryStats.total} project{ministryStats.total !== 1 ? "s" : ""}
                  </span>
                  <Link href={`/projects?ministryId=${ministry.id}`} className="text-xs text-[var(--color-gold)] hover:underline">
                    Browse projects →
                  </Link>
                </div>
              </ExecutiveCard>
            </StaggerItem>
          );
        })}
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
