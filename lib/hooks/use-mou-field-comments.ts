"use client";

import { useCallback, useEffect, useState } from "react";
import type { MouFieldComment } from "@/lib/types";

interface UseMouFieldCommentsResult {
  comments: MouFieldComment[];
  isLoading: boolean;
  addComment: (fieldKey: string, body: string) => Promise<boolean>;
  resolveComment: (commentId: string) => Promise<boolean>;
  error: string | null;
}

/** Per-field MOU review comments (Phase 7) — fetched once per engagement and filtered client-side
 *  by fieldKey, since the whole thread is small and every field on the tab needs it at once. */
export function useMouFieldComments(engagementId: string | null): UseMouFieldCommentsResult {
  const [comments, setComments] = useState<MouFieldComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!engagementId) {
      setComments([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/mou/comments`);
      if (!res.ok) throw new Error("Failed to load comments");
      setComments(await res.json());
      setError(null);
    } catch {
      setError("Failed to load MOU comments");
    } finally {
      setIsLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addComment = useCallback(
    async (fieldKey: string, body: string) => {
      if (!engagementId) return false;
      try {
        const res = await fetch(`/api/engagements/${engagementId}/mou/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fieldKey, body }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Failed to post comment");
          return false;
        }
        await refresh();
        return true;
      } catch {
        setError("Failed to post comment");
        return false;
      }
    },
    [engagementId, refresh]
  );

  const resolveComment = useCallback(
    async (commentId: string) => {
      if (!engagementId) return false;
      try {
        const res = await fetch(`/api/engagements/${engagementId}/mou/comments/${commentId}`, { method: "PATCH" });
        if (!res.ok) return false;
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [engagementId, refresh]
  );

  return { comments, isLoading, addComment, resolveComment, error };
}
