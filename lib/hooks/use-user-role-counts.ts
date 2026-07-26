"use client";

import { useEffect, useState } from "react";
import type { AccountRole } from "@/lib/auth/types";

/** Aggregate-only account counts by role for admin/super_admin/government — see
 *  GET /api/users/role-counts. Non-staff callers simply keep an empty map. */
export function useUserRoleCounts() {
  const [counts, setCounts] = useState<Partial<Record<AccountRole, number>>>({});
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/role-counts");
        if (res.ok) {
          const data = (await res.json()) as { counts: Partial<Record<AccountRole, number>>; total: number };
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
