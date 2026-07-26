/** Shared "submission/event date" horizon filter — used by the Audit Log filter bar
 *  (lib/governance/audit-taxonomy.ts) and the Inquiries filter bar (lib/governance/inquiry-filters.ts)
 *  so both surfaces filter "Today / Last 24 Hours / Last 7 Days / Last 30 Days / Custom Range"
 *  against a real `createdAt` timestamp the exact same way. */
export type TimeHorizon = "all" | "today" | "24h" | "7d" | "30d" | "custom";

export const TIME_HORIZON_LABELS: Record<TimeHorizon, string> = {
  all: "All Time",
  today: "Today",
  "24h": "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  custom: "Custom Range",
};

export function isWithinTimeHorizon(createdAt: string, horizon: TimeHorizon, customFrom?: string, customTo?: string): boolean {
  if (horizon === "all") return true;
  const created = new Date(createdAt).getTime();
  if (horizon === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return created >= start.getTime();
  }
  if (horizon === "24h") return created >= Date.now() - 24 * 60 * 60 * 1000;
  if (horizon === "7d") return created >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (horizon === "30d") return created >= Date.now() - 30 * 24 * 60 * 60 * 1000;
  // custom
  if (customFrom && created < new Date(`${customFrom}T00:00:00`).getTime()) return false;
  if (customTo && created > new Date(`${customTo}T23:59:59`).getTime()) return false;
  return true;
}
