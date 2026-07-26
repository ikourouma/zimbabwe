"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { FolderKanban, Inbox, Layers, PenLine, ShieldCheck } from "lucide-react";
import { useProjectStore } from "@/context/project-store-context";
import { useLeadCapture } from "@/context/lead-capture-context";
import { useAuth } from "@/context/auth-context";
import { useAuditLogs } from "@/lib/hooks/use-audit-logs";
import { AccessGate } from "@/components/dashboard/access-gate";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { getInReviewCount, STATUS_LABELS } from "@/lib/governance/project-workflow";
import type { ProjectStatus } from "@/lib/types";
import { SITE_URL } from "@/lib/config/site";

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Admin", item: `${SITE_URL}/admin` },
  ],
};

const CHART_ORDER: ProjectStatus[] = [
  "draft",
  "submitted_for_review",
  "under_review",
  "changes_requested",
  "approved",
  "published",
  "archived",
];

export default function AdminOverviewPage() {
  const { projects, isLoading: projectsLoading } = useProjectStore();
  const { inquiries, isLoading: inquiriesLoading } = useLeadCapture();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { entries: auditEntries, isLoading: auditLoading } = useAuditLogs();

  const statusCounts = useMemo(() => {
    const counts = projects.reduce<Record<string, number>>((acc, p) => {
      acc[p.projectStatus] = (acc[p.projectStatus] ?? 0) + 1;
      return acc;
    }, {});
    return CHART_ORDER.map((status) => ({ status: STATUS_LABELS[status], count: counts[status] ?? 0 }));
  }, [projects]);

  const pendingInquiries = inquiries.filter((i) => (i.status ?? "pending") === "pending").length;
  const isLoading = projectsLoading || inquiriesLoading;

  if (!authLoading && !isAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use an admin pilot account to view the project registry overview, review queue, and inquiries."
      />
    );
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Admin Overview</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Institutional command center for the project registry, review workflow, and investor inquiries.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        {isLoading || authLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Projects"
              value={projects.length}
              icon={FolderKanban}
              accent="green"
              href="/admin/projects?status=all"
            />
            <StatCard
              label="Published"
              value={projects.filter((p) => p.projectStatus === "published").length}
              icon={Layers}
              accent="gold"
              trend={{ text: "Live deals", tone: "positive" }}
              href="/admin/projects?status=published"
            />
            <StatCard
              label="In Review"
              value={getInReviewCount(projects)}
              icon={ShieldCheck}
              accent="green"
              trend={getInReviewCount(projects) > 0 ? { text: "Needs action", tone: "warning" } : undefined}
              href="/admin/projects?status=in_review"
            />
            <StatCard
              label="Draft Projects"
              value={projects.filter((p) => p.projectStatus === "draft").length}
              icon={PenLine}
              accent="muted"
              trend={{ text: "Not yet submitted", tone: "neutral" }}
              href="/admin/projects?status=draft"
            />
            <StatCard
              label="Pending Inquiries"
              value={pendingInquiries}
              icon={Inbox}
              accent="muted"
              trend={pendingInquiries > 0 ? { text: "Awaiting triage", tone: "warning" } : undefined}
              href="/admin/inquiries?status=pending"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="dashboard-panel p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-4">Projects by Status</h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={statusCounts} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="status"
                  tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "#0a140a", border: "1px solid var(--color-sovereign-border)" }}
                  labelStyle={{ color: "#fff" }}
                  cursor={{ fill: "rgba(255,255,255,0.06)" }}
                />
                <Bar dataKey="count" fill="var(--color-zim-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-panel p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Activity</h2>
          <ActivityFeed entries={auditEntries} isLoading={auditLoading} limit={8} />
        </div>
      </div>
    </div>
  );
}
