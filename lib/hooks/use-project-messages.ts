"use client";

import { useCallback, useEffect, useState } from "react";
import type { MessageVisibility, ProjectMessage } from "@/lib/types";

/** A file already uploaded to R2 (via the attachments upload route), ready to attach to a message. */
export interface PendingAttachment {
  storageKey: string;
  fileName: string;
  contentType: string;
  size: number;
}

interface PostMessageOptions {
  subject?: string;
  visibility?: MessageVisibility;
  parentMessageId?: string;
  recipientUserId?: string;
  attachments?: PendingAttachment[];
}

/**
 * A Communication Hub thread lives on one of two channels:
 *  - `project`: `/api/projects/[id]/messages` (optionally scoped to one engagement).
 *  - `concierge`: `/api/concierge/messages` — the project-less General channel; `ownerUserId` is
 *    the investor whose thread it is (staff pass it to reply; investors own theirs implicitly).
 */
export type ThreadChannel =
  | { kind: "project"; projectId: string | null; engagementId?: string | null }
  | { kind: "concierge"; ownerUserId: string | null };

function buildUrls(channel: ThreadChannel) {
  if (channel.kind === "concierge") {
    const owner = channel.ownerUserId ? `?ownerUserId=${encodeURIComponent(channel.ownerUserId)}` : "";
    return {
      getUrl: `/api/concierge/messages${owner}`,
      postUrl: `/api/concierge/messages`,
      uploadUrl: `/api/concierge/messages/attachments`,
      ready: true,
    };
  }
  const { projectId, engagementId } = channel;
  if (!projectId) return { getUrl: "", postUrl: "", uploadUrl: "", ready: false };
  const qs =
    engagementId === undefined
      ? ""
      : `?engagementId=${engagementId === null ? "none" : encodeURIComponent(engagementId)}`;
  return {
    getUrl: `/api/projects/${projectId}/messages${qs}`,
    postUrl: `/api/projects/${projectId}/messages`,
    uploadUrl: `/api/projects/${projectId}/messages/attachments`,
    ready: true,
  };
}

/**
 * Fetches (and lets the caller post to) one Communication Hub thread — either a project/engagement
 * thread or the project-less General Concierge channel. See the per-channel routes for the
 * role-scoped visibility rules.
 */
export function useThreadMessages(channel: ThreadChannel) {
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { getUrl, postUrl, uploadUrl, ready } = buildUrls(channel);
  const isConcierge = channel.kind === "concierge";
  const engagementIdForPost = channel.kind === "project" ? channel.engagementId ?? undefined : undefined;
  const ownerForPost = channel.kind === "concierge" ? channel.ownerUserId ?? undefined : undefined;

  const refresh = useCallback(async () => {
    if (!ready) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(getUrl);
      if (res.ok) setMessages(await res.json());
    } catch {
      /* keep an empty thread on failure */
    } finally {
      setIsLoading(false);
    }
  }, [getUrl, ready]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const postMessage = useCallback(
    async (body: string, options?: PostMessageOptions) => {
      if (!ready) return;
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          subject: options?.subject,
          ...(isConcierge ? { ownerUserId: ownerForPost } : { engagementId: engagementIdForPost }),
          visibility: options?.visibility,
          parentMessageId: options?.parentMessageId,
          recipientUserId: options?.recipientUserId,
          attachments: options?.attachments,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const created = (await res.json()) as ProjectMessage;
      setMessages((prev) => [...prev, created]);
      return created;
    },
    [postUrl, ready, isConcierge, ownerForPost, engagementIdForPost]
  );

  /** Uploads a file to R2 via the channel's attachments route and returns a pending-attachment ref
   *  to pass to postMessage. Throws on failure so the caller can surface a toast. */
  const uploadAttachment = useCallback(
    async (file: File): Promise<PendingAttachment> => {
      if (!ready) throw new Error("No thread");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(uploadUrl, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      return (await res.json()) as PendingAttachment;
    },
    [uploadUrl, ready]
  );

  return { messages, isLoading, refresh, postMessage, uploadAttachment };
}

/** Back-compat convenience wrapper for the common project/engagement thread case. */
export function useProjectMessages(projectId: string | null, engagementId?: string | null) {
  return useThreadMessages({ kind: "project", projectId, engagementId });
}
