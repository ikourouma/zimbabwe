"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountStatus, AdminUserRecord } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch {
      /* non-super-admin visitors keep an empty list */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateUser = useCallback(
    async (
      userId: string,
      patch: {
        role?: AccountRole;
        accountStatus?: AccountStatus;
        organization?: string | null;
        jobTitle?: string | null;
        phone?: string | null;
        ministryId?: string | null;
        hqAddress?: string | null;
        businessRegistrationId?: string | null;
        websiteUrl?: string | null;
        executiveRepresentativeName?: string | null;
        executiveRepresentativeTitle?: string | null;
        reason?: string;
      }
    ) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update user");
      const updated = (await res.json()) as AdminUserRecord;
      setUsers((prev) => prev.map((u) => (u.userId === userId ? updated : u)));
      return updated;
    },
    []
  );

  const createUser = useCallback(
    async (input: {
      email: string;
      name: string;
      role: AccountRole;
      organization?: string;
      jobTitle?: string;
      phone?: string;
      ministryId?: string;
      justification?: string;
    }) => {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; tempPassword?: string; email?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      await refresh();
      return data as { userId: string; email: string; name: string; role: AccountRole; tempPassword: string };
    },
    [refresh]
  );

  return { users, isLoading, refresh, updateUser, createUser };
}
