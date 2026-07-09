"use client";

import Link from "next/link";
import { StaggerContainer, StaggerItem } from "@/components/ui/cinematic-reveal";
import { ProjectCard } from "@/components/projects/project-card";
import type { InvestmentProject } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface LandingFeaturedOpportunitiesProps {
  projects: InvestmentProject[];
}

export function LandingFeaturedOpportunities({ projects }: LandingFeaturedOpportunitiesProps) {
  return (
    <section className="py-20" style={{ backgroundColor: "var(--color-sovereign-midnight)" }}>
      <div className="page-container">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="section-overline mb-2">Featured Opportunities</p>
            <h2 className="text-3xl font-light text-white" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
              Highlighted ZIDA Projects
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              From the ZIDA 2025 catalogue — pending official validation
            </p>
          </div>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 hidden sm:inline-flex">
            <Link href="/projects">
              Full registry <ArrowRight className="h-4 w-4 ml-1" />
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
