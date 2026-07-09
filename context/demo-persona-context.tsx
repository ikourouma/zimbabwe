"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { DemoPersona } from "@/lib/types";

interface DemoPersonaContextValue {
  persona: DemoPersona;
  setPersona: (persona: DemoPersona) => void;
  isRegistered: boolean;
  isQualified: boolean;
  isGovernment: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const DemoPersonaContext = createContext<DemoPersonaContextValue | null>(null);

const STORAGE_KEY = "zim-demo-persona";

export function DemoPersonaProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersonaState] = useState<DemoPersona>("public");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as DemoPersona | null;
    if (stored) setPersonaState(stored);
    setHydrated(true);
  }, []);

  const setPersona = useCallback((p: DemoPersona) => {
    setPersonaState(p);
    localStorage.setItem(STORAGE_KEY, p);
  }, []);

  const value: DemoPersonaContextValue = {
    persona: hydrated ? persona : "public",
    setPersona,
    isRegistered:
      persona === "registered" ||
      persona === "qualified" ||
      persona === "government" ||
      persona === "admin" ||
      persona === "super_admin",
    isQualified:
      persona === "qualified" || persona === "government" || persona === "admin" || persona === "super_admin",
    isGovernment: persona === "government",
    isAdmin: persona === "admin" || persona === "super_admin",
    isSuperAdmin: persona === "super_admin",
  };

  return <DemoPersonaContext.Provider value={value}>{children}</DemoPersonaContext.Provider>;
}

export function useDemoPersona() {
  const ctx = useContext(DemoPersonaContext);
  if (!ctx) throw new Error("useDemoPersona must be used within DemoPersonaProvider");
  return ctx;
}
