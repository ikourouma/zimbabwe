"use client";

import { useEffect, useState } from "react";
import type { AuditLogEntry } from "@/lib/types";

/** Fetches `GET /api/projects/[id]/history` (qualified/admin/super_admin/government — see that
 *  route) — the chronological, multi-round change-request record backing the Project Detail
 *  Drawer's Timeline tab. Pass `null` while no project is selected to skip the fetch. */
export function useProjectHistory(projectId: string | null) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setEntries([]);
      return;
    }
    let mounted = true;
    setIsLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/history`);
        if (res.ok && mounted) setEntries(await res.json());
      } catch {
        /* drawer keeps an empty history on failure */
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  return { entries, isLoading };
}
