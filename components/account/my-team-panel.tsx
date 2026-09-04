"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { OrgInvite } from "@/lib/types";

/**
 * Compact "My Team" summary card on My Profile — just a headline count + a link to the full
 * roster/bulk-invite page (Team Ministry Traceability Batch, Phase 4, item 3: the full experience
 * moved to its own dedicated page — /deal-room/teams or /ministry/teams — so this card no longer
 * needs to carry the invite form or roster list itself).
 */
export function MyTeamPanel() {
  const { role } = useAuth();
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const href = role === "ministry_admin" ? "/ministry/teams" : "/deal-room/teams";

  useEffect(() => {
    let active = true;
    fetch("/api/org-team/invites")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) setInvites(data);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeCount = invites.filter((i) => i.status === "active").length;
  const pendingCount = invites.filter((i) => i.status === "pending_validation").length;

  return (
    <Link
      href={href}
      className="dashboard-panel p-5 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(255,211,0,0.12)" }}
        >
          <Users className="h-4.5 w-4.5" style={{ color: "var(--color-gold)" }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">My Team</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {isLoading
              ? "Loading roster…"
              : invites.length === 0
                ? "No team members invited yet"
                : `${activeCount} active${pendingCount > 0 ? `, ${pendingCount} pending review` : ""}`}
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-medium shrink-0 text-white/70 group-hover:text-white transition-colors">
        Manage team <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
