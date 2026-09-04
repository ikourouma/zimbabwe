"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketingPopup } from "@/lib/types";

export function useMarketingPopups(all = false) {
  const [popups, setPopups] = useState<MarketingPopup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(all ? "/api/marketing-popups?all=1" : "/api/marketing-popups");
      if (res.ok) setPopups(await res.json());
    } catch {
      /* keep empty on failure */
    } finally {
      setIsLoading(false);
    }
  }, [all]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { popups, isLoading, refresh };
}
