"use client";

import { useEffect, useState } from "react";
import type { PlatformStats } from "@/lib/types";

/** Fetches `/api/deal-room/platform-stats` — safe aggregate marketplace stats, open to any
 *  authenticated role. Powers the Investor Dashboard Overview's platform panel. */
export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/deal-room/platform-stats");
        if (res.ok && mounted) setStats(await res.json());
      } catch {
        /* leave stats null on transient failure */
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { stats, isLoading };
}
