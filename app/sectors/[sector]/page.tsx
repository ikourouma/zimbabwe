"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { useProjectStore } from "@/context/project-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useDemoPersona } from "@/context/demo-persona-context";
import { getPillarById, getSdgById, getMinistryById } from "@/lib/data/taxonomies";
import { getSectorStats } from "@/lib/data/site-stats";
import { ProjectCard } from "@/components/projects/project-card";
import { EstInvestmentRange } from "@/components/projects/est-investment-range";
import { WorkspaceAccessCta } from "@/components/deal-room/workspace-access-cta";
import { Badge } from "@/components/ui/badge";
import { SITE_URL } from "@/lib/config/site";
import { cn } from "@/lib/utils";

export default function SectorDetailPage({
  params,
}: {
  params: Promise<{ sector: string }>;
}) {
  const { sector: slug } = use(params);
  const { sectors } = useTaxonomyStore();
  const { projects } = useProjectStore();
  const { isQualified } = useDemoPersona();

  const sector = sectors.find((s) => s.slug === slug);
  if (!sector) notFound();

  const publishedProjects = projects.filter(
    (p) => p.sectorId === sector.id && p.projectStatus === "published"
  );
  const allSectorProjects = projects.filter((p) => p.sectorId === sector.id);
  const sectorStats = getSectorStats(sector.id, projects);

  const pillarIds = Array.from(new Set(allSectorProjects.flatMap((p) => p.strategicPillarIds)));
  const sdgIds = Array.from(new Set(allSectorProjects.flatMap((p) => p.sdgIds)));
  const ministryIds = Array.from(
    new Set(
      allSectorProjects.flatMap((p) => [
        p.primaryBeneficiaryMinistryId,
        ...(p.secondaryBeneficiaryMinistryIds ?? []),
      ])
    )
  );
  const pillars = pillarIds.map((id) => getPillarById(id)).filter(Boolean);
  const sdgs = sdgIds.map((id) => getSdgById(id)).filter(Boolean);
  const ministries = ministryIds.map((id) => getMinistryById(id)).filter(Boolean);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Priority Sectors", item: `${SITE_URL}/sectors` },
      { "@type": "ListItem", position: 3, name: sector.name, item: `${SITE_URL}/sectors/${sector.slug}` },
    ],
  };

  return (
    <div className="page-container py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Link href="/sectors" className="inline-flex items-center text-sm text-zim-muted hover:text-zim-green-700 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> All sectors
      </Link>
      <div className="mb-8">
        <Badge className="mb-3">{sector.name}</Badge>
        <h1>{sector.name}</h1>
        <p className="text-zim-muted mt-2 max-w-2xl">{sector.description}</p>
      </div>

      <div className={cn("grid gap-4 mb-8", isQualified ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
        <div className="rounded border p-4 border-zim-border">
          <p className="text-xs text-zim-muted uppercase tracking-widest mb-1">Published</p>
          <p className="text-2xl font-mono">{sectorStats.published}</p>
        </div>
        <div className="rounded border p-4 border-zim-border">
          <p className="text-xs text-zim-muted uppercase tracking-widest mb-1">Subsectors</p>
          <p className="text-2xl font-mono">{sectorStats.subsectorCount}</p>
        </div>
        <div className="rounded border p-4 border-zim-border">
          <p className="text-xs text-zim-muted uppercase tracking-widest mb-1">Provinces</p>
          <p className="text-2xl font-mono">{sectorStats.provinceCount}</p>
        </div>
        <EstInvestmentRange
          capitalRange={sectorStats.capitalRange}
          publishedCount={sectorStats.published}
          boxed
          labelClassName="text-xs uppercase tracking-widest"
          valueClassName="text-2xl font-mono"
        />
      </div>

      {(pillars.length > 0 || sdgs.length > 0 || ministries.length > 0) && (
        <div className="mb-8 space-y-3">
          {pillars.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zim-muted mr-1">Strategic pillars:</span>
              {pillars.map((p) => p && (
                <Link key={p.id} href={`/projects?pillarId=${p.id}`}>
                  <Badge variant="outline" className="hover:border-zim-green-700 whitespace-nowrap">
                    {p.name.split("&")[0].trim()}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
          {sdgs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zim-muted mr-1">SDGs:</span>
              {sdgs.map((s) => s && (
                <Link
                  key={s.id}
                  href={`/projects?sdgId=${s.id}`}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: s.colorToken }}
                  title={s.name}
                >
                  {s.number}
                </Link>
              ))}
            </div>
          )}
          {ministries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zim-muted mr-1">Beneficiary ministries:</span>
              {ministries.map((m) => m && (
                <Link key={m.id} href={`/projects?ministryId=${m.id}`}>
                  <Badge variant="success" className="hover:opacity-80 whitespace-nowrap">
                    {m.shortName}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
          <p className="text-xs text-zim-muted/70">
            Illustrative alignment mapping — pending official ZIDA/ministry validation.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-zim-gold p-5 mb-10 bg-zim-gold/5">
        <div className="flex items-start gap-3 mb-4">
          <KeyRound className="h-5 w-5 shrink-0 text-zim-gold" />
          <div>
            <p className="text-sm font-medium">Full Blueprint Access — Authorized Stakeholders Only</p>
            <p className="text-xs text-zim-muted mt-1">
              Detailed financial models, governance workflow, and the project Deal Room are reserved for
              registered investors and government stakeholders.
            </p>
          </div>
        </div>
        <WorkspaceAccessCta />
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zim-green-700 font-medium">{publishedProjects.length} published projects</p>
        <Link href={`/projects?sectorId=${sector.id}`} className="text-sm text-zim-green-700 hover:underline">
          Browse this sector in the full registry →
        </Link>
      </div>
      {publishedProjects.length === 0 ? (
        <p className="text-zim-muted">No published projects in this sector yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {publishedProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  );
}
