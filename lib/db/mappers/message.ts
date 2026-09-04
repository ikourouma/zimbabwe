import type { InferSelectModel } from "drizzle-orm";
import type { MessageAttachment, ProjectMessage } from "@/lib/types";
import type { projectMessages, messageAttachments } from "@/lib/db/schema";

type MessageRow = InferSelectModel<typeof projectMessages>;
type AttachmentRow = InferSelectModel<typeof messageAttachments>;

export function mapDbAttachmentToApp(row: AttachmentRow): MessageAttachment {
  return {
    id: row.id,
    messageId: row.messageId,
    fileName: row.fileName,
    contentType: row.contentType,
    size: row.size,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapDbMessageToApp(row: MessageRow, attachments?: AttachmentRow[]): ProjectMessage {
  return {
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
    subject: row.subject ?? undefined,
    body: row.body,
    attachments: attachments?.map(mapDbAttachmentToApp),
    createdAt: row.createdAt.toISOString(),
  };
}
