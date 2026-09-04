import { desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { investorEngagements, projectMessages, projects } from "@/lib/db/schema";
import type { AccountRole } from "@/lib/auth/types";
import type {
  MessageActionPayload,
  MessageKind,
  MessageScope,
  MessageVisibility,
  ProjectMessageWithProject,
} from "@/lib/types";
import { fetchAllProjects } from "@/lib/db/queries/projects";
import { fetchGovernmentOfficialsForMinistry } from "@/lib/db/queries/users";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import { isAmendmentRequestPending } from "@/lib/governance/amendable-fields";

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
  ministryId?: string | null;
}): Promise<ProjectMessageWithProject[]> {
  const isStaff = STAFF_ROLES.includes(actor.role);

  // ministry_admin (Ministry Desk management dashboard plan, Part 3) — one inbox across every
  // project-linked thread on their own ministry's projects, read + reply. Full Persona
  // Communication Parity plan extends this with the *same narrow concierge carve-out* as
  // app/api/concierge/messages/route.ts: their own escalation thread to ZIDA, plus their own
  // ministry's government officials' concierge threads — everything else's concierge rows
  // (other ministries, other investors) stay excluded.
  type MessageRow = {
    id: string;
    projectId: string | null;
    engagementId: string | null;
    scope: MessageScope;
    threadOwnerUserId: string | null;
    parentMessageId: string | null;
    authorUserId: string;
    authorName: string;
    authorRole: AccountRole;
    visibility: MessageVisibility;
    recipientUserId: string | null;
    recipientName: string | null;
    kind: MessageKind;
    payload: MessageActionPayload | null;
    body: string;
    createdAt: Date;
    projectTitle: string | null;
    projectSlug: string | null;
  };
  let rows: MessageRow[];

  if (actor.role === "ministry_admin" && actor.ministryId) {
    const [allProjects, officials] = await Promise.all([
      fetchAllProjects(),
      fetchGovernmentOfficialsForMinistry(actor.ministryId),
    ]);
    const ministryProjectIds = new Set(
      allProjects.filter((p) => projectMatchesMinistry(p, actor.ministryId!)).map((p) => p.id)
    );
    const conciergeOwnerIds = new Set([actor.userId, ...officials.map((o) => o.userId)]);
    const allRows = await db
      .select(SELECT_SHAPE)
      .from(projectMessages)
      .leftJoin(projects, eq(projectMessages.projectId, projects.id))
      .orderBy(desc(projectMessages.createdAt));
    rows = allRows.filter(
      (row) =>
        (row.projectId && ministryProjectIds.has(row.projectId)) ||
        (row.scope === "concierge" && row.threadOwnerUserId && conciergeOwnerIds.has(row.threadOwnerUserId))
    );
  } else if (isStaff) {
    // leftJoin (not inner) so project-less concierge rows (projectId IS NULL) survive the join.
    rows = await db
      .select(SELECT_SHAPE)
      .from(projectMessages)
      .leftJoin(projects, eq(projectMessages.projectId, projects.id))
      .orderBy(desc(projectMessages.createdAt));
  } else {
    rows = await db
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
  }

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

/**
 * Platform-wide, still-open Action Cards of the given type(s), across every project — powers the
 * Unified Review Queue's "Pending Amendment/Override requests" section (Platform Feedback Batch
 * v4, Phase 7), which today only lived buried inside each project's own Communication Hub thread.
 * The query itself is platform-wide; GET /api/review-queue/amendments scopes the result for
 * `ministry_admin` (Phase 8: only their own ministry's still-`"open"` government-filed cards).
 * Admin/super_admin keep the full list.
 */
export async function fetchOpenActionCards(types: MessageActionPayload["type"][]): Promise<ProjectMessageWithProject[]> {
  const rows = await db
    .select(SELECT_SHAPE)
    .from(projectMessages)
    .leftJoin(projects, eq(projectMessages.projectId, projects.id))
    .where(eq(projectMessages.kind, "action"))
    .orderBy(desc(projectMessages.createdAt));

  return rows
    .filter((row) => {
      const payload = row.payload as MessageActionPayload | null;
      // "escalated" (Phase 8) is a government-filed amendment request the requester's own
      // ministry_admin already approved — still pending (ZIDA's final call), so it belongs in
      // this "still open" list exactly like "open" does, not just the single original status.
      return payload && types.includes(payload.type) && isAmendmentRequestPending(payload.status);
    })
    .map((row) => ({
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
      projectTitle: row.projectTitle ?? "Project",
      projectSlug: row.projectSlug ?? "",
    }));
}
