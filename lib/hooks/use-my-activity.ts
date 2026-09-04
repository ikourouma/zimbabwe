"use client";

import { useEffect, useState } from "react";
import type { AuditLogEntry } from "@/lib/types";

/** Fetches the caller's own activity trail (`/api/me/activity`) — safe for any authenticated
 *  role, unlike `useAuditLogs()` which is staff-only. Powers the Investor Dashboard Overview's
 *  Recent Activity panel for registered/qualified investors. */
export function useMyActivity() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/me/activity");
        if (res.ok && mounted) setEntries(await res.json());
      } catch {
        /* unauthenticated visitors keep an empty feed */
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { entries, isLoading };
}
