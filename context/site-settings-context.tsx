"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface SiteSettingsContextValue {
  costStructureHidden: boolean;
  setCostStructureHidden: (hidden: boolean) => void;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

const STORAGE_KEY = "zim-site-settings";

interface StoredSettings {
  costStructureHidden: boolean;
}

const DEFAULT_SETTINGS: StoredSettings = {
  costStructureHidden: false,
};

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoredSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      } catch {
        // ignore malformed storage
      }
    }
    setHydrated(true);
  }, []);

  const setCostStructureHidden = useCallback((hidden: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, costStructureHidden: hidden };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value: SiteSettingsContextValue = {
    costStructureHidden: hydrated ? settings.costStructureHidden : DEFAULT_SETTINGS.costStructureHidden,
    setCostStructureHidden,
  };

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  return ctx;
}
