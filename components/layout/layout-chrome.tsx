"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DemoBanner } from "@/components/layout/demo-banner";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { StickyBreadcrumb } from "@/components/layout/sticky-breadcrumb";
import { UtilityBar } from "@/components/layout/utility-bar";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const LIGHT_PREFIXES = ["/contact"];
const HIDE_CHROME = ["/register", "/auth"];
// Admin, Super Admin, and Deal Room are full-bleed dark "sovereign" console shells
// (components/dashboard/dashboard-shell.tsx) — they replace the marketing SiteHeader/SiteFooter
// entirely rather than sitting on top of them, matching the rest of the authenticated,
// dark-themed experience (sign-in, project detail pages).
const DASHBOARD_PREFIXES = ["/admin", "/super-admin", "/deal-room"];

function isLightRoute(pathname: string) {
  // "/projects" (the registry list) stays on the light zim-theme, but "/projects/[slug]" (the
  // institutional detail page) is sovereign-dark — so /projects is matched exactly, not as a prefix.
  if (pathname === "/projects") return true;
  return LIGHT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isDashboardRoute(pathname: string) {
  return DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function LayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = HIDE_CHROME.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isDashboard = isDashboardRoute(pathname);
  const variant = isLightRoute(pathname) ? "light" : "dark";

  useEffect(() => {
    if (hideChrome || isDashboard) {
      document.body.removeAttribute("data-shell");
      return;
    }
    document.body.setAttribute("data-shell", variant);
  }, [variant, hideChrome, isDashboard]);

  if (hideChrome) {
    return <>{children}</>;
  }

  if (isDashboard) {
    return <DashboardShell pathname={pathname}>{children}</DashboardShell>;
  }

  return (
    <>
      <UtilityBar />
      <DemoBanner variant={variant} />
      <SiteHeader />
      {pathname !== "/" && <StickyBreadcrumb />}
      {children}
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
