"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ContactReason, Ministry, Sector, StrategicPillar } from "@/lib/types";
import {
  contactReasons as seedContactReasons,
  ministries as seedMinistries,
  sectors as seedSectors,
  strategicPillars as seedPillars,
  provinces as seedProvinces,
} from "@/lib/data/taxonomies";

interface TaxonomyStoreContextValue {
  sectors: Sector[];
  pillars: StrategicPillar[];
  ministries: Ministry[];
  contactReasons: ContactReason[];
  provinces: string[];
  updateSector: (id: string, updates: Partial<Sector>) => void;
  updatePillar: (id: string, updates: Partial<StrategicPillar>) => void;
  updateMinistry: (id: string, updates: Partial<Ministry>) => void;
  addMinistry: (ministry: Omit<Ministry, "id">) => void;
  removeMinistry: (id: string) => void;
  updateContactReason: (id: string, updates: Partial<ContactReason>) => void;
  addProvince: (name: string) => void;
  renameProvince: (index: number, name: string) => void;
  removeProvince: (index: number) => void;
  resetTaxonomies: () => void;
}

const TaxonomyStoreContext = createContext<TaxonomyStoreContextValue | null>(null);

const STORAGE_KEY = "zim-taxonomy-store";

type TaxonomyState = {
  sectors: Sector[];
  pillars: StrategicPillar[];
  ministries: Ministry[];
  contactReasons: ContactReason[];
  provinces: string[];
};

const defaultState: TaxonomyState = {
  sectors: seedSectors,
  pillars: seedPillars,
  ministries: seedMinistries,
  contactReasons: seedContactReasons,
  provinces: seedProvinces,
};

export function TaxonomyStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TaxonomyState>(defaultState);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setState(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: TaxonomyState) => {
    setState(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateSector = useCallback(
    (id: string, updates: Partial<Sector>) => {
      persist({ ...state, sectors: state.sectors.map((s) => (s.id === id ? { ...s, ...updates } : s)) });
    },
    [state, persist]
  );

  const updatePillar = useCallback(
    (id: string, updates: Partial<StrategicPillar>) => {
      persist({ ...state, pillars: state.pillars.map((p) => (p.id === id ? { ...p, ...updates } : p)) });
    },
    [state, persist]
  );

  const updateMinistry = useCallback(
    (id: string, updates: Partial<Ministry>) => {
      persist({ ...state, ministries: state.ministries.map((m) => (m.id === id ? { ...m, ...updates } : m)) });
    },
    [state, persist]
  );

  const addMinistry = useCallback(
    (ministry: Omit<Ministry, "id">) => {
      const id = `min-${Date.now()}`;
      persist({ ...state, ministries: [...state.ministries, { ...ministry, id }] });
    },
    [state, persist]
  );

  const removeMinistry = useCallback(
    (id: string) => {
      persist({ ...state, ministries: state.ministries.filter((m) => m.id !== id) });
    },
    [state, persist]
  );

  const updateContactReason = useCallback(
    (id: string, updates: Partial<ContactReason>) => {
      persist({
        ...state,
        contactReasons: state.contactReasons.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      });
    },
    [state, persist]
  );

  const addProvince = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || state.provinces.includes(trimmed)) return;
      persist({ ...state, provinces: [...state.provinces, trimmed] });
    },
    [state, persist]
  );

  const renameProvince = useCallback(
    (index: number, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      persist({ ...state, provinces: state.provinces.map((p, i) => (i === index ? trimmed : p)) });
    },
    [state, persist]
  );

  const removeProvince = useCallback(
    (index: number) => {
      persist({ ...state, provinces: state.provinces.filter((_, i) => i !== index) });
    },
    [state, persist]
  );

  const resetTaxonomies = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
  }, []);

  return (
    <TaxonomyStoreContext.Provider
      value={{
        ...state,
        updateSector,
        updatePillar,
        updateMinistry,
        addMinistry,
        removeMinistry,
        updateContactReason,
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
