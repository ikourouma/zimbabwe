import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLogs, investorEngagements, projectMessages, projectWatchlist, projects } from "@/lib/db/schema";
import { fetchUserRoleCounts } from "@/lib/db/queries/users";
import { getSectorById, getSectorDisplayName } from "@/lib/data/taxonomies";
import type { MyAnalyticsSnapshot, PlatformStats } from "@/lib/types";

/**
 * Safe, no-PII aggregate marketplace stats (Investor Dashboard Expansion plan, Phase 3) — modeled
 * on `fetchUserRoleCounts`'s "aggregate counts only" pattern so it's safe to expose to any
 * authenticated role, not just staff. Powers the Investor Dashboard Overview's platform panel.
 *
 * Project Data Standardisation, Phase 2 — the capital total is a SQL `SUM` over the structured
 * `capital_total_usd` column (populated by scripts/migrate-financial-fields.ts), not a JavaScript
 * loop re-parsing the free-text `capitalRequired` field on every request.
 */
export async function fetchPlatformStats(): Promise<PlatformStats> {
  const bySector = await db
    .select({
      sectorId: projects.sectorId,
      count: sql<number>`count(*)::int`,
      capitalUsd: sql<string>`coalesce(sum(${projects.capitalTotalUsd}), 0)`,
    })
    .from(projects)
    .where(eq(projects.projectStatus, "published"))
    .groupBy(projects.sectorId);

  let publishedProjectCount = 0;
  let totalCapitalUsd = 0;
  const projectsBySector = bySector
    .map((row) => {
      publishedProjectCount += row.count;
      totalCapitalUsd += parseFloat(row.capitalUsd);
      return {
        sectorId: row.sectorId,
        sectorName: getSectorDisplayName(getSectorById(row.sectorId)) ?? row.sectorId,
        count: row.count,
      };
    })
    .sort((a, b) => b.count - a.count);

  const { counts } = await fetchUserRoleCounts();

  return {
    publishedProjectCount,
    totalCapitalRepresentedMillions: Math.round(totalCapitalUsd / 1_000_000),
    projectsBySector,
    qualifiedInvestorCount: counts.qualified ?? 0,
  };
}

/** Accurate (uncapped) personal counters for the Investor Dashboard's "My Analytics" snapshot
 *  card — deliberately separate from `/api/me/activity`, which is capped to the 25 most recent
 *  audit rows and would under-count a long-tenured investor's totals. */
export async function fetchMyAnalytics(userId: string): Promise<MyAnalyticsSnapshot> {
  const [savedProjectsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectWatchlist)
    .where(eq(projectWatchlist.userId, userId));
  const [engagementsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(investorEngagements)
    .where(eq(investorEngagements.userId, userId));
  const [messagesRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectMessages)
    .where(eq(projectMessages.authorUserId, userId));
  const [downloadedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(and(eq(auditLogs.actorUserId, userId), eq(auditLogs.action, "document.downloaded")));
  const [previewedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(and(eq(auditLogs.actorUserId, userId), eq(auditLogs.action, "document.previewed")));

  return {
    savedProjects: savedProjectsRow?.count ?? 0,
    engagements: engagementsRow?.count ?? 0,
    documentsDownloaded: downloadedRow?.count ?? 0,
    documentsPreviewed: previewedRow?.count ?? 0,
    messagesSent: messagesRow?.count ?? 0,
  };
}
