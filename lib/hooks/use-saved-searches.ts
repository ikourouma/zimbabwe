"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ProjectFilters, SavedSearch } from "@/lib/types";

/**
 * Client hook for the signed-in user's server-persisted registry saved searches. No-ops (empty list)
 * for anonymous visitors — the registry falls back to the lead-capture inquiry path for them.
 */
export function useSavedSearches(enabled: boolean) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setSavedSearches([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/saved-searches");
      if (res.ok) setSavedSearches((await res.json()) as SavedSearch[]);
    } catch {
      /* leave list as-is on transient failure */
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveSearch = useCallback(
    async (name: string, filters: ProjectFilters, alertEnabled: boolean) => {
      const res = await fetch("/api/user/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, filters, alertEnabled }),
      });
      if (!res.ok) throw new Error("Failed to save search");
      const created = (await res.json()) as SavedSearch;
      setSavedSearches((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const deleteSearch = useCallback(async (id: string) => {
    const prev = savedSearches;
    setSavedSearches((list) => list.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/user/saved-searches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setSavedSearches(prev); // rollback on failure
      toast.error("Could not delete saved search.");
    }
  }, [savedSearches]);

  return { savedSearches, isLoading, refresh, saveSearch, deleteSearch };
}
