"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Calendar,
  MapPin,
  Building2,
  KeyRound,
  BookOpen,
  Quote,
  Landmark,
  CircleDot,
  ShieldCheck,
  Handshake,
  Gauge,
  Lock,
  Eye,
} from "lucide-react";
import { useProjectStore } from "@/context/project-store-context";
import { useDemoPersona } from "@/context/demo-persona-context";
import { useSiteSettings } from "@/context/site-settings-context";
import {
  getSectorById,
  getSectorDisplayName,
  getSubsectorById,
  getPillarById,
  getSdgById,
  getMinistryById,
} from "@/lib/data/taxonomies";
import { canViewProject, accessLevelForRole, canAccessVisibilityLevel } from "@/lib/entitlements/visibility";
import { useAuth } from "@/context/auth-context";
import { classifyFinancingType } from "@/lib/utils/financing-type";
import { parseCapitalTotalMillions, parseCapitalBreakdown, formatMillions } from "@/lib/utils/capital";
import { getRelevantGlossaryTerms } from "@/lib/data/glossary";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { ExecutiveCard } from "@/components/system/executive-card";
import { RegistrationPrompt } from "@/components/shared/registration-prompt";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProjectCard } from "@/components/projects/project-card";
import { SdgBadge } from "@/components/ui/sdg-badge";
import { WorkspaceAccessCta } from "@/components/deal-room/workspace-access-cta";
import { ProjectEngageCta } from "@/components/deal-room/project-engage-cta";
import { DealRoomAccessButton } from "@/components/deal-room/deal-room-access-button";
import { HomeCtaSection } from "@/components/sections/home-cta-section";
import { Badge } from "@/components/ui/badge";
import { SITE_URL } from "@/lib/config/site";
import { useLocale, useTranslations } from "@/context/locale-context";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { locale } = useLocale();
  const t = useTranslations();
  const pd = t.projectDetail;
  const { projects, getProjectBySlug } = useProjectStore();
  const { persona, isRegistered, isQualified, isAdmin } = useDemoPersona();
  // Real auth (not the demo toggle) for Deal Room entitlement — approved investors skip the
  // document-request funnel and go straight into the Deal Room.
  const {
    isQualified: isQualifiedReal,
    isAdmin: isAdminReal,
    isSuperAdmin: isSuperAdminReal,
    role: realRole,
    ndaAcceptedAt,
  } = useAuth();
  const hasDealRoomAccess = isQualifiedReal || isAdminReal || isSuperAdminReal;
  const realAccessLevel = accessLevelForRole(realRole);
  const { costStructureHidden } = useSiteSettings();

  const project = getProjectBySlug(slug);
  if (!project) notFound();

  if (!canViewProject(persona, project) && !isAdmin) {
    return (
      <DeepDiveShell backHref="/projects" backLabel={pd.backToRegistry}>
        <div className="max-w-lg mx-auto text-center py-16">
          <h1 className="text-2xl font-light text-white mb-3">{pd.notAvailable.title}</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {pd.notAvailable.description}
          </p>
        </div>
      </DeepDiveShell>
    );
  }

  const sector = getSectorById(project.sectorId);
  const subsector = project.subsectorId ? getSubsectorById(project.subsectorId) : null;
  const pillars = project.strategicPillarIds.map((id) => getPillarById(id)).filter(Boolean);
  const sdgs = project.sdgIds.map((id) => getSdgById(id)).filter(Boolean);
  const ministry = getMinistryById(project.primaryBeneficiaryMinistryId);
  const secondaryMinistries = (project.secondaryBeneficiaryMinistryIds ?? [])
    .map((id) => getMinistryById(id))
    .filter(Boolean);

  const financingBucket = project.financingType ? classifyFinancingType(project.financingType) : null;
  const totalCapitalMillions = parseCapitalTotalMillions(project.capitalRequired);
  const capitalRange = totalCapitalMillions !== null ? formatMillions(totalCapitalMillions) : null;

  const costItems = parseCapitalBreakdown(project.capitalRequired);
  const totalCostItem = costItems.find((i) => i.label === "Total Cost Estimate");
  const componentCostItems = costItems.filter((i) => i.label !== "Total Cost Estimate");

  const glossaryTerms = getRelevantGlossaryTerms(project);

  const timelineLabel = project.publishedAt ? pd.published : pd.lastUpdated;
  const timelineDate = formatMonthYear(project.publishedAt ?? project.updatedAt, locale);
  const verificationLabel = pd.dataVerification[project.dataVerificationStatus];

  const relatedProjects = projects
    .filter((p) => p.id !== project.id && p.sectorId === project.sectorId && p.projectStatus === "published")
    .slice(0, 3);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t.breadcrumb.home, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: t.breadcrumb.platform, item: `${SITE_URL}/platform` },
      { "@type": "ListItem", position: 3, name: t.breadcrumb.projects, item: `${SITE_URL}/projects` },
      { "@type": "ListItem", position: 4, name: project.title, item: `${SITE_URL}/projects/${project.slug}` },
    ],
  };

  return (
    <>
      <DeepDiveShell backHref="/projects" backLabel={pd.backToRegistry} minHeightScreen={false}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />

        {/* Hero */}
        <div className="mb-10 max-w-4xl">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge>{getSectorDisplayName(sector)}</Badge>
            {subsector && <span className="status-badge status-badge-info">{subsector.name}</span>}
            {project.pipelineType === "policy_initiative" && (
              <span className="status-badge status-badge-pending">{pd.policyInitiativeBadge}</span>
            )}
          </div>
          <h1
            className="font-light text-white mb-4"
            style={{
              fontSize: "var(--type-display-size)",
              letterSpacing: "var(--type-display-tracking)",
              lineHeight: "var(--type-display-leading)",
            }}
          >
            {project.title}
          </h1>
          <div
            className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm mb-3"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {project.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> {pd.implementingEntity}: {project.projectOwner}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" /> {project.projectReadiness}
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {pd.projectRef}: {project.id.toUpperCase()} · {pd.source}: {project.sourceReference ?? pd.defaultSource} —{" "}
            {verificationLabel}
            {timelineDate && <> · {timelineLabel} {timelineDate}</>}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8 min-w-0">
            {/* Basic Project Data stat strip — always public, always 4 columns */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <StatTile
                icon={Landmark}
                label={pd.statTiles.beneficiaryMinistry}
                value={ministry?.shortName ?? pd.statTiles.notYetAssigned}
              />
              <StatTile icon={CircleDot} label={pd.statTiles.status} node={<StatusBadge status={project.projectStatus} />} />
              <StatTile
                icon={ShieldCheck}
                label={pd.statTiles.dataVerification}
                node={
                  <span className="status-badge status-badge-info">
                    {verificationLabel}
                  </span>
                }
              />
              <StatTile icon={Handshake} label={pd.statTiles.financingInstrument} value={financingBucket ?? pd.statTiles.structureTbd} />
            </div>

            {/* Executive Summary (restyled Development Objective) */}
            <ExecutiveCard>
              <p className="section-overline mb-3">{pd.developmentObjective}</p>
              <div className="flex gap-3">
                <Quote
                  className="h-6 w-6 shrink-0 -mt-1"
                  style={{ color: "rgba(255,211,0,0.35)" }}
                  aria-hidden="true"
                />
                <p
                  className="text-base leading-relaxed italic"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {project.opportunitySummary}
                </p>
              </div>
            </ExecutiveCard>

            {/* Project Description — public; a fuller narrative than the Executive Summary above */}
            {project.description && project.description !== project.opportunitySummary && (
              <ExecutiveCard>
                <ExecutiveCard.Header overline={pd.projectDesign} title={pd.projectDescription} />
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {project.description}
                </p>
              </ExecutiveCard>
            )}

            {/* Project Scope — public */}
            <ExecutiveCard>
              <ExecutiveCard.Header overline={pd.projectDesign} title={pd.projectScope} />
              <ul className="space-y-2">
                {project.scope.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <span
                      className="shrink-0 h-1.5 w-1.5 rounded-full mt-1.5"
                      style={{ backgroundColor: "var(--color-gold)" }}
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </ExecutiveCard>

            {/* Project Components — public cost table; amounts mask behind qualified investor status,
                labels (Equity/Debt/Phase N/Total) stay visible since they're generic line-item names,
                not figures — this is what keeps the card from looking like an empty lock box. */}
            {!costStructureHidden && totalCostItem && (
              <ExecutiveCard>
                <ExecutiveCard.Header overline={pd.financialPerformance} title={pd.projectComponents} />
                <div>
                  {componentCostItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-2.5 border-b"
                      style={{ borderColor: "var(--color-sovereign-border)" }}
                    >
                      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {item.label}
                      </span>
                      <AmountOrLock
                        amount={item.amount}
                        locked={!isQualified}
                        valueClassName="text-sm font-mono text-white"
                      />
                    </div>
                  ))}
                  <div
                    className="flex items-center justify-between pt-3 mt-1 border-t-2"
                    style={{ borderColor: "var(--color-gold)" }}
                  >
                    <span className="text-sm font-semibold text-white">{pd.totalEstimatedProjectCost}</span>
                    <AmountOrLock
                      amount={totalCostItem.amount}
                      locked={!isQualified}
                      valueClassName="text-base font-mono font-bold"
                      valueStyle={{ color: "var(--color-gold)" }}
                    />
                  </div>
                </div>
                {isQualified && project.financingType && (
                  <p className="mt-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {pd.financingStructure}: {project.financingType}
                  </p>
                )}
                <p className="mt-2 text-[0.65rem] italic" style={{ color: "var(--color-text-muted)" }}>
                  {pd.estimatedFiguresDisclaimer}
                </p>
                {!isQualified && <UnlockNotice leadText={pd.unlockCostBreakdownLead} isRegistered={isRegistered} pd={pd} />}
              </ExecutiveCard>
            )}

            {/* Financial Performance Data — masked metric grid, not a section-level gate.
                Gated at "qualified" (admin-approved), not merely "registered": these are the project's
                own return figures, reserved for vetted investors per DFI/PE data-room convention. */}
            <ExecutiveCard>
              <ExecutiveCard.Header overline={pd.financialPerformance} title={pd.financialPerformanceData} />
              <dl className="grid gap-4 sm:grid-cols-2">
                <FinRow label={pd.irr} value={project.irr} locked={!isQualified} notDisclosed={pd.notDisclosed} />
                <FinRow label={pd.npv} value={project.npv} locked={!isQualified} notDisclosed={pd.notDisclosed} />
                <FinRow label={pd.roi} value={project.roi} locked={!isQualified} notDisclosed={pd.notDisclosed} />
                <FinRow label={pd.paybackPeriod} value={project.paybackPeriod} locked={!isQualified} notDisclosed={pd.notDisclosed} />
                <FinRow
                  label={pd.projectedRevenue}
                  value={project.projectedRevenue}
                  locked={!isQualified}
                  notDisclosed={pd.notDisclosed}
                  className="sm:col-span-2"
                />
              </dl>
              {!isQualified && (
                <UnlockNotice leadText={pd.unlockFinancialFiguresLead} isRegistered={isRegistered} pd={pd} />
              )}
            </ExecutiveCard>

            {/* Expected Development Outcomes — public */}
            <ExecutiveCard>
              <ExecutiveCard.Header overline={pd.impact} title={pd.expectedOutcomes} />
              <ul className="space-y-2">
                {project.developmentImpact.map((impact) => (
                  <li
                    key={impact}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <span
                      className="shrink-0 h-1.5 w-1.5 rounded-full mt-1.5"
                      style={{ backgroundColor: "var(--color-zim-green)" }}
                      aria-hidden="true"
                    />
                    {impact}
                  </li>
                ))}
              </ul>
            </ExecutiveCard>

            {/* Institutional & Stakeholder Alignment — always public, per the platform's transparency principle */}
            <ExecutiveCard>
              <ExecutiveCard.Header overline={pd.institutionalAlignment} title={pd.institutionalStakeholderAlignment} />
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs mr-1" style={{ color: "var(--color-text-muted)" }}>
                    {pd.sector}
                  </span>
                  {sector && (
                    <Link
                      href={`/sectors/${sector.slug}`}
                      className="status-badge status-badge-active hover:opacity-80"
                    >
                      {getSectorDisplayName(sector)}
                    </Link>
                  )}
                  {subsector && (
                    <Link
                      href={`/sectors/${sector?.slug}`}
                      className="status-badge status-badge-info hover:opacity-80"
                    >
                      {subsector.name}
                    </Link>
                  )}
                </div>
                {pillars.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs mr-1" style={{ color: "var(--color-text-muted)" }}>
                      {pd.strategicPillars}
                    </span>
                    {pillars.map(
                      (p) =>
                        p && (
                          <Link key={p.id} href={`/projects?pillarId=${p.id}`} className="status-badge status-badge-info hover:opacity-80">
                            {p.name.split("&")[0].trim()}
                          </Link>
                        )
                    )}
                  </div>
                )}
                {sdgs.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs mr-1" style={{ color: "var(--color-text-muted)" }}>
                      {pd.sdgs}
                    </span>
                    {sdgs.map((s) => s && <SdgBadge key={s.id} sdg={s} size="sm" href={`/projects?sdgId=${s.id}`} />)}
                  </div>
                )}
                {(ministry || secondaryMinistries.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs mr-1" style={{ color: "var(--color-text-muted)" }}>
                      {secondaryMinistries.length > 0 ? pd.beneficiaryMinistries : pd.beneficiaryMinistry}
                    </span>
                    {ministry && (
                      <Link href={`/projects?ministryId=${ministry.id}`} className="status-badge status-badge-active hover:opacity-80">
                        {ministry.shortName} <span className="opacity-70">{pd.primary}</span>
                      </Link>
                    )}
                    {secondaryMinistries.map(
                      (m) =>
                        m && (
                          <Link key={m.id} href={`/projects?ministryId=${m.id}`} className="status-badge status-badge-info hover:opacity-80">
                            {m.shortName}
                          </Link>
                        )
                    )}
                  </div>
                )}
                {pillars.length > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: "var(--color-sovereign-border)" }}>
                    <p
                      className="text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <BookOpen className="h-3.5 w-3.5" /> {pd.nationalAlignment}
                    </p>
                    <ul className="space-y-1.5">
                      {pillars.map(
                        (p) =>
                          p && (
                            <li key={p.id} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                              <span className="text-white font-medium">{p.name}:</span> {p.policyAlignment.primary}
                            </li>
                          )
                      )}
                    </ul>
                  </div>
                )}
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {pd.alignmentDisclaimer}
                </p>
              </div>
            </ExecutiveCard>

            {/* Documents & Data Room — public, informational; per-row badges signal file-level gating once real files exist */}
            <ExecutiveCard>
              <ExecutiveCard.Header overline={pd.dataRoom} title={pd.documentsAndDataRoom} />
              {(project.documentRecords ?? []).length > 0 ? (
                <div className="space-y-2 mb-5">
                  {(project.documentRecords ?? []).map((doc) => {
                    const hasLevelAccess = canAccessVisibilityLevel(realAccessLevel, doc.visibilityLevel);
                    const needsNda =
                      doc.visibilityLevel === "qualified_investor" && realRole === "qualified" && !ndaAcceptedAt;
                    const unlocked = hasLevelAccess && !needsNda;
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center gap-2.5 text-sm p-2.5 rounded"
                        style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                      >
                        <FileText className="h-4 w-4 shrink-0" style={{ color: "var(--color-gold)" }} />
                        <span className="flex-1" style={{ color: "var(--color-text-secondary)" }}>{doc.title}</span>
                        {unlocked ? (
                          <span className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`/api/projects/${project.id}/documents/${doc.id}/download?mode=preview`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded hover:underline"
                              style={{
                                backgroundColor: "rgba(255,255,255,0.06)",
                                color: "var(--color-text-secondary)",
                                border: "1px solid rgba(255,255,255,0.14)",
                              }}
                            >
                              <Eye className="h-3 w-3" /> Preview
                            </a>
                            <a
                              href={`/api/projects/${project.id}/documents/${doc.id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded hover:underline"
                              style={{
                                backgroundColor: "rgba(74,222,128,0.12)",
                                color: "#4ade80",
                                border: "1px solid rgba(74,222,128,0.3)",
                              }}
                            >
                              Download
                            </a>
                          </span>
                        ) : (
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
                            style={{
                              backgroundColor: "rgba(255,211,0,0.12)",
                              color: "var(--color-gold)",
                              border: "1px solid rgba(255,211,0,0.3)",
                            }}
                          >
                            {needsNda ? "NDA Required" : pd.qualifiedAccess}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
                  {pd.dataRoomPreparing}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {hasDealRoomAccess ? (
                  // Approved investors / staff aren't required to request access — they open the
                  // documents directly inside the Deal Room.
                  <Link
                    href={`/deal-room/pipeline?projectId=${project.id}`}
                    className="btn-sovereign text-xs px-4 py-2"
                  >
                    <FileText className="h-3.5 w-3.5" /> {pd.accessDocuments}
                  </Link>
                ) : (
                  <Link
                    href={`/strategic-partnerships?projectId=${project.id}&ask=document_request`}
                    className="btn-sovereign-ghost text-xs px-4 py-2"
                  >
                    {pd.requestDocumentAccess}
                  </Link>
                )}
                <Link
                  href={`/strategic-partnerships?projectId=${project.id}&ask=investment_interest`}
                  className="btn-sovereign-ghost text-xs px-4 py-2"
                >
                  {pd.submitInvestmentInterest}
                </Link>
                <Link
                  href={`/strategic-partnerships?projectId=${project.id}&ask=meeting_request`}
                  className="btn-sovereign text-xs px-4 py-2"
                >
                  <Calendar className="h-3.5 w-3.5" /> {pd.requestMeeting}
                </Link>
              </div>
            </ExecutiveCard>

            {/* Related Opportunities */}
            {relatedProjects.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="section-overline m-0">{pd.relatedOpportunities}</p>
                  {sector && (
                    <Link href={`/sectors/${sector.slug}`} className="text-xs hover:underline whitespace-nowrap" style={{ color: "var(--color-gold)" }}>
                      {pd.moreInSector} {getSectorDisplayName(sector)} →
                    </Link>
                  )}
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedProjects.map((p) => (
                    <ProjectCard key={p.id} project={p} dark />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            {!costStructureHidden && (
              <div className="rounded border p-4" style={{ borderColor: "var(--color-sovereign-border)" }}>
                <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                  {pd.totalProjectCost}
                </p>
                {!capitalRange ? (
                  <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                    {pd.costEstimatePending}
                  </p>
                ) : isQualified ? (
                  <>
                    <p className="text-2xl font-mono text-white">{capitalRange}</p>
                    <p className="text-[10px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                      {pd.indicativeOnly}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2" aria-hidden="true">
                      <Lock className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
                      <div
                        className="h-6 w-20 rounded animate-pulse"
                        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                      />
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                      {pd.approvedInvestorsOnly}{" "}
                      <Link
                        href={isRegistered ? "/strategic-partnerships" : "/register"}
                        className="hover:underline"
                        style={{ color: "var(--color-gold)" }}
                      >
                        {isRegistered ? pd.requestQualifiedAccess : pd.registerToGetStarted}
                      </Link>
                    </p>
                  </>
                )}
              </div>
            )}

            <ExecutiveCard>
              <ExecutiveCard.Header overline={pd.geography} title={pd.location} />
              <dl className="space-y-2 text-sm">
                {project.province && <LocRow label={pd.province} value={project.province} />}
                {project.district && <LocRow label={pd.district} value={project.district} />}
                <LocRow label={pd.site} value={project.location} />
              </dl>
            </ExecutiveCard>

            <div
              className="rounded-lg border p-5"
              style={{ borderColor: "var(--color-gold)", backgroundColor: "rgba(255,211,0,0.06)" }}
            >
              <div className="flex items-start gap-3 mb-4">
                <KeyRound className="h-5 w-5 shrink-0" style={{ color: "var(--color-gold)" }} />
                <div>
                  <p className="text-sm font-medium text-white">{pd.blueprintTitle}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    {pd.blueprintDescription}
                  </p>
                </div>
              </div>
              <WorkspaceAccessCta />
            </div>

            <DealRoomAccessButton projectId={project.id} />

            <ProjectEngageCta project={project} />

            <ExecutiveCard>
              <ExecutiveCard.Header overline={pd.reference} title={pd.glossaryOfTerms} />
              <dl className="space-y-3">
                {glossaryTerms.map((g) => (
                  <div key={g.term}>
                    <dt className="text-xs font-mono font-bold" style={{ color: "var(--color-gold)" }}>
                      {g.term}
                    </dt>
                    <dd className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {g.definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </ExecutiveCard>

            {!isQualified && (
              <RegistrationPrompt
                dark
                message={isRegistered ? pd.registrationOnFile : pd.registerForFigures}
                ctaLabel={isRegistered ? pd.requestQualifiedAccess : pd.registerToUnlock}
                ctaHref={isRegistered ? "/strategic-partnerships" : "/register"}
              />
            )}
          </aside>
        </div>
      </DeepDiveShell>

      <HomeCtaSection />
    </>
  );
}

function StatTile({
  label,
  value,
  node,
  icon: Icon,
}: {
  label: string;
  value?: string;
  node?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="p-4 rounded border" style={{ borderColor: "var(--color-sovereign-border)" }}>
      <p
        className="text-xs uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
        style={{ color: "var(--color-text-muted)" }}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        {label}
      </p>
      {node ?? <p className="text-lg font-mono text-white">{value}</p>}
    </div>
  );
}

function FinRow({
  label,
  value,
  locked,
  notDisclosed,
  className,
}: {
  label: string;
  value?: string;
  locked?: boolean;
  notDisclosed: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt
        className="text-xs uppercase tracking-widest mb-1 flex items-center gap-1.5"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
        {locked && <Lock className="h-3 w-3" aria-hidden="true" />}
      </dt>
      {locked ? (
        <dd aria-hidden="true">
          <div
            className="h-4 w-24 rounded animate-pulse"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          />
        </dd>
      ) : (
        <dd className="text-sm font-medium text-white">{value || notDisclosed}</dd>
      )}
    </div>
  );
}

function formatMonthYear(iso: string | undefined, locale: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    month: "short",
    year: "numeric",
  });
}

function AmountOrLock({
  amount,
  locked,
  valueClassName,
  valueStyle,
}: {
  amount: string;
  locked: boolean;
  valueClassName: string;
  valueStyle?: React.CSSProperties;
}) {
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1.5" aria-hidden="true">
        <Lock className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />
        <span
          className="h-4 w-16 rounded animate-pulse inline-block"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        />
      </span>
    );
  }
  return (
    <span className={valueClassName} style={valueStyle}>
      {amount}
    </span>
  );
}

/** Branched unlock CTA for financial figures: a public visitor is told to register first, while an
 *  already-registered-but-not-yet-approved investor is told their next step is verification, not
 *  another registration form. */
function UnlockNotice({
  leadText,
  isRegistered,
  pd,
}: {
  leadText: string;
  isRegistered: boolean;
  pd: ReturnType<typeof useTranslations>["projectDetail"];
}) {
  if (isRegistered) {
    return (
      <p className="mt-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
        {leadText} {pd.unlockRegisteredSuffix}{" "}
        <Link href="/strategic-partnerships" className="hover:underline" style={{ color: "var(--color-gold)" }}>
          {pd.requestQualifiedAccess}
        </Link>
      </p>
    );
  }
  return (
    <p className="mt-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
      {leadText} {pd.unlockPublicSuffix}{" "}
      <Link href="/register" className="hover:underline" style={{ color: "var(--color-gold)" }}>
        {pd.registerThenVerify}
      </Link>
    </p>
  );
}

function LocRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt style={{ color: "var(--color-text-muted)" }}>{label}</dt>
      <dd className="text-white font-medium text-right">{value}</dd>
    </div>
  );
}
