import { NextResponse } from "next/server";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { projectMessages, messageAttachments, investorEngagements } from "@/lib/db/schema";
import { fetchProjectByIdOrSlug } from "@/lib/db/queries/projects";
import { mapDbMessageToApp } from "@/lib/db/mappers/message";
import { fetchDealTeamMember } from "@/lib/db/queries/users";
import { logAuditEvent } from "@/lib/db/queries/audit";
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
    const actor = await requireRole(["admin", "super_admin", "government", "qualified"]);
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const engagementIdFilter = new URL(request.url).searchParams.get("engagementId");
    const isStaff = STAFF_ROLES.includes(actor.role);

    const conditions = [eq(projectMessages.projectId, project.id)];

    if (!isStaff) {
      const own = await db
        .select({ id: investorEngagements.id })
        .from(investorEngagements)
        .where(and(eq(investorEngagements.projectId, project.id), eq(investorEngagements.userId, actor.userId)));
      const ownEngagementIds = own.map((e) => e.id);

      conditions.push(
        ownEngagementIds.length > 0
          ? or(inArray(projectMessages.engagementId, ownEngagementIds), eq(projectMessages.authorUserId, actor.userId))!
          : eq(projectMessages.authorUserId, actor.userId)
      );
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
    const actor = await requireRole(["admin", "super_admin", "government", "qualified"]);
    const { id } = await params;
    const project = await fetchProjectByIdOrSlug(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await request.json()) as {
      body?: string;
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

    const isStaff = STAFF_ROLES.includes(actor.role);

    if (body.engagementId) {
      const [engagement] = await db
        .select()
        .from(investorEngagements)
        .where(eq(investorEngagements.id, body.engagementId))
        .limit(1);
      if (!engagement || engagement.projectId !== project.id) {
        return NextResponse.json({ error: "Engagement not found for this project" }, { status: 400 });
      }
      // A qualified investor may only post into their own engagement's thread — never someone
      // else's, even if they somehow learn the engagementId.
      if (!isStaff && engagement.userId !== actor.userId) {
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
        const ownsEngagement =
          parent.engagementId != null &&
          (
            await db
              .select({ id: investorEngagements.id })
              .from(investorEngagements)
              .where(and(eq(investorEngagements.id, parent.engagementId), eq(investorEngagements.userId, actor.userId)))
              .limit(1)
          ).length > 0;
        if (!authoredByActor && !ownsEngagement) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    // Optional case-manager routing: resolve + validate the recipient is active ZIDA staff, and
    // denormalize their display name for the chip.
    let recipientUserId: string | null = null;
    let recipientName: string | null = null;
    if (body.recipientUserId) {
      const member = await fetchDealTeamMember(body.recipientUserId);
      if (!member) {
        return NextResponse.json({ error: "Recipient is not an active team member" }, { status: 400 });
      }
      recipientUserId = member.userId;
      recipientName = member.name;
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
        body: (body.body ?? "").trim(),
      })
      .returning();

    // Persist any pre-uploaded attachments (client uploads to R2 first, then references them here).
    let attachmentRows: (typeof messageAttachments.$inferSelect)[] = [];
    if (hasAttachments) {
      const valid = body.attachments!.filter(
        (a) => a.storageKey && a.fileName && a.contentType && typeof a.size === "number"
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
