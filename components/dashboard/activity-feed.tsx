import {
  CheckCircle2,
  FileEdit,
  FileSignature,
  Handshake,
  ScrollText,
  Settings,
  ShieldCheck,
  Tags,
  UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AuditLogEntry } from "@/lib/types";

const ACTION_ICON: Record<string, LucideIcon> = {
  "project.created": FileEdit,
  "project.status_changed": FileEdit,
  "inquiry.status_changed": CheckCircle2,
  "inquiry.submitted": FileEdit,
  "engagement.status_changed": Handshake,
  "engagement.created": Handshake,
  "engagement.published": Handshake,
  "engagement.correction_requested": FileEdit,
  "mou.status_changed": FileSignature,
  "mou.approved": FileSignature,
  "mou.draft_updated": FileSignature,
  "user.updated": UserCog,
  "user.role_changed": UserCog,
  "site_settings.updated": Settings,
  "nda.accepted": ShieldCheck,
};

function iconFor(action: string): LucideIcon {
  if (action.startsWith("taxonomy.")) return Tags;
  return ACTION_ICON[action] ?? ScrollText;
}

function describe(entry: AuditLogEntry): string {
  const meta = entry.metadata ?? {};
  switch (entry.action) {
    case "project.created":
      return `created "${String(meta.title ?? "a project").slice(0, 60)}"`;
    case "project.status_changed":
      return `changed "${String(meta.title ?? "a project").slice(0, 60)}" from ${String(meta.from)} to ${String(meta.to)}`;
    case "inquiry.status_changed":
      return `marked inquiry from ${String(meta.applicantEmail ?? "an applicant")} as ${String(meta.status)}${
        meta.roleUpgradedToQualified ? " (role upgraded to qualified)" : ""
      }`;
    case "inquiry.submitted":
      return meta.engagementType === "investor"
        ? `submitted a Qualified Investor application (${String(meta.email ?? "unknown")})`
        : `submitted a new ${String(meta.type ?? "inquiry").replace(/_/g, " ")} (${String(meta.email ?? "unknown")})`;
    case "engagement.status_changed":
      return `moved engagement with ${String(meta.investorName ?? "an investor")} to ${String(meta.to)}`;
    case "engagement.created":
      return `logged a new engagement with ${String(meta.investorName ?? "an investor")}`;
    case "engagement.published":
      return `certified and published their engagement${
        meta.investorName ? ` (${String(meta.investorName)})` : ""
      }`;
    case "engagement.correction_requested":
      return `requested a correction to the engagement with ${String(meta.investorName ?? "an investor")}`;
    case "nda.accepted":
      return `accepted the Deal Room NDA (v${String(meta.version ?? "1.0")})`;
    case "mou.status_changed":
      return `moved the MOU with ${String(meta.investorName ?? "an investor")} to ${String(meta.to).replace(/_/g, " ")}`;
    case "mou.approved":
      return `approved the MOU draft with ${String(meta.investorName ?? "an investor")} (${String(meta.approvedBy)} side)${
        meta.bothApproved ? " — both parties have now approved" : ""
      }`;
    case "mou.draft_updated":
      return `updated the MOU ${String(meta.field ?? "draft")} with ${String(meta.investorName ?? "an investor")}`;
    case "user.updated":
      return `updated ${String(meta.targetEmail ?? "a user")}'s account`;
    case "user.role_changed":
      return `changed ${String(meta.targetEmail ?? "a user")}'s role from ${String(meta.fromRole)} to ${String(
        meta.toRole
      )}${meta.source && meta.source !== "manual" ? ` (via ${String(meta.source)})` : ""}`;
    case "site_settings.updated":
      return "updated site settings";
    default:
      if (entry.action.startsWith("taxonomy.")) return `updated a taxonomy entry (${entry.action.replace("taxonomy.", "")})`;
      return entry.action.replace(/_/g, " ").replace(/\./g, " → ");
  }
}

/** Exported so other feed-like surfaces (e.g. the Communication Hub message thread) render
 *  timestamps identically without duplicating this logic. */
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

interface ActivityFeedProps {
  entries: AuditLogEntry[];
  isLoading?: boolean;
  emptyMessage?: string;
  limit?: number;
}

export function ActivityFeed({ entries, isLoading, emptyMessage = "No recent activity yet.", limit }: ActivityFeedProps) {
  const visible = limit ? entries.slice(0, limit) : entries;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="dashboard-skeleton h-8 w-8 rounded-full shrink-0" />
            <div className="dashboard-skeleton h-3.5 w-full max-w-[280px]" />
          </div>
        ))}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: "var(--color-text-muted)" }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {visible.map((entry) => {
        const Icon = iconFor(entry.action);
        return (
          <li key={entry.id} className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
              style={{ backgroundColor: "rgba(0, 100, 0, 0.16)" }}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: "#4ade80" }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                <span className="font-medium text-white">{entry.actorName ?? "Someone"}</span> {describe(entry)}
              </p>
              {/* Change-request rationale / reviewer notes stamped on a status change (see
               *  app/api/projects/[id]/route.ts) — the multi-round history the project timeline
               *  used to lose by only keeping the single latest snapshot. */}
              {typeof entry.metadata?.notes === "string" && entry.metadata.notes.trim() !== "" && (
                <p
                  className="text-xs mt-1 rounded-md px-2 py-1 italic"
                  style={{ backgroundColor: "rgba(255, 211, 0, 0.08)", color: "#fde047" }}
                >
                  “{entry.metadata.notes as string}”
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }} title={new Date(entry.createdAt).toLocaleString()}>
                {timeAgo(entry.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

