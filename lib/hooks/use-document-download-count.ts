"use client";

import { useEffect, useState } from "react";

/** Platform-wide real document-download count for admin/super_admin — powers the Government
 *  Executive Report's "Document Downloads" tile (hidden entirely while the count is 0). Non-staff
 *  callers simply keep a 0 count (401/403 from the route is swallowed, matching useMouSummary). */
export function useDocumentDownloadCount() {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/documents/download-count");
        if (res.ok) {
          const data = (await res.json()) as { count: number };
          if (!cancelled) setCount(data.count);
        }
      } catch {
        /* non-staff visitors keep a 0 count */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { count, isLoading };
}
