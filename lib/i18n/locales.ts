export const locales = ["en", "fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_STORAGE_KEY = "zim-locale";

export const LOCALE_USER_SET_KEY = "zim-locale-user-set";

export const LOCALE_COOKIE = "zim-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "fr";
}

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** Map browser language tags to supported platform locales. English is the default fallback. */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return defaultLocale;

  const candidates = [navigator.language, ...(navigator.languages ?? [])];
  for (const tag of candidates) {
    const normalized = tag.toLowerCase();
    if (normalized === "fr" || normalized.startsWith("fr-")) return "fr";
  }
  return defaultLocale;
}

export function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && isLocale(stored)) return stored;

  return detectBrowserLocale();
}

export function markLocaleUserChoice(locale: Locale) {
  localStorage.setItem(LOCALE_USER_SET_KEY, "true");
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
  document.documentElement.lang = locale;
}

export function persistDetectedLocale(locale: Locale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
  document.documentElement.lang = locale;
}
