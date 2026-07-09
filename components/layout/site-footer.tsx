import Link from "next/link";
import Image from "next/image";
import { platformName } from "@/content/zimbabwe-site";

const footerLinks = [
  { label: "National Opportunity", href: "/opportunity" },
  { label: "Platform Concept", href: "/platform" },
  { label: "Strategic Pillars", href: "/strategic-alignment" },
  { label: "Priority Sectors", href: "/sectors" },
  { label: "Project Registry", href: "/projects" },
  { label: "Afronovation", href: "/about-afronovation" },
  { label: "Strategic Inquiries", href: "/strategic-partnerships" },
  { label: "Contact Us", href: "/contact" },
];

const executiveLinks = [
  { label: "Investor Registration", href: "/register" },
  { label: "Investor Journey", href: "/investor-journey" },
  { label: "National Profile", href: "/zimbabwe" },
  { label: "Admin Demo", href: "/admin-demo" },
  { label: "Super Admin Demo", href: "/super-admin-demo" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/legal#privacy" },
  { label: "Terms of Service", href: "/legal#terms" },
  { label: "Cookie Policy", href: "/legal#cookies" },
];

export function SiteFooter() {
  return (
    <footer style={{ backgroundColor: "var(--color-footer-bg)" }}>
      <div className="page-container py-16">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
          <div className="max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/brand/zimbabwe-map-icon.png" alt="Republic of Zimbabwe" width={40} height={40} className="object-contain" />
              <div>
                <p className="section-overline leading-none mb-0.5 text-[0.7rem]">{platformName.overline}</p>
                <p className="font-semibold text-base lg:text-lg leading-tight text-white" style={{ letterSpacing: "-0.01em" }}>
                  {platformName.short}
                </p>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
              {platformName.full}. A governed digital investment intelligence platform for ZIDA project discovery and
              investor engagement.
            </p>
            <p className="text-xs" style={{ color: "var(--color-gold)" }}>
              Demo data — pending official Government of Zimbabwe validation
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <p className="section-overline mb-3 text-[0.6rem]">Platform Navigation</p>
              <ul className="space-y-2">
                {footerLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="section-overline mb-3 text-[0.6rem]">Executive Access</p>
              <ul className="space-y-2 text-sm">
                {executiveLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="section-overline mb-3 text-[0.6rem]">Governance & Legal</p>
              <ul className="space-y-2 text-sm">
                {legalLinks.map((link) => (
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
            © 2026 Afronovation, Inc. — Implementation Partner
          </p>
          <p className="text-[0.625rem]" style={{ color: "var(--color-text-muted)" }}>
            ZIDA Investment Intelligence · Demo MVP
          </p>
        </div>
      </div>
    </footer>
  );
}
