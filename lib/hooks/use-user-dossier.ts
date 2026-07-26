"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserDossier } from "@/lib/types";

/** Fetches the full Institutional Compliance Dossier payload for one user (GET /api/users/[id])
 *  on demand — used by the Users & Roles detail drawer, which only needs this richer payload once
 *  a specific account is opened (the workspace's own list keeps using the lighter AdminUserRecord
 *  from useAdminUsers). */
export function useUserDossier(userId: string | null) {
  const [dossier, setDossier] = useState<UserDossier | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${id}`);
      setDossier(res.ok ? await res.json() : null);
    } catch {
      setDossier(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) void load(userId);
    else setDossier(null);
  }, [userId, load]);

  const refresh = useCallback(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  return { dossier, isLoading, refresh };
}
