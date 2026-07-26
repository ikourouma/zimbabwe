"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ContactReason, Ministry, SDG, Sector, StrategicPillar } from "@/lib/types";
import {
  contactReasons as seedContactReasons,
  ministries as seedMinistries,
  sectors as seedSectors,
  strategicPillars as seedPillars,
  provinces as seedProvinces,
  sdgs as seedSdgs,
} from "@/lib/data/taxonomies";

interface TaxonomyStoreContextValue {
  sectors: Sector[];
  pillars: StrategicPillar[];
  ministries: Ministry[];
  contactReasons: ContactReason[];
  provinces: string[];
  sdgs: SDG[];
  isLoading: boolean;
  updateSector: (id: string, updates: Partial<Sector>) => Promise<void>;
  addSector: (input: { name: string; shortName?: string; description?: string }) => Promise<void>;
  archiveSector: (id: string) => Promise<void>;
  removeSector: (id: string) => Promise<void>;
  updatePillar: (id: string, updates: Partial<StrategicPillar>) => Promise<void>;
  addPillar: (input: { name: string; description?: string; strategicMandate?: string; policyAlignmentPrimary?: string }) => Promise<void>;
  archivePillar: (id: string) => Promise<void>;
  removePillar: (id: string) => Promise<void>;
  updateMinistry: (id: string, updates: Partial<Ministry>) => Promise<void>;
  addMinistry: (ministry: Omit<Ministry, "id">) => Promise<void>;
  archiveMinistry: (id: string) => Promise<void>;
  removeMinistry: (id: string) => Promise<void>;
  updateContactReason: (id: string, updates: Partial<ContactReason>) => Promise<void>;
  addContactReason: (input: { label: string; routingCategory?: string }) => Promise<void>;
  archiveContactReason: (id: string) => Promise<void>;
  removeContactReason: (id: string) => Promise<void>;
  addProvince: (name: string) => Promise<void>;
  renameProvince: (index: number, name: string) => Promise<void>;
  removeProvince: (index: number) => Promise<void>;
  resetTaxonomies: () => Promise<void>;
}

const TaxonomyStoreContext = createContext<TaxonomyStoreContextValue | null>(null);

type TaxonomyState = {
  sectors: Sector[];
  pillars: StrategicPillar[];
  ministries: Ministry[];
  contactReasons: ContactReason[];
  provinces: string[];
  sdgs: SDG[];
};

const defaultState: TaxonomyState = {
  sectors: seedSectors,
  pillars: seedPillars,
  ministries: seedMinistries,
  contactReasons: seedContactReasons,
  provinces: seedProvinces,
  sdgs: seedSdgs,
};

async function patchTaxonomies(body: Record<string, unknown>): Promise<TaxonomyState> {
  const res = await fetch("/api/taxonomies", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Surface the server's specific message (e.g. the linked-project delete guard's 409 copy)
    // instead of a generic failure, so the UI can toast exactly why an action was blocked.
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Failed to update taxonomies");
  }
  return res.json();
}

export function TaxonomyStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TaxonomyState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/taxonomies");
      if (res.ok) setState(await res.json());
    } catch {
      /* keep seed fallback */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateSector = useCallback(async (id: string, updates: Partial<Sector>) => {
    setState(await patchTaxonomies({ action: "updateSector", id, updates }));
  }, []);

  const addSector = useCallback(async (input: { name: string; shortName?: string; description?: string }) => {
    setState(await patchTaxonomies({ action: "addSector", ...input }));
  }, []);

  const archiveSector = useCallback(async (id: string) => {
    setState(await patchTaxonomies({ action: "archiveSector", id }));
  }, []);

  const removeSector = useCallback(async (id: string) => {
    setState(await patchTaxonomies({ action: "removeSector", id }));
  }, []);

  const updatePillar = useCallback(async (id: string, updates: Partial<StrategicPillar>) => {
    setState(await patchTaxonomies({ action: "updatePillar", id, updates }));
  }, []);

  const addPillar = useCallback(async (input: { name: string; description?: string; strategicMandate?: string; policyAlignmentPrimary?: string }) => {
    setState(await patchTaxonomies({ action: "addPillar", ...input }));
  }, []);

  const archivePillar = useCallback(async (id: string) => {
    setState(await patchTaxonomies({ action: "archivePillar", id }));
  }, []);

  const removePillar = useCallback(async (id: string) => {
    setState(await patchTaxonomies({ action: "removePillar", id }));
  }, []);

  const updateMinistry = useCallback(async (id: string, updates: Partial<Ministry>) => {
    setState(await patchTaxonomies({ action: "updateMinistry", id, updates }));
  }, []);

  const addMinistry = useCallback(async (ministry: Omit<Ministry, "id">) => {
    setState(await patchTaxonomies({ action: "addMinistry", ministry }));
  }, []);

  const archiveMinistry = useCallback(async (id: string) => {
    setState(await patchTaxonomies({ action: "archiveMinistry", id }));
  }, []);

  const removeMinistry = useCallback(async (id: string) => {
    setState(await patchTaxonomies({ action: "removeMinistry", id }));
  }, []);

  const updateContactReason = useCallback(async (id: string, updates: Partial<ContactReason>) => {
    setState(await patchTaxonomies({ action: "updateContactReason", id, updates }));
  }, []);

  const addContactReason = useCallback(async (input: { label: string; routingCategory?: string }) => {
    setState(await patchTaxonomies({ action: "addContactReason", ...input }));
  }, []);

  const archiveContactReason = useCallback(async (id: string) => {
    setState(await patchTaxonomies({ action: "archiveContactReason", id }));
  }, []);

  const removeContactReason = useCallback(async (id: string) => {
    setState(await patchTaxonomies({ action: "removeContactReason", id }));
  }, []);

  const addProvince = useCallback(async (name: string) => {
    setState(await patchTaxonomies({ action: "addProvince", name }));
  }, []);

  const renameProvince = useCallback(async (index: number, name: string) => {
    setState(await patchTaxonomies({ action: "renameProvince", index, name }));
  }, []);

  const removeProvince = useCallback(async (index: number) => {
    setState(await patchTaxonomies({ action: "removeProvince", index }));
  }, []);

  const resetTaxonomies = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return (
    <TaxonomyStoreContext.Provider
      value={{
        ...state,
        isLoading,
        updateSector,
        addSector,
        archiveSector,
        removeSector,
        updatePillar,
        addPillar,
        archivePillar,
        removePillar,
        updateMinistry,
        addMinistry,
        archiveMinistry,
        removeMinistry,
        updateContactReason,
        addContactReason,
        archiveContactReason,
        removeContactReason,
        addProvince,
        renameProvince,
        removeProvince,
        resetTaxonomies,
      }}
    >
      {children}
    </TaxonomyStoreContext.Provider>
  );
}

export function useTaxonomyStore() {
  const ctx = useContext(TaxonomyStoreContext);
  if (!ctx) throw new Error("useTaxonomyStore must be used within TaxonomyStoreProvider");
  return ctx;
}
