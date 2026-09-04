"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "@/context/locale-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { isPublicNavHrefVisible } from "@/lib/governance/public-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function UtilityBar() {
  const router = useRouter();
  const t = useTranslations();
  const { publicNavVisibility } = useSiteSettings();
  const [query, setQuery] = useState("");

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/projects?search=${encodeURIComponent(trimmed)}` : "/projects");
  };

  return (
    <div
      className="w-full border-b"
      style={{ backgroundColor: "var(--color-footer-bg)", borderColor: "var(--color-nav-border)" }}
    >
      <div className="page-container flex h-9 items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative hidden sm:block w-full max-w-[220px]">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.utility.searchPlaceholder}
            aria-label={t.utility.searchAriaLabel}
            className="w-full bg-transparent py-1 pl-7 pr-2 text-[0.7rem] text-white placeholder:text-white/30 focus:outline-none"
          />
        </form>

        <nav className="ml-auto flex items-center gap-4 text-[0.7rem] font-medium" aria-label="Utility navigation">
          {t.nav.utility.filter((link) => isPublicNavHrefVisible(link.href, publicNavVisibility)).map((link) => (
            <Link key={link.href} href={link.href} className="utility-link">
              {link.label}
            </Link>
          ))}
          <LanguageSwitcher />
        </nav>
      </div>
    </div>
  );
}
