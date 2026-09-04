"use client";

import { Layers, TrendingUp, Users } from "lucide-react";
import { usePlatformStats } from "@/lib/hooks/use-platform-stats";
import { formatMillions } from "@/lib/utils/capital";

/** Safe, no-PII marketplace snapshot on the Investor Dashboard Overview (Investor Dashboard
 *  Expansion plan, Phase 3) — every figure here is already implicitly visible across the public
 *  /projects registry, just rolled up into one panel. */
export function PlatformStatsPanel() {
  const { stats, isLoading } = usePlatformStats();

  if (isLoading) {
    return (
      <div className="dashboard-panel p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Platform Snapshot</h2>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="dashboard-skeleton h-8 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const topSectors = stats.projectsBySector.slice(0, 4);

  return (
    <div className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-4">Platform Snapshot</h2>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
            <Layers className="h-3.5 w-3.5" /> Published
          </div>
          <p className="text-lg font-semibold text-white">{stats.publishedProjectCount}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
            <TrendingUp className="h-3.5 w-3.5" /> Capital
          </div>
          <p className="text-lg font-semibold text-white">
            {stats.totalCapitalRepresentedMillions > 0 ? formatMillions(stats.totalCapitalRepresentedMillions) : "—"}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
            <Users className="h-3.5 w-3.5" /> Investors
          </div>
          <p className="text-lg font-semibold text-white">{stats.qualifiedInvestorCount}</p>
        </div>
      </div>
      {topSectors.length > 0 && (
        <div>
          <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
            Published projects by sector
          </p>
          <ul className="space-y-1.5">
            {topSectors.map((s) => (
              <li key={s.sectorId} className="flex items-center justify-between text-xs">
                <span className="text-white/80 truncate">{s.sectorName}</span>
                <span style={{ color: "var(--color-gold)" }}>{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
