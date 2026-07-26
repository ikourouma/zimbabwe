"use client";

import { useLocale } from "@/context/locale-context";
import type { Locale } from "@/lib/i18n/locales";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  const options: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "fr", label: "FR" },
  ];

  return (
    <div
      className="flex items-center gap-1.5 border-l pl-4"
      style={{ borderColor: "var(--color-nav-border)" }}
      aria-label="Language"
    >
      {options.map((option, index) => (
        <span key={option.code} className="flex items-center gap-1.5">
          {index > 0 && (
            <span aria-hidden="true" style={{ color: "var(--color-text-muted)" }}>
              /
            </span>
          )}
          <button
            type="button"
            onClick={() => setLocale(option.code)}
            className="transition-colors hover:text-white"
            style={{
              color: locale === option.code ? "var(--color-text-primary)" : "var(--color-text-muted)",
            }}
            aria-current={locale === option.code ? "true" : undefined}
            title={option.code === "fr" ? "Français" : "English"}
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  );
}
