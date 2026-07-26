"use client";

import { useEffect, useState } from "react";
import type { AuditLogEntry } from "@/lib/types";

/** Fetches `/api/audit-logs` (super_admin only — returns [] with a benign 403/401 for anyone
 *  else, matching every other store's "unauthenticated visitors get an empty list" pattern). */
export function useAuditLogs() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/audit-logs");
        if (res.ok && mounted) setEntries(await res.json());
      } catch {
        /* non-super-admin visitors keep an empty feed */
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
