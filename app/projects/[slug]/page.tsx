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
import { canViewProject, DATA_VERIFICATION_LABELS } from "@/lib/entitlements/visibility";
import { classifyFinancingType } from "@/lib/utils/financing-type";
import { parseCapitalTotalMillions, parseCapitalBreakdown, formatMillions } from "@/lib/utils/capital";
import { getRelevantGlossaryTerms } from "@/lib/data/glossary";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { ExecutiveCard } from "@/components/system/executive-card";
import { RegistrationPrompt } from "@/components/shared/registration-prompt";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProjectCard } from "@/components/projects/project-card";
import { WorkspaceAccessCta } from "@/components/deal-room/workspace-access-cta";
import { Badge } from "@/components/ui/badge";
import { SITE_URL } from "@/lib/config/site";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { projects, getProjectBySlug } = useProjectStore();
  const { persona, isRegistered, isQualified, isAdmin } = useDemoPersona();
  const { costStructureHidden } = useSiteSettings();

  const project = getProjectBySlug(slug);
  if (!project) notFound();

  if (!canViewProject(persona, project) && !isAdmin) {
    return (
      <DeepDiveShell backHref="/projects" backLabel="Back to registry">
        <div className="max-w-lg mx-auto text-center py-16">
          <h1 className="text-2xl font-light text-white mb-3">Project not available</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            This project is not currently published or you do not have access.
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

  const timelineLabel = project.publishedAt ? "Published" : "Last updated";
  const timelineDate = formatMonthYear(project.publishedAt ?? project.updatedAt);

  const relatedProjects = projects
    .filter((p) => p.id !== project.id && p.sectorId === project.sectorId && p.projectStatus === "published")
    .slice(0, 3);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Platform Concept", item: `${SITE_URL}/platform` },
      { "@type": "ListItem", position: 3, name: "Project Registry", item: `${SITE_URL}/projects` },
      { "@type": "ListItem", position: 4, name: project.title, item: `${SITE_URL}/projects/${project.slug}` },
    ],
  };

  return (
    <>
      <DeepDiveShell backHref="/projects" backLabel="Back to registry" minHeightScreen={false}>
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
              <span className="status-badge status-badge-pending">Illustrative Policy Initiative · TA Required</span>
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
              <Building2 className="h-3.5 w-3.5" /> Implementing Entity: {project.projectOwner}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" /> {project.projectReadiness}
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Project Ref: {project.id.toUpperCase()} · Source: {project.sourceReference ?? "ZIDA 2025 Project Catalogue"} —{" "}
            {DATA_VERIFICATION_LABELS[project.dataVerificationStatus]}
            {timelineDate && <> · {timelineLabel} {timelineDate}</>}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8 min-w-0">
            {/* Basic Project Data stat strip — always public, always 4 columns */}
            <div className="grid gap-4 sm:grid-cols-4">
              <StatTile
                icon={Landmark}
                label="Beneficiary Ministry"
                value={ministry?.shortName ?? "Not yet assigned"}
              />
              <StatTile icon={CircleDot} label="Status" node={<StatusBadge status={project.projectStatus} />} />
              <StatTile
                icon={ShieldCheck}
                label="Data Verification"
                node={
                  <span className="status-badge status-badge-info">
                    {DATA_VERIFICATION_LABELS[project.dataVerificationStatus]}
                  </span>
                }
              />
              <StatTile icon={Handshake} label="Financing Instrument" value={financingBucket ?? "Structure TBD"} />
            </div>

            {/* Executive Summary (restyled Development Objective) */}
            <ExecutiveCard>
              <p className="section-overline mb-3">Development Objective</p>
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
                <ExecutiveCard.Header overline="Project Design" title="Project Description" />
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {project.description}
                </p>
              </ExecutiveCard>
            )}

            {/* Project Scope — public */}
            <ExecutiveCard>
              <ExecutiveCard.Header overline="Project Design" title="Project Scope" />
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
                <ExecutiveCard.Header overline="Financial Performance" title="Project Components" />
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
                    <span className="text-sm font-semibold text-white">Total Estimated Project Cost</span>
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
                    Financing structure: {project.financingType}
                  </p>
                )}
                <p className="mt-2 text-[0.65rem] italic" style={{ color: "var(--color-text-muted)" }}>
                  Estimated figures — subject to change based on feasibility and resource availability.
                </p>
                {!isQualified && <UnlockNotice leadText="The full cost breakdown" isRegistered={isRegistered} />}
              </ExecutiveCard>
            )}

            {/* Financial Performance Data — masked metric grid, not a section-level gate.
                Gated at "qualified" (admin-approved), not merely "registered": these are the project's
                own return figures, reserved for vetted investors per DFI/PE data-room convention. */}
            <ExecutiveCard>
              <ExecutiveCard.Header overline="Financial Performance" title="Financial Performance Data" />
              <dl className="grid gap-4 sm:grid-cols-2">
                <FinRow label="IRR" value={project.irr} locked={!isQualified} />
                <FinRow label="NPV" value={project.npv} locked={!isQualified} />
                <FinRow label="ROI" value={project.roi} locked={!isQualified} />
                <FinRow label="Payback Period" value={project.paybackPeriod} locked={!isQualified} />
                <FinRow
                  label="Projected Revenue"
                  value={project.projectedRevenue}
                  locked={!isQualified}
                  className="sm:col-span-2"
                />
              </dl>
              {!isQualified && (
                <UnlockNotice leadText="Full financial performance figures" isRegistered={isRegistered} />
              )}
            </ExecutiveCard>

            {/* Expected Development Outcomes — public */}
            <ExecutiveCard>
              <ExecutiveCard.Header overline="Impact" title="Expected Development Outcomes" />
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
              <ExecutiveCard.Header overline="Institutional Alignment" title="Institutional & Stakeholder Alignment" />
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs mr-1" style={{ color: "var(--color-text-muted)" }}>
                    Sector:
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
                      Strategic pillars:
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
                      SDGs:
                    </span>
                    {sdgs.map(
                      (s) =>
                        s && (
                          <Link
                            key={s.id}
                            href={`/projects?sdgId=${s.id}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: s.colorToken }}
                            title={s.name}
                          >
                            {s.number}
                          </Link>
                        )
                    )}
                  </div>
                )}
                {(ministry || secondaryMinistries.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs mr-1" style={{ color: "var(--color-text-muted)" }}>
                      {secondaryMinistries.length > 0 ? "Beneficiary ministries:" : "Beneficiary ministry:"}
                    </span>
                    {ministry && (
                      <Link href={`/projects?ministryId=${ministry.id}`} className="status-badge status-badge-active hover:opacity-80">
                        {ministry.shortName} <span className="opacity-70">(Primary)</span>
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
                      <BookOpen className="h-3.5 w-3.5" /> National Alignment
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
                  Illustrative alignment mapping — pending official ZIDA/ministry validation.
                </p>
              </div>
            </ExecutiveCard>

            {/* Documents & Data Room — public, informational; per-row badges signal file-level gating once real files exist */}
            <ExecutiveCard>
              <ExecutiveCard.Header overline="Data Room" title="Documents & Data Room" />
              {project.documents.length > 0 ? (
                <div className="space-y-2 mb-5">
                  {project.documents.map((doc) => (
                    <div
                      key={doc}
                      className="flex items-center gap-2.5 text-sm p-2.5 rounded"
                      style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                    >
                      <FileText className="h-4 w-4 shrink-0" style={{ color: "var(--color-gold)" }} />
                      <span className="flex-1" style={{ color: "var(--color-text-secondary)" }}>{doc}</span>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
                        style={{
                          backgroundColor: "rgba(255,211,0,0.12)",
                          color: "var(--color-gold)",
                          border: "1px solid rgba(255,211,0,0.3)",
                        }}
                      >
                        Qualified Access
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
                  Data room is being prepared — request early access below.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/strategic-partnerships?projectId=${project.id}&ask=document_request`}
                  className="btn-sovereign-ghost text-xs px-4 py-2"
                >
                  Request document access
                </Link>
                <Link
                  href={`/strategic-partnerships?projectId=${project.id}&ask=investment_interest`}
                  className="btn-sovereign-ghost text-xs px-4 py-2"
                >
                  Submit investment interest
                </Link>
                <Link
                  href={`/strategic-partnerships?projectId=${project.id}&ask=meeting_request`}
                  className="btn-sovereign text-xs px-4 py-2"
                >
                  <Calendar className="h-3.5 w-3.5" /> Request meeting
                </Link>
              </div>
            </ExecutiveCard>

            {/* Related Opportunities */}
            {relatedProjects.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="section-overline m-0">Related Opportunities</p>
                  {sector && (
                    <Link href={`/sectors/${sector.slug}`} className="text-xs hover:underline" style={{ color: "var(--color-gold)" }}>
                      More in {getSectorDisplayName(sector)} →
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
                  Total Project Cost
                </p>
                {!capitalRange ? (
                  <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                    Cost estimate pending
                  </p>
                ) : isQualified ? (
                  <>
                    <p className="text-2xl font-mono text-white">{capitalRange}</p>
                    <p className="text-[10px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                      Indicative only — pending official ZIDA appraisal.
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
                      Approved investors only —{" "}
                      <Link
                        href={isRegistered ? "/strategic-partnerships" : "/register"}
                        className="hover:underline"
                        style={{ color: "var(--color-gold)" }}
                      >
                        {isRegistered ? "Request qualified access" : "Register to get started"}
                      </Link>
                    </p>
                  </>
                )}
              </div>
            )}

            <ExecutiveCard>
              <ExecutiveCard.Header overline="Geography" title="Location" />
              <dl className="space-y-2 text-sm">
                {project.province && <LocRow label="Province" value={project.province} />}
                {project.district && <LocRow label="District" value={project.district} />}
                <LocRow label="Site" value={project.location} />
              </dl>
            </ExecutiveCard>

            <div
              className="rounded-lg border p-5"
              style={{ borderColor: "var(--color-gold)", backgroundColor: "rgba(255,211,0,0.06)" }}
            >
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

            <ExecutiveCard>
              <ExecutiveCard.Header overline="Reference" title="Glossary of Terms" />
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
                message={
                  isRegistered
                    ? "Your registration is on file — full financial figures (IRR, NPV, ROI) and project costs unlock once our team verifies your investor status."
                    : "Register, then request investor verification to view full financial performance figures (IRR, NPV, ROI) and project costs."
                }
                ctaLabel={isRegistered ? "Request qualified access" : "Register to unlock"}
                ctaHref={isRegistered ? "/strategic-partnerships" : "/register"}
              />
            )}
          </aside>
        </div>
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
  className,
}: {
  label: string;
  value?: string;
  locked?: boolean;
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
        <dd className="text-sm font-medium text-white">{value || "Not disclosed"}</dd>
      )}
    </div>
  );
}

function formatMonthYear(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
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
function UnlockNotice({ leadText, isRegistered }: { leadText: string; isRegistered: boolean }) {
  if (isRegistered) {
    return (
      <p className="mt-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
        {leadText} unlock once our team verifies your investor status — your registration is on file.{" "}
        <Link href="/strategic-partnerships" className="hover:underline" style={{ color: "var(--color-gold)" }}>
          Request qualified access
        </Link>
      </p>
    );
  }
  return (
    <p className="mt-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
      {leadText} visible to approved investors.{" "}
      <Link href="/register" className="hover:underline" style={{ color: "var(--color-gold)" }}>
        Register, then request investor verification
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
