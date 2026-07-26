import type { InvestorEngagementStatus } from "@/lib/types";
import { ENGAGEMENT_STATUS_LABELS } from "@/lib/governance/engagement-workflow";

const STATUS_BADGE_STYLE: Record<InvestorEngagementStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.15)", fg: "#cbd5e1" },
  submitted: { bg: "rgba(255,255,255,0.08)", fg: "#d1d5db" },
  under_review: { bg: "rgba(255,211,0,0.15)", fg: "#fde047" },
  approved: { bg: "rgba(0,100,0,0.2)", fg: "#86efac" },
  rejected: { bg: "rgba(248,113,113,0.15)", fg: "#f87171" },
};

/** Shared engagement-status chip — factored out of app/deal-room/engagements/page.tsx so the
 *  Engagements table and the project drawer's new "Engaged Investors" section render status
 *  identically. */
export function EngagementStatusPill({ status }: { status: InvestorEngagementStatus }) {
  const style = STATUS_BADGE_STYLE[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      {ENGAGEMENT_STATUS_LABELS[status]}
    </span>
  );
}
