import { NextResponse } from "next/server";
import { and, asc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { filterOwnedAttachments } from "@/lib/api/security-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { projectMessages, messageAttachments, investorEngagements } from "@/lib/db/schema";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { mapDbMessageToApp } from "@/lib/db/mappers/message";
import { fetchDealTeamMember, fetchInvestorsEngagedOnProject } from "@/lib/db/queries/users";
import { logAuditEvent } from "@/lib/db/queries/audit";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import type { AccountRole } from "@/lib/auth/types";
import type { MessageVisibility } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

// ZIDA/Admin/Government own the Communication Hub end-to-end and can see every thread on a
// project (incl. "internal" notes); a qualified investor only ever sees threads tied to their own
// engagement plus messages they authored themselves (e.g. a pre-engagement "ask ZIDA a question")
// — the same confidentiality posture as GET /api/engagements.
const STAFF_ROLES: AccountRole[] = ["admin", "super_admin", "government"];

interface AttachmentInput {
  storageKey?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
}

/**
 * GET /api/projects/[id]/messages[?engagementId=] — the Communication Hub thread(s) for a
 * project. No `engagementId` returns everything the caller can see (general + every engagement
 * thread merged — what the Project Detail Drawer's Messages tab wants); `engagementId=none`
 * scopes to only the general (no-engagement) thread; any other value scopes to that one
 * engagement's thread (e.g. an MOU comment thread). See lib/db/schema/messages.ts for the
 * visibility model.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // ministry_admin read-only oversight (Subject Dropdown + Ministry Engagements plan, Part B) —
    // full-thread visibility (including internal notes) scoped to their own ministry's projects
    // only; enforced here rather than trusting the UI, since this route is reachable directly.
    if (actor.role === "ministry_admin") {
      if (!actor.ministryId || !projectMatchesMinistry(project, actor.ministryId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const engagementIdFilter = new URL(request.url).searchParams.get("engagementId");
    // ministry_admin sees the full thread like staff does (never posts — see POST below, which
    // deliberately keeps its own narrower role list and doesn't grant this).
    const canSeeEverything = STAFF_ROLES.includes(actor.role) || actor.role === "ministry_admin";
    // The investor who originated this project via Propose a Project sees the *entire*
    // non-engagement (general) thread on it — including staff replies to their own Action Cards
    // like an amendment request, which otherwise wouldn't match the authorUserId-only filter
    // below (there's no engagementId to key off for a project, unlike investor_engagements
    // correction/delete_request threads). Internal staff-only notes stay excluded either way.
    // Reconcile plan + Phase 3, item B6: a co-editor teammate (teamAssignedUserIds) gets the same
    // general-thread visibility as the proposal's own creator — they have equal edit authority on
    // the project itself (see resolveProjectWorkflowRole), so a 403 here would be an inconsistent
    // gap, not an intentional restriction.
    const isProposalOwner =
      !canSeeEverything &&
      project.investorSubmitted &&
      (project.createdBy === actor.userId || (project.teamAssignedUserIds?.includes(actor.userId) ?? false));

    const conditions = [eq(projectMessages.projectId, project.id)];

    if (!canSeeEverything) {
      // Delegate carve-out (B6): an engagement's assigned Delegate has the same authority as its
      // owner (see the engagement PATCH/MOU routes), so their own thread must be visible too.
      const own = await db
        .select({ id: investorEngagements.id })
        .from(investorEngagements)
        .where(
          and(
            eq(investorEngagements.projectId, project.id),
            or(eq(investorEngagements.userId, actor.userId), eq(investorEngagements.assignedUserId, actor.userId))
          )
        );
      const ownEngagementIds = own.map((e) => e.id);

      const visibilityClauses = [eq(projectMessages.authorUserId, actor.userId)];
      if (ownEngagementIds.length > 0) visibilityClauses.push(inArray(projectMessages.engagementId, ownEngagementIds));
      if (isProposalOwner) visibilityClauses.push(and(isNull(projectMessages.engagementId), ne(projectMessages.visibility, "internal"))!);

      conditions.push(or(...visibilityClauses)!);
    }

    if (engagementIdFilter === "none") {
      conditions.push(isNull(projectMessages.engagementId));
    } else if (engagementIdFilter) {
      conditions.push(eq(projectMessages.engagementId, engagementIdFilter));
    }

    const rows = await db
      .select()
      .from(projectMessages)
      .where(and(...conditions))
      .orderBy(asc(projectMessages.createdAt));

    // Batch-load attachments for the returned messages so each thread renders its file chips in one
    // round-trip (no N+1).
    const messageIds = rows.map((r) => r.id);
    const attachmentRows = messageIds.length
      ? await db.select().from(messageAttachments).where(inArray(messageAttachments.messageId, messageIds))
      : [];
    const byMessage = new Map<string, typeof attachmentRows>();
    for (const a of attachmentRows) {
      const list = byMessage.get(a.messageId) ?? [];
      list.push(a);
      byMessage.set(a.messageId, list);
    }

    return NextResponse.json(rows.map((r) => mapDbMessageToApp(r, byMessage.get(r.id))));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/projects/[id]/messages — post a reply/question into a project's Communication Hub. */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const actor = await requireRole(["admin", "super_admin", "government", "qualified", "ministry_admin"]);
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // ministry_admin read+reply (Ministry Desk management dashboard plan, Part 3) — same ministry-
    // match guard the GET handler applies, so they can only post into their own ministry's threads.
    if (actor.role === "ministry_admin") {
      if (!actor.ministryId || !projectMatchesMinistry(project, actor.ministryId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = (await request.json()) as {
      body?: string;
      subject?: string;
      engagementId?: string;
      visibility?: MessageVisibility;
      parentMessageId?: string;
      recipientUserId?: string;
      attachments?: AttachmentInput[];
    };
    const hasAttachments = Array.isArray(body.attachments) && body.attachments.length > 0;
    if ((!body.body || !body.body.trim()) && !hasAttachments) {
      return NextResponse.json({ error: "Message body or an attachment is required" }, { status: 400 });
    }

    // ministry_admin gets "internal" visibility + the same ownership-check bypasses STAFF_ROLES
    // gets below, scoped to their own ministry's project by the guard above.
    const isStaff = STAFF_ROLES.includes(actor.role) || actor.role === "ministry_admin";

    if (body.engagementId) {
      const [engagement] = await db
        .select()
        .from(investorEngagements)
        .where(eq(investorEngagements.id, body.engagementId))
        .limit(1);
      if (!engagement || engagement.projectId !== project.id) {
        return NextResponse.json({ error: "Engagement not found for this project" }, { status: 400 });
      }
      // A qualified investor may only post into their own engagement's thread (or one they're the
      // validated Delegate on, B6) — never someone else's, even if they somehow learn the
      // engagementId.
      if (!isStaff && engagement.userId !== actor.userId && engagement.assignedUserId !== actor.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Threaded reply: the parent must exist, belong to this project, and share the same engagement
    // scope (a reply can't jump threads). Investors are additionally bounded by the same
    // visibility rules the GET applies, so they can't reply to a message they couldn't see.
    if (body.parentMessageId) {
      const [parent] = await db
        .select()
        .from(projectMessages)
        .where(eq(projectMessages.id, body.parentMessageId))
        .limit(1);
      if (!parent || parent.projectId !== project.id) {
        return NextResponse.json({ error: "Parent message not found for this project" }, { status: 400 });
      }
      if ((parent.engagementId ?? null) !== (body.engagementId ?? null)) {
        return NextResponse.json({ error: "Reply must stay in the same thread" }, { status: 400 });
      }
      if (!isStaff) {
        const authoredByActor = parent.authorUserId === actor.userId;
        // B6: recognizes the engagement's validated Delegate (assignedUserId) as equally
        // authorized to reply here, not just its owner (userId).
        const ownsEngagement =
          parent.engagementId != null &&
          (
            await db
              .select({ id: investorEngagements.id })
              .from(investorEngagements)
              .where(
                and(
                  eq(investorEngagements.id, parent.engagementId),
                  or(eq(investorEngagements.userId, actor.userId), eq(investorEngagements.assignedUserId, actor.userId))
                )
              )
              .limit(1)
          ).length > 0;
        // Mirrors the GET handler's isProposalOwner visibility exactly — a co-editor only gets
        // this on the general (no-engagement), non-internal thread, never on someone else's
        // engagement thread just by virtue of being a teammate on the project.
        const isCoEditorOnGeneralThread =
          parent.engagementId == null &&
          parent.visibility !== "internal" &&
          project.investorSubmitted &&
          (project.teamAssignedUserIds?.includes(actor.userId) ?? false);
        if (!authoredByActor && !ownsEngagement && !isCoEditorOnGeneralThread) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    // Optional recipient routing, and denormalize their display name for the chip. A ZIDA case
    // manager (or, for a ministry_admin, one of their own ministry's government officials — both
    // resolve via fetchDealTeamMember since it matches on role, not ministryId) is the default
    // path. Ministry Message Recipient Targeting plan: a ministry_admin can additionally target a
    // specific investor engaged on this project — validated against a fresh query, never trusted
    // from the client — rounding out the three recipient groups (government/staff/investor).
    let recipientUserId: string | null = null;
    let recipientName: string | null = null;
    if (body.recipientUserId) {
      const member = await fetchDealTeamMember(body.recipientUserId);
      if (member) {
        recipientUserId = member.userId;
        recipientName = member.name;
      } else if (actor.role === "ministry_admin") {
        const engagedInvestors = await fetchInvestorsEngagedOnProject(project.id);
        const investor = engagedInvestors.find((i) => i.userId === body.recipientUserId);
        if (!investor) {
          return NextResponse.json(
            { error: "Recipient must be an active team member or an investor engaged on this project" },
            { status: 400 }
          );
        }
        recipientUserId = investor.userId;
        recipientName = investor.name;
      } else {
        return NextResponse.json({ error: "Recipient is not an active team member" }, { status: 400 });
      }
    }

    // Investors can never mark a message "internal" — that visibility is ZIDA/Admin/Government-only
    // (replaces the old idea of a separate hardcoded "ZIDA note" field with one visibility-gated system).
    const allowedVisibilities: MessageVisibility[] = isStaff
      ? ["internal", "investor_visible", "mou"]
      : ["investor_visible", "mou"];
    const visibility: MessageVisibility =
      body.visibility && allowedVisibilities.includes(body.visibility) ? body.visibility : "investor_visible";

    const [inserted] = await db
      .insert(projectMessages)
      .values({
        projectId: project.id,
        engagementId: body.engagementId ?? null,
        parentMessageId: body.parentMessageId ?? null,
        authorUserId: actor.userId,
        authorName: actor.name,
        authorRole: actor.role,
        visibility,
        recipientUserId,
        recipientName,
        subject: body.subject?.trim() || null,
        body: (body.body ?? "").trim(),
      })
      .returning();

    // Persist any pre-uploaded attachments (client uploads to R2 first, then references them here).
    let attachmentRows: (typeof messageAttachments.$inferSelect)[] = [];
    if (hasAttachments) {
      const valid = filterOwnedAttachments(
        body.attachments!.filter(
          (a) => a.storageKey && a.fileName && a.contentType && typeof a.size === "number"
        ),
        actor.userId,
        { kind: "project", projectId: project.id }
      );
      if (valid.length > 0) {
        attachmentRows = await db
          .insert(messageAttachments)
          .values(
            valid.map((a) => ({
              messageId: inserted.id,
              fileName: a.fileName!,
              storageKey: a.storageKey!,
              contentType: a.contentType!,
              size: a.size!,
              uploadedBy: actor.userId,
            }))
          )
          .returning();
      }
    }

    await logAuditEvent({
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "message.created",
      entityType: "project_message",
      entityId: inserted.id,
      metadata: {
        projectId: project.id,
        engagementId: inserted.engagementId,
        visibility,
        ...(recipientUserId ? { recipientUserId, recipientName } : {}),
        ...(inserted.parentMessageId ? { parentMessageId: inserted.parentMessageId } : {}),
        ...(attachmentRows.length ? { attachmentCount: attachmentRows.length } : {}),
      },
    });

    return NextResponse.json(mapDbMessageToApp(inserted, attachmentRows), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
