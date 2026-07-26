import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { InvestorEngagementStatus, MouStatus, FollowThroughStatus, UserDossierEngagement } from "@/lib/types";

/** This user's own engagements (as the linked investor), joined to the project title and the
 *  engagement's MOU lifecycle status if one exists — powers the Institutional Compliance Dossier
 *  drawer's Portfolio & Activity tab. Excludes soft-deleted rows, same as every other engagement
 *  list in the app. */
export async function fetchEngagementsByUserId(userId: string): Promise<UserDossierEngagement[]> {
  const rows = await db.execute<{
    id: string;
    project_id: string;
    project_title: string | null;
    status: InvestorEngagementStatus;
    ticket_size: string | null;
    mou_status: MouStatus | null;
    follow_through_status: FollowThroughStatus | null;
    created_at: string;
  }>(sql`
    SELECT
      e.id,
      e.project_id,
      p.title AS project_title,
      e.status,
      e.ticket_size,
      m.status AS mou_status,
      e.follow_through_status,
      e.created_at
    FROM investor_engagements e
    LEFT JOIN projects p ON p.id = e.project_id
    LEFT JOIN engagement_mous m ON m.engagement_id = e.id
    WHERE e.user_id = ${userId} AND e.deleted_at IS NULL
    ORDER BY e.created_at DESC
  `);

  return rows.rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectTitle: row.project_title,
    status: row.status,
    ticketSize: row.ticket_size,
    mouStatus: row.mou_status,
    followThroughStatus: row.follow_through_status,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}
