"use client";

import { useEffect, useState } from "react";
import type { MyAnalyticsSnapshot } from "@/lib/types";

/** Fetches the caller's own accurate activity counters (`/api/me/analytics`) — powers the
 *  Investor Dashboard's "My Analytics" snapshot card. */
export function useMyAnalytics(enabled: boolean) {
  const [analytics, setAnalytics] = useState<MyAnalyticsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/me/analytics");
        if (res.ok && mounted) setAnalytics(await res.json());
      } catch {
        /* leave analytics null on transient failure */
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [enabled]);

  return { analytics, isLoading };
}
