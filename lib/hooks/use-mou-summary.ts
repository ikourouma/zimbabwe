"use client";

import { useEffect, useState } from "react";
import type { MouStatus } from "@/lib/types";

/** Platform-wide MOU status counts for admin/super_admin — powers the Government Executive
 *  Report's "MOU Executed" funnel stage. Non-staff callers simply get an empty map (401/403
 *  from the route is swallowed, matching the pattern in useAdminUsers). */
export function useMouSummary() {
  const [counts, setCounts] = useState<Partial<Record<MouStatus, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/mous/summary");
        if (res.ok) {
          const data = (await res.json()) as { counts: Partial<Record<MouStatus, number>> };
          if (!cancelled) setCounts(data.counts);
        }
      } catch {
        /* non-staff visitors keep an empty map */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { counts, isLoading };
}
