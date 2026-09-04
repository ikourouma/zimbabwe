"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, FileSignature, FolderKanban, Handshake, Landmark, ShieldCheck, UserCog } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useProjectStore } from "@/context/project-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { useAuditLogs } from "@/lib/hooks/use-audit-logs";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";

/**
 * Ministry Desk Overview (Deal Room Feedback Batch v2, Phase 6) — a ministry official's landing
 * page, scoped entirely to their own `ministryId`. Deliberately read-only/summary-only: the
 * detailed, filterable list lives on /ministry/projects (ProjectRegistryView, server-scoped by
 * the same GET /api/projects filter this page's counts are derived from client-side).
 */
export default function MinistryOverviewPage() {
  const { isMinistryAdmin, isLoading: authLoading, ministryId } = useAuth();
  const { projects, isLoading: projectsLoading } = useProjectStore();
  const { ministries, isLoading: taxonomyLoading } = useTaxonomyStore();
  // Ministry-scoped feed (Ministry Desk management dashboard plan, Part 4) — GET /api/audit-logs
  // branches to fetchAuditLogsForMinistry for this role, so this is real, ministry-scoped activity.
  const { entries: auditEntries, isLoading: auditLoading } = useAuditLogs();

  const ministryProjects = useMemo(
    () => (ministryId ? projects.filter((p) => projectMatchesMinistry(p, ministryId)) : []),
    [projects, ministryId]
  );

  const stats = useMemo(() => {
    const published = ministryProjects.filter((p) => p.projectStatus === "published").length;
    const underReview = ministryProjects.filter(
      (p) => p.projectStatus === "submitted_for_review" || p.projectStatus === "under_review"
    ).length;
    const approved = ministryProjects.filter((p) => p.projectStatus === "approved").length;
    return { total: ministryProjects.length, published, underReview, approved };
  }, [ministryProjects]);

  if (!authLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to view your ministry's project pipeline."
      />
    );
  }

  const isLoading = authLoading || projectsLoading || taxonomyLoading;
  const ministry = ministries.find((m) => m.id === ministryId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Ministry Desk</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {ministry ? `${ministry.name} — ` : ""}national investment pipeline scoped to your designated ministry.
        </p>
      </div>

      {!ministryId && !isLoading && (
        <div
          className="mb-6 rounded-lg p-4 flex items-start gap-3"
          style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}
        >
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            No ministry is assigned to your account yet. Contact a Platform/ZIDA Admin to complete your setup.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total Projects" value={stats.total} icon={FolderKanban} accent="green" href="/ministry/projects" />
            <StatCard
              label="Under Review"
              value={stats.underReview}
              icon={ShieldCheck}
              accent="gold"
              href="/ministry/review"
            />
            <StatCard
              label="Approved"
              value={stats.approved}
              icon={Handshake}
              accent="muted"
              href="/ministry/projects?status=approved"
            />
            <StatCard
              label="Published"
              value={stats.published}
              icon={Landmark}
              accent="muted"
              href="/ministry/projects?status=published"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <section className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-3">Manage Your Ministry</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickLinkCard
              href="/ministry/projects"
              icon={FolderKanban}
              title="Ministry Pipeline"
              description="Filter, search, and drill into any project's data room."
            />
            <QuickLinkCard
              href="/ministry/mou"
              icon={FileSignature}
              title="MOU Registry"
              description="Track every memorandum of understanding tied to your ministry."
            />
            <QuickLinkCard
              href="/ministry/engagements"
              icon={Handshake}
              title="Engagements"
              description="Read-only oversight into investor engagements on your projects."
            />
            <QuickLinkCard
              href="/ministry/users"
              icon={UserCog}
              title="Users & Roles"
              description="Create and manage your ministry's own staff accounts."
            />
          </div>
        </section>

        <section className="dashboard-panel p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Activity</h2>
          <ActivityFeed
            entries={auditEntries}
            isLoading={auditLoading}
            limit={8}
            emptyMessage="No recorded activity on your ministry's projects yet."
          />
        </section>
      </div>
    </div>
  );
}

function QuickLinkCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof FolderKanban;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="dashboard-panel p-5 flex flex-col gap-2 transition-colors hover:border-[var(--color-gold)]/50">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5" style={{ color: "var(--color-gold)" }} />
        <ChevronRight className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {description}
      </p>
    </Link>
  );
}
