"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { FolderKanban, Handshake, Layers, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useProjectStore } from "@/context/project-store-context";
import { useDealRoomStore } from "@/context/deal-room-store-context";
import { useMyActivity } from "@/lib/hooks/use-my-activity";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { GettingStartedCard } from "@/components/deal-room/getting-started-card";
import { PlatformStatsPanel } from "@/components/deal-room/platform-stats-panel";
import { MyAnalyticsCard } from "@/components/deal-room/my-analytics-card";
import { getInReviewCount } from "@/lib/governance/project-workflow";
import { ENGAGEMENT_STATUS_LABELS } from "@/lib/governance/engagement-workflow";
import type { InvestorEngagementStatus } from "@/lib/types";

const FUNNEL_ORDER: InvestorEngagementStatus[] = ["submitted", "under_review", "approved", "rejected"];

export function DealRoomOverview() {
  const { name, isAuthenticated, isQualified, isLoading: authLoading } = useAuth();
  const { projects, isLoading: projectsLoading } = useProjectStore();
  const { engagements, isLoading: engagementsLoading } = useDealRoomStore();
  const { entries: activityEntries, isLoading: activityLoading } = useMyActivity();

  const funnel = useMemo(() => {
    const counts = engagements.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    }, {});
    return FUNNEL_ORDER.map((status) => ({ status: ENGAGEMENT_STATUS_LABELS[status], count: counts[status] ?? 0 }));
  }, [engagements]);

  const publishedCount = projects.filter((p) => p.projectStatus === "published").length;
  const isLoading = projectsLoading || engagementsLoading;

  if (!authLoading && !isAuthenticated) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">
          {isQualified ? "Deal Room Overview" : `Welcome${name ? `, ${name.split(" ")[0]}` : ""}`}
        </h1>
        <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
          {isQualified
            ? "A private workspace for approved investors and government stakeholders to track deals through the governance workflow and log engagement on active projects."
            : "Your investor dashboard — browse published opportunities, save projects to your watchlist, and complete your investment profile to unlock the full Deal Room."}
        </p>
      </div>

      <GettingStartedCard />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {isLoading || authLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : isQualified ? (
          <>
            <StatCard
              label="Projects in Pipeline"
              value={projects.length}
              icon={FolderKanban}
              accent="green"
              href="/deal-room/pipeline"
            />
            <StatCard
              label="Published"
              value={publishedCount}
              icon={Layers}
              accent="gold"
              href="/deal-room/pipeline?status=published"
            />
            <StatCard
              label="In Review"
              value={getInReviewCount(projects)}
              icon={ShieldCheck}
              accent="green"
              href="/deal-room/pipeline?status=in_review"
            />
            <StatCard
              label="Engagements"
              value={engagements.length}
              icon={Handshake}
              accent="muted"
              href="/deal-room/engagements"
            />
          </>
        ) : (
          <StatCard
            label="Published Opportunities"
            value={publishedCount}
            icon={Layers}
            accent="gold"
            href="/deal-room/pipeline"
          />
        )}
      </div>

      {isQualified && (
        <div className="dashboard-panel p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-4">Engagement Funnel</h2>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={funnel} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="status" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "#0a140a", border: "1px solid var(--color-sovereign-border)" }}
                  labelStyle={{ color: "#fff" }}
                  cursor={{ fill: "rgba(255,255,255,0.06)" }}
                />
                <Bar dataKey="count" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <PlatformStatsPanel />
        <MyAnalyticsCard />
        <div className="dashboard-panel p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Activity</h2>
          <ActivityFeed entries={activityEntries} isLoading={activityLoading} limit={8} />
        </div>
      </div>
    </div>
  );
}
