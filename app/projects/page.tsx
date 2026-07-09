"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useProjectStore } from "@/context/project-store-context";
import { useDemoPersona } from "@/context/demo-persona-context";
import { filterProjects } from "@/lib/entitlements/visibility";
import { getPillarById, getSdgById, getMinistryById, getSectorById } from "@/lib/data/taxonomies";
import type { ProjectFilters } from "@/lib/types";
import { ProjectFiltersBar } from "@/components/projects/project-filters";
import { ProjectCard } from "@/components/projects/project-card";
import { SITE_URL } from "@/lib/config/site";

const PAGE_URL = `${SITE_URL}/projects`;

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Platform Concept", item: `${SITE_URL}/platform` },
    { "@type": "ListItem", position: 3, name: "Project Registry", item: PAGE_URL },
  ],
};

export default function ProjectsPage() {
  const { projects } = useProjectStore();
  const { persona } = useDemoPersona();
  const [filters, setFilters] = useState<ProjectFilters>({});

  // Read the ?pillarId=/?sdgId=/?ministryId=/?sectorId= deep-link params client-side (not via
  // useSearchParams(), which would force this whole static page behind a Suspense boundary and
  // lose its prerendered content) so /strategic-alignment's and /sectors's "Browse projects"
  // links pre-filter the registry by pillar, SDG, ministry, or sector. The resulting filter shows
  // up as a removable chip in ProjectFiltersBar exactly like a manually-picked one.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const sectorId = params.get("sectorId");
    if (sectorId && getSectorById(sectorId)) {
      setFilters((prev) => ({ ...prev, sectorId }));
    }

    const pillarId = params.get("pillarId");
    if (pillarId && getPillarById(pillarId)) {
      setFilters((prev) => ({ ...prev, pillarId }));
    }

    const sdgId = params.get("sdgId");
    if (sdgId && getSdgById(sdgId)) {
      setFilters((prev) => ({ ...prev, sdgId }));
    }

    const ministryId = params.get("ministryId");
    if (ministryId && getMinistryById(ministryId)) {
      setFilters((prev) => ({ ...prev, ministryId }));
    }
  }, []);

  const filtered = useMemo(
    () => filterProjects(projects, filters, persona),
    [projects, filters, persona]
  );

  return (
    <>
      <div className="page-container py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <div className="mb-8">
          <h1>Investment Project Registry</h1>
          <p className="text-zim-muted mt-2 max-w-2xl">
            Search and filter curated investment opportunities from the ZIDA 2025 project catalogue.
            Register to unlock expanded project details and financial indicators.
          </p>
        </div>

        <div className="mb-8">
          <ProjectFiltersBar
            projects={projects}
            filters={filters}
            onFiltersChange={setFilters}
            resultCount={filtered.length}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-zim-muted">No projects match your filters.</p>
            <p className="text-sm text-zim-muted mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

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
