"use client";

import Link from "next/link";
import { SiteLogoLockup } from "@/components/layout/site-logo-lockup";
import { UserAccountMenu } from "@/components/layout/user-account-menu";
import { useState } from "react";
import { Menu } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useLocale, useTranslations } from "@/context/locale-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { isPublicNavHrefVisible } from "@/lib/governance/public-nav";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function SiteHeader() {
  const { locale } = useLocale();
  const { isAuthenticated, isLoading } = useAuth();
  const t = useTranslations();
  const { publicNavVisibility } = useSiteSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const primaryNav = t.nav.primary.filter((link) => isPublicNavHrefVisible(link.href, publicNavVisibility));
  const headerPlatformName = t.platformName.shortHeader;
  const useShortNavLabels = locale === "fr";

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{ backgroundColor: "var(--color-nav-bg)", borderBottom: "1px solid var(--color-nav-border)" }}
    >
      <div className="page-container flex h-16 lg:h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <SiteLogoLockup
            iconClassName="object-contain w-10 h-10 lg:w-11 lg:h-11 transition-transform group-hover:scale-105"
            priority
          />
        </Link>

        <nav
          className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-1 min-w-0 flex-nowrap justify-center mx-2 xl:mx-3"
          aria-label="Primary navigation"
        >
          {primaryNav.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {"shortLabel" in link && link.shortLabel ? (
                useShortNavLabels ? (
                  link.shortLabel
                ) : (
                  <>
                    <span className="xl:hidden">{link.shortLabel}</span>
                    <span className="hidden xl:inline">{link.label}</span>
                  </>
                )
              ) : (
                link.label
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <UserAccountMenu />
          {!isLoading && !isAuthenticated && (
            <>
              <Link
                href="/auth/sign-in"
                className="nav-link hidden sm:inline-flex whitespace-nowrap text-xs px-2"
              >
                {t.nav.signIn}
              </Link>
              <Link href="/register" className="btn-sovereign hidden sm:inline-flex whitespace-nowrap text-xs px-5 py-2.5">
                {t.nav.register}
              </Link>
            </>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button type="button" className="lg:hidden p-2 rounded text-white" aria-label={t.nav.openMenu}>
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent className="max-w-xs flex flex-col">
              <SheetTitle className="text-sm">{headerPlatformName}</SheetTitle>
              {isAuthenticated && (
                <UserAccountMenu variant="mobile" onNavigate={() => setMobileOpen(false)} />
              )}
              <nav className="mt-2 flex flex-col gap-1" aria-label="Mobile navigation">
                {primaryNav.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="nav-item block"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                {!isAuthenticated && (
                  <>
                    <Link
                      href="/auth/sign-in"
                      className="nav-item block"
                      onClick={() => setMobileOpen(false)}
                    >
                      {t.nav.signIn}
                    </Link>
                    <Link
                      href="/register"
                      className="btn-sovereign block text-center mt-4"
                      onClick={() => setMobileOpen(false)}
                    >
                      {t.nav.register}
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
