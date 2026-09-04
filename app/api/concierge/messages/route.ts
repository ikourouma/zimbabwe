import { NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { handleRouteError } from "@/lib/api/route-helpers";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { projectMessages, messageAttachments } from "@/lib/db/schema";
import { mapDbMessageToApp } from "@/lib/db/mappers/message";
import { fetchDealTeamMember, fetchGovernmentOfficialsForMinistry, fetchMinistryAdminsForMinistry } from "@/lib/db/queries/users";
import { logAuditEvent } from "@/lib/db/queries/audit";
import type { AccountRole } from "@/lib/auth/types";
import type { MessageVisibility } from "@/lib/types";

// Concierge is the project-less "General" channel. Any authenticated user (incl. plain registered)
// may open one with the ZIDA team — this is the cold-start path before any project/engagement.
// Full Persona Communication Parity plan: `ministry_admin` gets a *narrow* carve-out here — their
// own escalation thread to ZIDA admin/super_admin, plus read+reply into their own ministry's
// government officials' threads. They deliberately stay out of STAFF_ROLES below: that flag drives
// the "see every concierge thread" broad-visibility path, which stays admin/super_admin/government
// only (a ministry_admin is not a platform-wide concierge triager).
const COMM_ROLES: AccountRole[] = ["admin", "super_admin", "government", "qualified", "registered", "ministry_admin"];
const STAFF_ROLES: AccountRole[] = ["admin", "super_admin", "government"];

interface AttachmentInput {
  storageKey?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
}

/**
 * GET /api/concierge/messages[?ownerUserId=] — the project-less General Concierge thread(s).
 * A non-staff user always sees only their own thread; staff see every concierge thread, optionally
 * narrowed to one owner via `ownerUserId`.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireRole(COMM_ROLES);
    const isStaff = STAFF_ROLES.includes(actor.role);
    const ownerParam = new URL(request.url).searchParams.get("ownerUserId");

    const conditions = [eq(projectMessages.scope, "concierge")];
    if (actor.role === "ministry_admin") {
      let targetOwner = actor.userId;
      if (ownerParam && ownerParam !== actor.userId) {
        if (!actor.ministryId) {
          return NextResponse.json({ error: "No ministry assigned" }, { status: 403 });
        }
        const officials = await fetchGovernmentOfficialsForMinistry(actor.ministryId);
        if (!officials.some((o) => o.userId === ownerParam)) {
          return NextResponse.json({ error: "Not authorized to view this thread" }, { status: 403 });
        }
        targetOwner = ownerParam;
      }
      conditions.push(eq(projectMessages.threadOwnerUserId, targetOwner));
    } else if (isStaff) {
      if (ownerParam) conditions.push(eq(projectMessages.threadOwnerUserId, ownerParam));
    } else {
      conditions.push(eq(projectMessages.threadOwnerUserId, actor.userId));
    }

    const rows = await db
      .select()
      .from(projectMessages)
      .where(and(...conditions))
      .orderBy(asc(projectMessages.createdAt));

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

/** POST /api/concierge/messages — post into the General Concierge channel. */
export async function POST(request: Request) {
  try {
    const actor = await requireRole(COMM_ROLES);
    const isStaff = STAFF_ROLES.includes(actor.role);

    const body = (await request.json()) as {
      body?: string;
      subject?: string;
      ownerUserId?: string;
      visibility?: MessageVisibility;
      parentMessageId?: string;
      recipientUserId?: string;
      attachments?: AttachmentInput[];
    };

    const hasAttachments = Array.isArray(body.attachments) && body.attachments.length > 0;
    if ((!body.body || !body.body.trim()) && !hasAttachments) {
      return NextResponse.json({ error: "Message body or an attachment is required" }, { status: 400 });
    }

    // Resolve the thread owner: staff must target an investor's thread; everyone else owns theirs.
    // ministry_admin is a special case — same narrow carve-out as GET above: they may reply into
    // one of their own ministry's government officials' threads (body.ownerUserId), otherwise the
    // message goes into their own escalation thread to ZIDA.
    let threadOwnerUserId: string | undefined;
    if (actor.role === "ministry_admin") {
      if (body.ownerUserId && body.ownerUserId !== actor.userId) {
        if (!actor.ministryId) {
          return NextResponse.json({ error: "No ministry assigned" }, { status: 403 });
        }
        const officials = await fetchGovernmentOfficialsForMinistry(actor.ministryId);
        if (!officials.some((o) => o.userId === body.ownerUserId)) {
          return NextResponse.json({ error: "Not authorized to post in this thread" }, { status: 403 });
        }
        threadOwnerUserId = body.ownerUserId;
      } else {
        threadOwnerUserId = actor.userId;
      }
    } else {
      threadOwnerUserId = isStaff ? body.ownerUserId : actor.userId;
    }
    if (!threadOwnerUserId) {
      return NextResponse.json({ error: "A thread owner is required" }, { status: 400 });
    }

    // Threaded reply must stay within the same concierge thread.
    if (body.parentMessageId) {
      const [parent] = await db
        .select()
        .from(projectMessages)
        .where(eq(projectMessages.id, body.parentMessageId))
        .limit(1);
      if (!parent || parent.scope !== "concierge" || parent.threadOwnerUserId !== threadOwnerUserId) {
        return NextResponse.json({ error: "Reply must stay in the same thread" }, { status: 400 });
      }
    }

    // Optional case-manager routing (investor → named ZIDA staff). Also widened so a `government`
    // caller can target their own ministry's `ministry_admin` desk directly (Full Persona
    // Communication Parity plan, Bug 2).
    let recipientUserId: string | null = null;
    let recipientName: string | null = null;
    if (body.recipientUserId) {
      let member = await fetchDealTeamMember(body.recipientUserId);
      if (!member && actor.role === "government" && actor.ministryId) {
        const ministryAdmins = await fetchMinistryAdminsForMinistry(actor.ministryId);
        member = ministryAdmins.find((m) => m.userId === body.recipientUserId) ?? null;
      }
      if (!member) {
        return NextResponse.json({ error: "Recipient is not an active team member" }, { status: 400 });
      }
      recipientUserId = member.userId;
      recipientName = member.name;
    }

    const allowedVisibilities: MessageVisibility[] = isStaff ? ["internal", "investor_visible"] : ["investor_visible"];
    const visibility: MessageVisibility =
      body.visibility && allowedVisibilities.includes(body.visibility) ? body.visibility : "investor_visible";

    const [inserted] = await db
      .insert(projectMessages)
      .values({
        projectId: null,
        scope: "concierge",
        threadOwnerUserId,
        engagementId: null,
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
        scope: "concierge",
        threadOwnerUserId,
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
