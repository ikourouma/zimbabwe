"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { InvestorEngagement } from "@/lib/types";
import { seedInvestorEngagements } from "@/lib/data/investor-engagements";

interface DealRoomStoreContextValue {
  engagements: InvestorEngagement[];
  isLoading: boolean;
  getEngagementsForProject: (projectId: string) => InvestorEngagement[];
  updateEngagementStatus: (id: string, status: InvestorEngagement["status"]) => Promise<void>;
  addEngagement: (engagement: InvestorEngagement) => Promise<InvestorEngagement>;
  refresh: () => Promise<void>;
}

const DealRoomStoreContext = createContext<DealRoomStoreContextValue | null>(null);

export function DealRoomStoreProvider({ children }: { children: React.ReactNode }) {
  const [engagements, setEngagements] = useState<InvestorEngagement[]>(seedInvestorEngagements);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/engagements");
      if (res.ok) setEngagements(await res.json());
    } catch {
      /* unauthenticated visitors keep seed fallback */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getEngagementsForProject = useCallback(
    (projectId: string) =>
      engagements.filter((e) => e.projectId === projectId),
    [engagements]
  );

  const updateEngagementStatus = useCallback(
    async (id: string, status: InvestorEngagement["status"]) => {
      const res = await fetch(`/api/engagements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update engagement");
      const updated = (await res.json()) as InvestorEngagement;
      setEngagements((prev) => prev.map((e) => (e.id === id ? updated : e)));
    },
    []
  );

  const addEngagement = useCallback(async (engagement: InvestorEngagement) => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...payload } = engagement;
    const res = await fetch("/api/engagements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to add engagement");
    const created = (await res.json()) as InvestorEngagement;
    setEngagements((prev) => [created, ...prev]);
    return created;
  }, []);

  return (
    <DealRoomStoreContext.Provider
      value={{
        engagements,
        isLoading,
        getEngagementsForProject,
        updateEngagementStatus,
        addEngagement,
        refresh,
      }}
    >
      {children}
    </DealRoomStoreContext.Provider>
  );
}

export function useDealRoomStore() {
  const ctx = useContext(DealRoomStoreContext);
  if (!ctx) throw new Error("useDealRoomStore must be used within DealRoomStoreProvider");
  return ctx;
}
