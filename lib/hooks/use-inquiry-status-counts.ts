"use client";

import { useEffect, useState } from "react";

/** Aggregate-only lead inquiry counts by status for admin/super_admin/government — see
 *  GET /api/inquiries/status-counts. Non-staff callers simply keep an empty map. */
export function useInquiryStatusCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/inquiries/status-counts");
        if (res.ok) {
          const data = (await res.json()) as { counts: Record<string, number>; total: number };
          if (!cancelled) {
            setCounts(data.counts);
            setTotal(data.total);
          }
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

  return { counts, total, isLoading };
}
