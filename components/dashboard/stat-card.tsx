import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** A small comparison/status tag shown beside the value (e.g. "+3 this month" or "Needs action").
 *  `tone` drives color: positive=green, warning=amber, neutral=muted. */
export interface StatTrend {
  text: string;
  tone?: "positive" | "warning" | "neutral";
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  trend?: StatTrend;
  accent?: "green" | "gold" | "muted";
  className?: string;
  /** When set, the whole card becomes a Link — e.g. Deal Room Overview KPI cards drilling into a
   *  pre-filtered Pipeline/Engagements view, or the Super Admin analytics cards routing into the
   *  status-filtered project registry / inquiries. */
  href?: string;
  /** When true, renders an accent ring showing this card is the scope driving the current view. */
  active?: boolean;
}

const ACCENT_BG: Record<NonNullable<StatCardProps["accent"]>, string> = {
  green: "rgba(0, 100, 0, 0.16)",
  gold: "rgba(255, 211, 0, 0.14)",
  muted: "rgba(255, 255, 255, 0.06)",
};

const ACCENT_ICON: Record<NonNullable<StatCardProps["accent"]>, string> = {
  green: "#4ade80",
  gold: "var(--color-gold)",
  muted: "var(--color-text-secondary)",
};

const TREND_STYLES: Record<NonNullable<StatTrend["tone"]>, string> = {
  positive: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  neutral: "bg-white/5 text-[var(--color-text-secondary)] border-white/10",
};

export function StatCard({ label, value, icon: Icon, delta, trend, accent = "green", className, href, active = false }: StatCardProps) {
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide font-medium" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </p>
        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
          <p className="text-2xl font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>
            {value}
          </p>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium",
                TREND_STYLES[trend.tone ?? "neutral"]
              )}
            >
              {trend.text}
            </span>
          )}
        </div>
        {delta && (
          <p
            className="mt-1.5 text-xs font-medium inline-flex items-center gap-1"
            style={{ color: delta.direction === "down" ? "#f87171" : "#4ade80" }}
          >
            {delta.direction === "up" && <TrendingUp className="h-3 w-3" />}
            {delta.direction === "down" && <TrendingDown className="h-3 w-3" />}
            {delta.value}
          </p>
        )}
      </div>
      {Icon && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: ACCENT_BG[accent] }}
          >
            <Icon className="h-5 w-5" style={{ color: ACCENT_ICON[accent] }} />
          </div>
          {href && (
            <ArrowUpRight
              className="h-4 w-4 opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
              style={{ color: "var(--color-text-secondary)" }}
            />
          )}
        </div>
      )}
    </>
  );

  const sharedClassName = cn(
    "dashboard-panel p-5 flex items-start justify-between gap-4",
    href && "group transition-colors hover:border-[var(--color-gold)]/50 hover:bg-white/[0.04] cursor-pointer",
    active && "ring-2 ring-[var(--color-gold)]/40 border-[var(--color-gold)]/60",
    className
  );

  if (href) {
    return (
      <Link href={href} className={sharedClassName}>
        {content}
      </Link>
    );
  }

  return <div className={sharedClassName}>{content}</div>;
}

export function StatCardSkeleton() {
  return (
    <div className="dashboard-panel p-5">
      <div className="dashboard-skeleton h-3 w-24 mb-3" />
      <div className="dashboard-skeleton h-7 w-16" />
    </div>
  );
}
