"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { BellRing } from "lucide-react";
import { useProjectStore } from "@/context/project-store-context";
import { useDemoPersona } from "@/context/demo-persona-context";
import { useAuth } from "@/context/auth-context";
import { filterProjects } from "@/lib/entitlements/visibility";
import { useSavedSearches } from "@/lib/hooks/use-saved-searches";
import type { ProjectFilters, SavedSearch } from "@/lib/types";
import { paramsToFilters, normalizeFilters, syncFiltersToUrl } from "@/lib/utils/project-filters-url";
import { ProjectFiltersBar } from "@/components/projects/project-filters";
import { ProjectCard } from "@/components/projects/project-card";
import { SaveSearchModal } from "@/components/projects/save-search-modal";
import { RegisteredWelcomePanel } from "@/components/projects/registered-welcome-panel";
import { HomeCtaSection } from "@/components/sections/home-cta-section";
import { Button } from "@/components/ui/button";
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
  const { userId } = useAuth();
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [showWelcome, setShowWelcome] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const mountedRef = useRef(false);
  const isSignedIn = Boolean(userId);
  const { savedSearches, saveSearch, deleteSearch } = useSavedSearches(isSignedIn);

  const applySavedSearch = (search: SavedSearch) => setFilters(normalizeFilters(search.filters ?? {}));

  // Read all registry deep-link/filter params client-side (not via useSearchParams(), which would
  // force this whole static page behind a Suspense boundary and lose its prerendered content) so
  // /strategic-alignment's and /sectors's "Browse projects" links pre-filter the registry, the
  // utility-bar search box can deep-link a query, and any shared filtered URL restores exactly.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restored = paramsToFilters(params);
    if (Object.keys(restored).length > 0) setFilters(restored);
    if (params.get("welcome") === "1") setShowWelcome(true);
  }, []);

  // Two-way sync: mirror the active filter set back onto the URL. Skips the first render so the
  // mount-time read above isn't clobbered by an empty write before its setFilters commits.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    syncFiltersToUrl(filters);
  }, [filters]);

  const filtered = useMemo(
    () => filterProjects(projects, filters, persona),
    [projects, filters, persona]
  );

  // High-intent signal: two or more active mandate filters of ANY kind are set, so surface the
  // "Save Search & Alerts" banner. Each dimension counts once; capital counts once whether via
  // bracket or custom range; multi-select dimensions (pillar / SDG / financing) count once each
  // regardless of how many values are picked, and keyword search counts as a dimension too.
  const granularFilterCount =
    (filters.search ? 1 : 0) +
    (filters.sectorId ? 1 : 0) +
    (filters.capitalBracket || filters.minCapitalMillions || filters.maxCapitalMillions ? 1 : 0) +
    (filters.province ? 1 : 0) +
    (filters.ministryId ? 1 : 0) +
    (filters.pipelineType ? 1 : 0) +
    (filters.pillarId?.length ? 1 : 0) +
    (filters.sdgId?.length ? 1 : 0) +
    (filters.financingType?.length ? 1 : 0) +
    (filters.readiness ? 1 : 0) +
    (filters.updatedWithin ? 1 : 0) +
    (filters.recentDataRoom ? 1 : 0);
  const showSaveBanner = granularFilterCount >= 2;

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

        <RegisteredWelcomePanel showWelcomeParam={showWelcome} />

        <div className="mb-8">
          <ProjectFiltersBar
            projects={projects}
            filters={filters}
            onFiltersChange={setFilters}
            resultCount={filtered.length}
            savedSearches={isSignedIn ? savedSearches : undefined}
            onSaveSearch={() => setSaveOpen(true)}
            onApplySavedSearch={applySavedSearch}
            onDeleteSavedSearch={isSignedIn ? deleteSearch : undefined}
          />
        </div>

        {showSaveBanner && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zim-green-700/30 bg-zim-green-700/5 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-zim-green-700" />
              <div>
                <p className="text-sm font-medium text-zim-charcoal">Save this search & get email alerts</p>
                <p className="text-xs text-zim-muted">
                  {isSignedIn
                    ? "Get notified when opportunities matching these filters are added or updated."
                    : "Register your mandate with our deal team — sign in to save searches to your account."}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setSaveOpen(true)} className="gap-1.5">
              <BellRing className="h-3.5 w-3.5" />
              {isSignedIn ? "Save Search" : "Register Interest"}
            </Button>
          </div>
        )}

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

      <HomeCtaSection />

      <SaveSearchModal
        open={saveOpen}
        onOpenChange={setSaveOpen}
        filters={filters}
        onSaved={saveSearch}
      />
    </>
  );
}
