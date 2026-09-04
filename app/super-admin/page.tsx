"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Inbox, Layers, PenLine, ShieldCheck } from "lucide-react";
import { useProjectStore } from "@/context/project-store-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useLeadCapture } from "@/context/lead-capture-context";
import { useAuth } from "@/context/auth-context";
import { useAuditLogs } from "@/lib/hooks/use-audit-logs";
import { AccessGate } from "@/components/dashboard/access-gate";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { getInReviewCount } from "@/lib/governance/project-workflow";
import { SITE_URL } from "@/lib/config/site";

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Platform Admin", item: `${SITE_URL}/super-admin` },
  ],
};

const PIE_COLORS = ["#4ade80", "var(--color-zim-accent)", "#facc15", "#f87171", "#a3a3a3"];

export default function SuperAdminOverviewPage() {
  const { projects, isLoading: projectsLoading } = useProjectStore();
  const { sectors, isLoading: taxonomiesLoading } = useTaxonomyStore();
  const { inquiries, isLoading: inquiriesLoading } = useLeadCapture();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const { entries: auditEntries, isLoading: auditLoading } = useAuditLogs();

  const sectorCounts = useMemo(
    () =>
      sectors
        .map((s) => ({ name: s.shortName ?? s.name, count: projects.filter((p) => p.sectorId === s.id).length }))
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    [sectors, projects]
  );

  const inquiryStatusCounts = useMemo(() => {
    const counts = inquiries.reduce<Record<string, number>>((acc, i) => {
      const status = i.status ?? "pending";
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [inquiries]);

  const isLoading = projectsLoading || taxonomiesLoading || inquiriesLoading;

  if (!authLoading && !isSuperAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Sign in with a super admin account to view platform-wide analytics and controls."
      />
    );
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Platform Analytics</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Afronovation super admin view across projects, inquiries, and taxonomies.
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
              icon={BarChart3}
              accent="green"
              href="/super-admin/projects?status=all"
            />
            <StatCard
              label="Published"
              value={projects.filter((p) => p.projectStatus === "published").length}
              icon={Layers}
              accent="gold"
              trend={{ text: "Live deals", tone: "positive" }}
              href="/super-admin/projects?status=published"
            />
            <StatCard
              label="In Review"
              value={getInReviewCount(projects)}
              icon={ShieldCheck}
              accent="green"
              trend={getInReviewCount(projects) > 0 ? { text: "Needs action", tone: "warning" } : undefined}
              href="/super-admin/projects?status=in_review"
            />
            <StatCard
              label="Draft Projects"
              value={projects.filter((p) => p.projectStatus === "draft").length}
              icon={PenLine}
              accent="muted"
              trend={{ text: "Not yet submitted", tone: "neutral" }}
              href="/super-admin/projects?status=draft"
            />
            <StatCard
              label="Lead Inquiries"
              value={inquiries.length}
              icon={Inbox}
              accent="muted"
              href="/admin/inquiries?status=pending"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <div className="dashboard-panel p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-4">Projects by Sector</h2>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={sectorCounts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "#0a140a", border: "1px solid var(--color-sovereign-border)" }}
                  labelStyle={{ color: "#fff" }}
                  cursor={{ fill: "rgba(255,255,255,0.06)" }}
                />
                <Bar dataKey="count" fill="var(--color-zim-accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-panel p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Inquiries by Status</h2>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={inquiryStatusCounts} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {inquiryStatusCounts.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "#0a140a", border: "1px solid var(--color-sovereign-border)" }}
                  labelStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1">
            {inquiryStatusCounts.map((entry, i) => (
              <li key={entry.name} className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                {entry.name} ({entry.value})
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="dashboard-panel p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Recent Governance Activity</h2>
        <ActivityFeed entries={auditEntries} isLoading={auditLoading} limit={8} />
      </div>
    </div>
  );
}
