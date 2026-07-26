"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Shield, Layers, Users, Settings, Handshake, MessageSquare, ArrowRight, ArrowUpRight, Info } from "lucide-react";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/cinematic-reveal";
import { ExecutiveCard } from "@/components/system/executive-card";
import { useSiteStats } from "@/lib/hooks/use-site-stats";
import { useProjectStore } from "@/context/project-store-context";
import { getInReviewCount } from "@/lib/governance/project-workflow";
import { GovernanceWorkflowDrawer, AdminTaxonomiesDrawer, DealRoomDrawer } from "@/components/platform/capability-drawer";

interface CapabilityBase {
  icon: LucideIcon;
  title: string;
  desc: string;
  badge?: string;
}

type Capability =
  | (CapabilityBase & { mode: "link"; href: string })
  | (CapabilityBase & { mode: "drawer"; Drawer: typeof GovernanceWorkflowDrawer });

export function PlatformPageContent() {
  const stats = useSiteStats();
  const { projects } = useProjectStore();
  const inReview = getInReviewCount(projects);

  const capabilities: Capability[] = [
    {
      mode: "link",
      icon: Layers,
      title: "Project Registry",
      desc: "Searchable catalogue with sector, pillar, SDG, and ministry filters.",
      href: "/projects",
      badge: `${stats.totalProjects} projects · ${stats.publishedProjects} published`,
    },
    {
      mode: "drawer",
      icon: Shield,
      title: "Governance Workflow",
      desc: "Draft → review → approve → publish. No direct publishing from draft.",
      Drawer: GovernanceWorkflowDrawer,
    },
    {
      mode: "link",
      icon: Users,
      title: "Persona & Entitlements",
      desc: "Public, registered, qualified investor, and admin access levels.",
      href: "/investor-journey",
    },
    {
      mode: "drawer",
      icon: Settings,
      title: "Admin-Managed Taxonomies",
      desc: "Sectors, pillars, SDGs, ministries configurable by super admin.",
      Drawer: AdminTaxonomiesDrawer,
      badge: `${stats.sectorCount} sectors · ${stats.pillarCount} pillars · ${stats.provinceCount} provinces`,
    },
    {
      mode: "link",
      icon: Shield,
      title: "Content Gating",
      desc: "Capital estimates and financial details gated behind qualified-investor verification.",
      href: "/register",
    },
    {
      mode: "link",
      icon: Users,
      title: "Strategic Partnerships & Inquiries",
      desc: "Investment interest, meeting requests, and document access — routed to the right desk in three steps.",
      href: "/strategic-partnerships",
    },
    {
      mode: "drawer",
      icon: Handshake,
      title: "Deal Room",
      desc: "Private workspace where approved investors and government stakeholders track deals on a project kanban.",
      Drawer: DealRoomDrawer,
      badge: `${stats.totalProjects} projects · ${stats.publishedProjects} published · ${inReview} in review`,
    },
  ];

  return (
    <DeepDiveShell overline="Architecture & Operations · Platform Concept" title="Platform Overview">
      <FadeUp>
        <p className="text-base mb-10 max-w-3xl" style={{ color: "var(--color-text-secondary)" }}>
          A governed digital investment intelligence platform that strengthens investment visibility, project discovery,
          investor engagement, and institutional coordination — without replacing ZIDA or government systems.
        </p>
      </FadeUp>

      <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
        {capabilities.map((cap) => {
          const Icon = cap.icon;
          const AffordanceIcon = cap.mode === "link" ? ArrowUpRight : Info;
          const cardBody = (
            <ExecutiveCard className="h-full transition-colors group-hover:border-[var(--color-zim-accent)]">
              <div className="flex items-start justify-between mb-3">
                <Icon className="h-7 w-7" style={{ color: "var(--color-gold)" }} />
                <AffordanceIcon
                  className="h-4 w-4 opacity-40 transition-opacity group-hover:opacity-100"
                  style={{ color: "var(--color-text-muted)" }}
                />
              </div>
              <h3 className="text-base font-medium text-white mb-2" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
                {cap.title}
              </h3>
              <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>{cap.desc}</p>
              {cap.badge && (
                <p className="text-xs font-medium" style={{ color: "var(--color-gold)" }}>
                  {cap.badge}
                </p>
              )}
            </ExecutiveCard>
          );

          return (
            <StaggerItem key={cap.title}>
              {cap.mode === "link" ? (
                <Link href={cap.href} className="group block h-full">
                  {cardBody}
                </Link>
              ) : (
                <cap.Drawer
                  trigger={
                    <button type="button" className="group block h-full w-full text-left">
                      {cardBody}
                    </button>
                  }
                />
              )}
            </StaggerItem>
          );
        })}

        <StaggerItem className="lg:col-span-2">
          <ExecutiveCard variant="highlighted" className="h-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-7 w-7 shrink-0" style={{ color: "var(--color-gold)" }} />
              <div>
                <h3 className="text-base font-medium text-white mb-1" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
                  Interested in Deal Room access?
                </h3>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Talk to our team about qualifying for investor or government access.
                </p>
              </div>
            </div>
            <Link href="/strategic-partnerships" className="btn-sovereign text-xs px-4 py-2 shrink-0">
              Talk to our team <ArrowRight className="h-3 w-3" />
            </Link>
          </ExecutiveCard>
        </StaggerItem>
      </StaggerContainer>

      <FadeUp>
        <ExecutiveCard variant="highlighted" className="mb-8">
          <h2
            className="font-light mb-4 text-xl text-white"
            style={{ letterSpacing: "var(--type-heading-tracking)" }}
          >
            Starting Point: ZIDA 2025 Static Catalogue
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-light leading-none" style={{ fontSize: "1.75rem", color: "var(--color-gold)" }}>
                {stats.totalProjects}
              </p>
              <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--color-text-muted)" }}>Catalogue Projects</p>
            </div>
            <div>
              <p className="font-light leading-none" style={{ fontSize: "1.75rem", color: "var(--color-gold)" }}>
                {stats.publishedProjects}
              </p>
              <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--color-text-muted)" }}>Published</p>
            </div>
            <div>
              <p className="font-light leading-none" style={{ fontSize: "1.75rem", color: "var(--color-gold)" }}>
                {stats.sectorCount}
              </p>
              <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--color-text-muted)" }}>Sectors</p>
            </div>
          </div>
        </ExecutiveCard>
      </FadeUp>

      <FadeUp>
        <ExecutiveCard className="mb-8">
          <h2
            className="font-light mb-3 text-xl text-white"
            style={{ letterSpacing: "var(--type-heading-tracking)" }}
          >
            Ownership Model
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
            Afronovation owns and operates the platform as proprietary SaaS. Government/ZIDA data and official content remain owned by Zimbabwean authorities.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/strategic-alignment" className="btn-sovereign-ghost text-xs px-4 py-2">Strategic Pillars</Link>
            <Link href="/about-afronovation" className="btn-sovereign-ghost text-xs px-4 py-2">Afronovation</Link>
            <Link href="/projects" className="btn-sovereign text-xs px-4 py-2">Browse Registry <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </ExecutiveCard>
      </FadeUp>

      <FadeUp delay={0.15}>
        <div className="mt-10 text-center">
          <Link
            href="/strategic-alignment"
            className="inline-flex items-center gap-2 text-sm transition-colors hover:text-white"
            style={{ color: "var(--color-text-muted)" }}
          >
            Continue the narrative: Strategic Pillars <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </FadeUp>
    </DeepDiveShell>
  );
}
