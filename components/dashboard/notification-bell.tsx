"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useAuditLogs } from "@/lib/hooks/use-audit-logs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LAST_SEEN_KEY = "zimbabwe.dashboard.notifications.lastSeen";

function describeShort(action: string, metadata: Record<string, unknown> | undefined | null): string {
  const meta = metadata ?? {};
  switch (action) {
    case "project.status_changed":
      return `Project "${String(meta.title ?? "Untitled").slice(0, 40)}" → ${String(meta.to)}`;
    case "inquiry.status_changed":
      return `Inquiry from ${String(meta.applicantEmail ?? "an applicant")} → ${String(meta.status)}`;
    case "engagement.status_changed":
      return `Engagement with ${String(meta.investorName ?? "an investor")} → ${String(meta.to)}`;
    case "engagement.created":
      return `New engagement logged with ${String(meta.investorName ?? "an investor")}`;
    case "engagement.delete_requested":
      return `${String(meta.investorName ?? "An investor")} requested deletion of an approved engagement — justification required`;
    case "engagement.delete_approved":
      return `Deletion approved for ${String(meta.investorName ?? "an investor")}'s engagement`;
    case "engagement.delete_declined":
      return `Deletion request declined for ${String(meta.investorName ?? "an investor")}'s engagement`;
    case "engagement.delete_briefing_requested":
      return `A briefing was requested before deciding on ${String(meta.investorName ?? "an investor")}'s deletion request`;
    case "user.updated":
      return `${String(meta.targetEmail ?? "A user")}'s account was updated`;
    case "site_settings.updated":
      return "Site settings updated";
    default:
      if (action.startsWith("taxonomy.")) return `Taxonomy updated (${action.replace("taxonomy.", "")})`;
      return action.replace(/_/g, " ").replace(/\./g, " → ");
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** Notification bell backed by the real audit-log feed (super_admin/admin/government scope).
 *  Read-state is tracked client-side via localStorage (per the Phase 5 plan, DB-backed read
 *  tracking is deferred) — opening the dropdown marks everything currently loaded as seen. */
export function NotificationBell() {
  const { role } = useAuth();
  const { entries, isLoading } = useAuditLogs();
  const [lastSeen, setLastSeen] = useState<number>(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(LAST_SEEN_KEY);
    setLastSeen(stored ? Number(stored) : 0);
  }, []);

  const unreadCount = useMemo(
    () => entries.filter((e) => new Date(e.createdAt).getTime() > lastSeen).length,
    [entries, lastSeen]
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      const now = Date.now();
      window.localStorage.setItem(LAST_SEEN_KEY, String(now));
      // Delay the visual clear slightly so the unread dot doesn't vanish before the user sees it.
      setTimeout(() => setLastSeen(now), 600);
    }
  };

  // Qualified investors aren't in-scope for /api/audit-logs at all — render a quiet, inert bell
  // rather than nothing, so the topbar layout stays consistent across roles. ministry_admin now has
  // a real, ministry-scoped feed (Ministry Desk management dashboard plan, Part 4 — GET
  // /api/audit-logs branches to fetchAuditLogsForMinistry for this role), so it's a live bell below.
  if (role === "qualified") {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-4.5 w-4.5" style={{ color: "var(--color-text-secondary)" }} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: "var(--color-zim-accent)" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Recent Activity</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="px-2 py-4 text-center text-xs text-zim-muted">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-zim-muted">No recent activity yet.</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {entries.slice(0, 8).map((entry) => (
              <DropdownMenuItem key={entry.id} className="flex flex-col items-start gap-0.5 whitespace-normal">
                <p className="text-xs leading-snug">
                  <span className="font-medium">{entry.actorName ?? "Someone"}</span>{" "}
                  {describeShort(entry.action, entry.metadata)}
                </p>
                <p className="text-[10px] text-zim-muted">{timeAgo(entry.createdAt)}</p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        {role === "super_admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/super-admin/audit" className="text-xs font-medium">
                View full audit log
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
