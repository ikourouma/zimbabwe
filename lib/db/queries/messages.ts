import { desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { investorEngagements, projectMessages, projects } from "@/lib/db/schema";
import type { AccountRole } from "@/lib/auth/types";
import type { ProjectMessageWithProject } from "@/lib/types";

// Mirrors the STAFF_ROLES split in app/api/projects/[id]/messages/route.ts and
// app/api/engagements/route.ts — ZIDA/Admin/Government see every thread; a qualified investor
// only ever sees their own.
const STAFF_ROLES: AccountRole[] = ["admin", "super_admin", "government"];

const SELECT_SHAPE = {
  id: projectMessages.id,
  projectId: projectMessages.projectId,
  engagementId: projectMessages.engagementId,
  scope: projectMessages.scope,
  threadOwnerUserId: projectMessages.threadOwnerUserId,
  parentMessageId: projectMessages.parentMessageId,
  authorUserId: projectMessages.authorUserId,
  authorName: projectMessages.authorName,
  authorRole: projectMessages.authorRole,
  visibility: projectMessages.visibility,
  recipientUserId: projectMessages.recipientUserId,
  recipientName: projectMessages.recipientName,
  kind: projectMessages.kind,
  payload: projectMessages.payload,
  body: projectMessages.body,
  createdAt: projectMessages.createdAt,
  projectTitle: projects.title,
  projectSlug: projects.slug,
};

/**
 * Every Communication Hub message the actor is allowed to see, across every project — powers
 * app/deal-room/communication/page.tsx (and its Admin/Super Admin console mirrors). Unlike the
 * per-project GET /api/projects/[id]/messages, this fans out across the whole portfolio so a
 * ZIDA reviewer (or an investor with engagements on several projects) has one inbox.
 */
export async function fetchMessagesForActor(actor: {
  userId: string;
  role: AccountRole;
}): Promise<ProjectMessageWithProject[]> {
  const isStaff = STAFF_ROLES.includes(actor.role);

  // leftJoin (not inner) so project-less concierge rows (projectId IS NULL) survive the join.
  const rows = isStaff
    ? await db
        .select(SELECT_SHAPE)
        .from(projectMessages)
        .leftJoin(projects, eq(projectMessages.projectId, projects.id))
        .orderBy(desc(projectMessages.createdAt))
    : await db
        .select(SELECT_SHAPE)
        .from(projectMessages)
        .leftJoin(projects, eq(projectMessages.projectId, projects.id))
        .leftJoin(investorEngagements, eq(projectMessages.engagementId, investorEngagements.id))
        .where(
          or(
            eq(investorEngagements.userId, actor.userId),
            eq(projectMessages.authorUserId, actor.userId),
            // Own concierge thread (registered/qualified user's general channel with ZIDA).
            eq(projectMessages.threadOwnerUserId, actor.userId)
          )
        )
        .orderBy(desc(projectMessages.createdAt));

  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId ?? "",
    engagementId: row.engagementId ?? undefined,
    scope: row.scope,
    threadOwnerUserId: row.threadOwnerUserId ?? undefined,
    parentMessageId: row.parentMessageId ?? undefined,
    authorUserId: row.authorUserId,
    authorName: row.authorName,
    authorRole: row.authorRole,
    visibility: row.visibility,
    recipientUserId: row.recipientUserId ?? undefined,
    recipientName: row.recipientName ?? undefined,
    kind: row.kind,
    payload: row.payload ?? undefined,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    projectTitle: row.projectTitle ?? (row.scope === "concierge" ? "General Concierge" : "Project"),
    projectSlug: row.projectSlug ?? "",
  }));
}
