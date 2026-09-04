"use client";

import { Bookmark, Download, Eye, Handshake, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMyAnalytics } from "@/lib/hooks/use-my-analytics";

/** "My Analytics" snapshot — the investor's own accurate activity counters (Investor Dashboard
 *  Expansion plan, Phase 3), reusing the same underlying counters as the Personal Activity
 *  Report's data model but condensed into a glanceable Overview card. */
export function MyAnalyticsCard() {
  const { isAuthenticated } = useAuth();
  const { analytics, isLoading } = useMyAnalytics(isAuthenticated);

  if (isLoading) {
    return (
      <div className="dashboard-panel p-5">
        <h2 className="text-sm font-semibold text-white mb-4">My Analytics</h2>
        <div className="dashboard-skeleton h-24 rounded-md" />
      </div>
    );
  }

  if (!analytics) return null;

  const rows = [
    { label: "Saved Projects", value: analytics.savedProjects, icon: Bookmark },
    { label: "Engagements", value: analytics.engagements, icon: Handshake },
    { label: "Documents Downloaded", value: analytics.documentsDownloaded, icon: Download },
    { label: "Documents Previewed", value: analytics.documentsPreviewed, icon: Eye },
    { label: "Messages Sent", value: analytics.messagesSent, icon: MessageSquare },
  ];

  return (
    <div className="dashboard-panel p-5">
      <h2 className="text-sm font-semibold text-white mb-4">My Analytics</h2>
      <ul className="space-y-2.5">
        {rows.map(({ label, value, icon: Icon }) => (
          <li key={label} className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
              <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
              {label}
            </span>
            <span className="font-semibold text-white">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
