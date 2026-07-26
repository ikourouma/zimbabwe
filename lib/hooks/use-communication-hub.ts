"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProjectMessageWithProject } from "@/lib/types";

/** Fetches `GET /api/messages` — the signed-in user's full Communication Hub inbox across every
 *  project/engagement/concierge thread they're allowed to see (see lib/db/queries/messages.ts).
 *  Powers app/deal-room/communication/page.tsx. */
export function useCommunicationHub() {
  const [messages, setMessages] = useState<ProjectMessageWithProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) setMessages(await res.json());
    } catch {
      /* unauthenticated/ineligible visitors keep an empty inbox */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { messages, isLoading, refresh };
}
