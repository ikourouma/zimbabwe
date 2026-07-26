"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMessages } from "@/lib/i18n";
import {
  defaultLocale,
  LOCALE_STORAGE_KEY,
  markLocaleUserChoice,
  persistDetectedLocale,
  resolveInitialLocale,
  type Locale,
} from "@/lib/i18n/locales";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: ReturnType<typeof getMessages>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = resolveInitialLocale();
    setLocaleState(initial);
    document.documentElement.lang = initial;

    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!stored) {
      persistDetectedLocale(initial);
    }

    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    markLocaleUserChoice(next);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      messages: getMessages(locale),
    }),
    [locale, setLocale],
  );

  if (!ready) {
    return (
      <LocaleContext.Provider
        value={{ locale: defaultLocale, setLocale, messages: getMessages(defaultLocale) }}
      >
        {children}
      </LocaleContext.Provider>
    );
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function useTranslations() {
  return useLocale().messages;
}
