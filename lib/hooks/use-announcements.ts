"use client";

import { useCallback, useEffect, useState } from "react";
import type { Announcement, AnnouncementAudience } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";

/** Whether a viewer with `role` (null = anonymous) should see an announcement targeted at `audience`. */
export function matchesAudience(audience: AnnouncementAudience, role: AccountRole | null): boolean {
  switch (audience) {
    case "all":
      return true;
    case "registered":
      return role !== null;
    case "qualified":
      return role === "qualified" || role === "government" || role === "admin" || role === "super_admin";
    case "government":
      return role === "government" || role === "admin" || role === "super_admin";
    case "admin":
      return role === "admin" || role === "super_admin";
    case "super_admin":
      return role === "super_admin";
    default:
      return false;
  }
}

/** Fetches currently-active announcements (server already window/status-filters). Management pages
 *  pass `all` to include drafts/archived. */
export function useAnnouncements(all = false) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(all ? "/api/announcements?all=1" : "/api/announcements");
      if (res.ok) setAnnouncements(await res.json());
    } catch {
      /* keep empty on failure */
    } finally {
      setIsLoading(false);
    }
  }, [all]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { announcements, isLoading, refresh, setAnnouncements };
}
