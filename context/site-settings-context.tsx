"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type BannerDisplayMode = "stack" | "rotate";

interface SiteSettings {
  costStructureHidden: boolean;
  flashBannerEnabled: boolean;
  flashBannerMessage: string | null;
  flashBannerCtaLabel: string | null;
  flashBannerCtaHref: string | null;
  bannerDisplayMode: BannerDisplayMode;
}

interface SiteSettingsContextValue extends SiteSettings {
  isLoading: boolean;
  setCostStructureHidden: (hidden: boolean) => Promise<void>;
  updateFlashBanner: (patch: Partial<Omit<SiteSettings, "costStructureHidden">>) => Promise<void>;
  setBannerDisplayMode: (mode: BannerDisplayMode) => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

const DEFAULT_SETTINGS: SiteSettings = {
  costStructureHidden: false,
  flashBannerEnabled: false,
  flashBannerMessage: null,
  flashBannerCtaLabel: null,
  flashBannerCtaHref: null,
  bannerDisplayMode: "stack",
};

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/site-settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const patchSettings = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/site-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to update site settings");
    const data = (await res.json()) as SiteSettings;
    setSettings(data);
    return data;
  }, []);

  const setCostStructureHidden = useCallback(
    async (hidden: boolean) => {
      await patchSettings({ costStructureHidden: hidden });
    },
    [patchSettings]
  );

  const updateFlashBanner = useCallback(
    async (patch: Partial<Omit<SiteSettings, "costStructureHidden">>) => {
      await patchSettings(patch);
    },
    [patchSettings]
  );

  const setBannerDisplayMode = useCallback(
    async (mode: BannerDisplayMode) => {
      await patchSettings({ bannerDisplayMode: mode });
    },
    [patchSettings]
  );

  return (
    <SiteSettingsContext.Provider
      value={{ ...settings, isLoading, setCostStructureHidden, updateFlashBanner, setBannerDisplayMode }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  return ctx;
}
