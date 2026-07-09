"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DemoBanner } from "@/components/layout/demo-banner";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { StickyBreadcrumb } from "@/components/layout/sticky-breadcrumb";

const LIGHT_PREFIXES = ["/contact", "/admin-demo", "/super-admin-demo"];
const HIDE_CHROME = ["/register"];

function isLightRoute(pathname: string) {
  // "/projects" (the registry list) stays on the light zim-theme, but "/projects/[slug]" (the
  // institutional detail page) is sovereign-dark — so /projects is matched exactly, not as a prefix.
  if (pathname === "/projects") return true;
  return LIGHT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function LayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = HIDE_CHROME.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const variant = isLightRoute(pathname) ? "light" : "dark";

  useEffect(() => {
    if (hideChrome) {
      document.body.removeAttribute("data-shell");
      return;
    }
    document.body.setAttribute("data-shell", variant);
  }, [variant, hideChrome]);

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <DemoBanner />
      <SiteHeader />
      {pathname !== "/" && <StickyBreadcrumb />}
      {children}
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
