"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { InvestorEngagement } from "@/lib/types";
import { seedInvestorEngagements } from "@/lib/data/investor-engagements";

/**
 * Deal Room engagement store — same sessionStorage-backed Context pattern as
 * `project-store-context.tsx`. Kept as its own provider (rather than folded into
 * `lead-capture-context.tsx`) so it maps 1:1 to a future `investor_engagements` /
 * `investor_proposals` table + approve/reject endpoint. See BACKLOG.md "Demo to
 * SaaS Migration Map".
 */
interface DealRoomStoreContextValue {
  engagements: InvestorEngagement[];
  getEngagementsForProject: (projectId: string) => InvestorEngagement[];
  updateEngagementStatus: (id: string, status: InvestorEngagement["status"]) => void;
  addEngagement: (engagement: InvestorEngagement) => void;
}

const DealRoomStoreContext = createContext<DealRoomStoreContextValue | null>(null);

const STORAGE_KEY = "zim-deal-room-engagements";

export function DealRoomStoreProvider({ children }: { children: React.ReactNode }) {
  const [engagements, setEngagements] = useState<InvestorEngagement[]>(seedInvestorEngagements);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setEngagements(JSON.parse(stored));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: InvestorEngagement[]) => {
    setEngagements(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const getEngagementsForProject = useCallback(
    (projectId: string) => engagements.filter((e) => e.projectId === projectId),
    [engagements]
  );

  const updateEngagementStatus = useCallback(
    (id: string, status: InvestorEngagement["status"]) => {
      persist(
        engagements.map((e) =>
          e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e
        )
      );
    },
    [engagements, persist]
  );

  const addEngagement = useCallback(
    (engagement: InvestorEngagement) => {
      persist([engagement, ...engagements]);
    },
    [engagements, persist]
  );

  if (!hydrated) {
    return (
      <DealRoomStoreContext.Provider
        value={{
          engagements: seedInvestorEngagements,
          getEngagementsForProject: (projectId) =>
            seedInvestorEngagements.filter((e) => e.projectId === projectId),
          updateEngagementStatus: () => {},
          addEngagement: () => {},
        }}
      >
        {children}
      </DealRoomStoreContext.Provider>
    );
  }

  return (
    <DealRoomStoreContext.Provider
      value={{ engagements, getEngagementsForProject, updateEngagementStatus, addEngagement }}
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
