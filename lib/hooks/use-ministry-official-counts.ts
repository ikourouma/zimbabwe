"use client";

import { useEffect, useState } from "react";

/** Government-official counts per ministry (admin/super_admin only) — see
 *  GET /api/ministries/official-counts. Non-staff callers simply keep an empty map. */
export function useMinistryOfficialCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ministries/official-counts");
        if (res.ok) {
          const data = (await res.json()) as { counts: Record<string, number> };
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
