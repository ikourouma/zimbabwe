"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { WatchlistEntry } from "@/lib/types";

/**
 * Client hook for the signed-in user's server-persisted project watchlist (Investor Dashboard
 * Expansion plan, Phase 2). No-ops (empty list) for anonymous visitors, same pattern as
 * `useSavedSearches`. `isSaved`/`toggle` are the primary surface consumers reach for
 * (WatchlistButton); `entries` backs the full `/deal-room/saved` list page.
 */
export function useWatchlist(enabled: boolean) {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setEntries([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/watchlist");
      if (res.ok) setEntries((await res.json()) as WatchlistEntry[]);
    } catch {
      /* leave list as-is on transient failure */
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const savedProjectIds = useMemo(() => new Set(entries.map((e) => e.projectId)), [entries]);
  const isSaved = useCallback((projectId: string) => savedProjectIds.has(projectId), [savedProjectIds]);

  const add = useCallback(async (projectId: string) => {
    setEntries((prev) =>
      prev.some((e) => e.projectId === projectId)
        ? prev
        : [{ id: `pending-${projectId}`, projectId, createdAt: new Date().toISOString() }, ...prev]
    );
    try {
      const res = await fetch("/api/user/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("save failed");
      const saved = (await res.json()) as WatchlistEntry;
      setEntries((prev) => prev.map((e) => (e.projectId === projectId ? saved : e)));
    } catch {
      setEntries((prev) => prev.filter((e) => e.projectId !== projectId));
      toast.error("Could not save project.");
    }
  }, []);

  const remove = useCallback(async (projectId: string) => {
    const prev = entries;
    setEntries((list) => list.filter((e) => e.projectId !== projectId));
    try {
      const res = await fetch(`/api/user/watchlist/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setEntries(prev); // rollback on failure
      toast.error("Could not remove project.");
    }
  }, [entries]);

  const toggle = useCallback(
    async (projectId: string) => {
      if (isSaved(projectId)) await remove(projectId);
      else await add(projectId);
    },
    [isSaved, add, remove]
  );

  return { entries, isLoading, isSaved, add, remove, toggle, refresh };
}
