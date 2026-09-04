import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLogs, investorEngagements, projectMessages, projectWatchlist, projects } from "@/lib/db/schema";
import { fetchUserRoleCounts } from "@/lib/db/queries/users";
import { getSectorById, getSectorDisplayName } from "@/lib/data/taxonomies";
import { parseCapitalTotalMillions } from "@/lib/utils/capital";
import type { MyAnalyticsSnapshot, PlatformStats } from "@/lib/types";

/**
 * Safe, no-PII aggregate marketplace stats (Investor Dashboard Expansion plan, Phase 3) — modeled
 * on `fetchUserRoleCounts`'s "aggregate counts only" pattern so it's safe to expose to any
 * authenticated role, not just staff. Powers the Investor Dashboard Overview's platform panel.
 */
export async function fetchPlatformStats(): Promise<PlatformStats> {
  const publishedRows = await db
    .select({ sectorId: projects.sectorId, capitalRequired: projects.capitalRequired })
    .from(projects)
    .where(eq(projects.projectStatus, "published"));

  let totalCapitalRepresentedMillions = 0;
  const sectorCounts = new Map<string, number>();
  for (const row of publishedRows) {
    const millions = row.capitalRequired ? parseCapitalTotalMillions(row.capitalRequired) : null;
    if (millions !== null) totalCapitalRepresentedMillions += millions;
    sectorCounts.set(row.sectorId, (sectorCounts.get(row.sectorId) ?? 0) + 1);
  }

  const projectsBySector = Array.from(sectorCounts.entries())
    .map(([sectorId, count]) => ({
      sectorId,
      sectorName: getSectorDisplayName(getSectorById(sectorId)) ?? sectorId,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const { counts } = await fetchUserRoleCounts();

  return {
    publishedProjectCount: publishedRows.length,
    totalCapitalRepresentedMillions: Math.round(totalCapitalRepresentedMillions),
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
