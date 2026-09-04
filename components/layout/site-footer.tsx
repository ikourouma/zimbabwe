"use client";

import Link from "next/link";
import { SiteLogoLockup } from "@/components/layout/site-logo-lockup";
import { useTranslations } from "@/context/locale-context";
import { useSiteSettings } from "@/context/site-settings-context";
import { isPublicNavHrefVisible } from "@/lib/governance/public-nav";

export function SiteFooter() {
  const t = useTranslations();
  const { publicNavVisibility } = useSiteSettings();
  const footerPlatform = t.nav.footerPlatform.filter((link) =>
    isPublicNavHrefVisible(link.href, publicNavVisibility)
  );

  return (
    <footer style={{ backgroundColor: "var(--color-footer-bg)" }}>
      <div className="page-container py-16">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
          <div className="max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <SiteLogoLockup iconClassName="object-contain w-10 h-10" iconSize={40} />
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
              {t.platformName.full}. {t.footer.description}
            </p>
            <p className="text-xs" style={{ color: "var(--color-gold)" }}>
              {t.footer.demoNotice}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full">
            <div>
              <p className="section-overline mb-3 text-[0.6rem]">{t.footer.platformNav}</p>
              <ul className="space-y-2">
                {footerPlatform.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {t.footer.strategicInquiriesNote}
              </p>
            </div>
            <div>
              <p className="section-overline mb-3 text-[0.6rem]">{t.footer.executiveAccess}</p>
              <ul className="space-y-2 text-sm">
                {t.nav.footerExecutive.filter((link) => isPublicNavHrefVisible(link.href, publicNavVisibility)).map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="section-overline mb-3 text-[0.6rem]">{t.footer.governanceLegal}</p>
              <ul className="space-y-2 text-sm">
                {t.nav.footerLegal.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="sovereign-divider mb-8" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {t.footer.copyright}
          </p>
          <p className="text-[0.625rem]" style={{ color: "var(--color-text-muted)" }}>
            {t.footer.tagline}
          </p>
        </div>
      </div>
    </footer>
  );
}
