"use client";

import Link from "next/link";
import { StaggerContainer, StaggerItem } from "@/components/ui/cinematic-reveal";
import { ProjectCard } from "@/components/projects/project-card";
import type { InvestmentProject } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "@/context/locale-context";

interface LandingFeaturedOpportunitiesProps {
  projects: InvestmentProject[];
}

export function LandingFeaturedOpportunities({ projects }: LandingFeaturedOpportunitiesProps) {
  const t = useTranslations();

  return (
    <section className="py-20" style={{ backgroundColor: "var(--color-sovereign-midnight)" }}>
      <div className="page-container">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="section-overline mb-2">{t.home.featured.overline}</p>
            <h2 className="text-3xl font-light text-white" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
              {t.home.featured.title}
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {t.home.featured.subtitle}
            </p>
          </div>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 hidden sm:inline-flex">
            <Link href="/projects">
              {t.home.featured.fullRegistry} <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <StaggerItem key={project.id}>
              <ProjectCard project={project} dark />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
