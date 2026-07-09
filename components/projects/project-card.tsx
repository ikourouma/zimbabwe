import type { InvestmentProject } from "@/lib/types";
import Link from "next/link";
import { getSectorById, getSectorDisplayName, getSdgById, getPillarById, getMinistryById } from "@/lib/data/taxonomies";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CapitalBreakdown } from "@/components/projects/capital-breakdown";
import { MapPin, Building2, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: InvestmentProject;
  dark?: boolean;
}

export function ProjectCard({ project, dark = false }: ProjectCardProps) {
  const sector = getSectorById(project.sectorId);
  const pillars = project.strategicPillarIds.slice(0, 2).map((id) => getPillarById(id)).filter(Boolean);
  const sdgs = project.sdgIds.slice(0, 3).map((id) => getSdgById(id)).filter(Boolean);
  const ministry = getMinistryById(project.primaryBeneficiaryMinistryId);

  return (
    <Card
      className={cn(
        "flex flex-col h-full transition-shadow hover:shadow-md",
        dark && "bg-[var(--color-sovereign-deep)] border-[var(--color-sovereign-border)] text-white"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant={dark ? "outline" : "secondary"}
            className={cn("w-fit whitespace-nowrap", dark && "border-white/20 text-white")}
          >
            {getSectorDisplayName(sector)}
          </Badge>
          {project.pipelineType === "policy_initiative" && (
            dark ? (
              <span className="status-badge status-badge-pending w-fit whitespace-nowrap">
                Illustrative · TA Required
              </span>
            ) : (
              <Badge variant="gold" className="w-fit whitespace-nowrap">Illustrative · TA Required</Badge>
            )
          )}
        </div>
        <CardTitle className={cn("text-lg leading-snug mt-2", dark ? "text-white" : "")}>
          <Link href={`/projects/${project.slug}`} className={dark ? "hover:text-[var(--color-gold)]" : "hover:text-zim-green-700"}>
            {project.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <p className={cn("text-sm line-clamp-3", dark ? "text-[var(--color-text-secondary)]" : "text-zim-muted")}>
          {project.opportunitySummary}
        </p>

        <CapitalBreakdown value={project.capitalRequired} dark={dark} maxItems={3} label="Cost Structure" />

        <div className="flex flex-wrap gap-1">
          {pillars.map((p) => p && (
            <Badge key={p.id} variant="outline" className={cn("text-xs", dark && "border-white/20 text-white/80")}>
              {p.name.split("&")[0].trim()}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {sdgs.map((s) => s && (
            <span key={s.id} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: s.colorToken }}>
              SDG {s.number}
            </span>
          ))}
        </div>
        <div className={cn("space-y-1 text-xs", dark ? "text-[var(--color-text-muted)]" : "text-zim-muted")}>
          <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{project.location}</div>
          <div className="flex items-center gap-1"><Building2 className="h-3 w-3" />{project.projectOwner}</div>
          {ministry && (
            <div className="flex items-center gap-1"><Landmark className="h-3 w-3" />{ministry.shortName}</div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild variant="outline" size="sm" className={cn("w-full", dark && "border-white/20 text-white hover:bg-white/10")}>
          <Link href={`/projects/${project.slug}`}>View opportunity</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
