import type { Metadata } from "next";
import Link from "next/link";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { platformName } from "@/content/zimbabwe-site";
import { SITE_URL } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Governance & Legal | Afronovation",
  description: "Legal policies, Terms of Service, and Privacy frameworks governing the Zimbabwe Digital Investment Platform.",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Legal", item: `${SITE_URL}/legal` },
  ],
};

export default function LegalPage() {
  return (
    <DeepDiveShell
      overline="Governance & Legal"
      title="Platform Policies & Disclaimers"
      backLabel="Return to Platform"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <p
        className="text-sm leading-relaxed mb-12 max-w-2xl -mt-6"
        style={{ color: "var(--color-text-secondary)" }}
      >
        The following policies govern usage, data handling, and interaction frameworks for the{" "}
        {platformName.full} — a demonstration environment managed by Afronovation, Inc. and configured
        for Zimbabwe&apos;s investment promotion ecosystem.
      </p>

      <div
        className="p-6 rounded mb-12"
        style={{
          backgroundColor: "rgba(255,211,0,0.08)",
          border: "1px solid rgba(255,211,0,0.25)",
        }}
      >
        <h2 className="text-base font-bold text-white mb-3">ZIDA & Government Disclaimer</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          This platform is a proprietary Afronovation SaaS demonstration configured for Zimbabwe. It
          does not constitute an official ZIDA, Government of Zimbabwe, or Ministry portal. Project data
          is derived from the ZIDA 2025 Projects deck for executive review and investor discovery — all
          catalogue entries, ministry mappings, and capital estimates are pending official validation by
          designated Zimbabwean authorities. ZIDA and government systems remain the authoritative source
          for investment promotion, licensing, and regulatory processes.
        </p>
      </div>

      <div className="space-y-8">
        <section
          id="terms"
          className="p-8 rounded scroll-mt-28"
          style={{
            backgroundColor: "var(--color-sovereign-deep)",
            border: "1px solid var(--color-sovereign-border)",
          }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Terms of Service</h2>
          <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            <p>
              <strong className="text-white">1. Acceptance of Terms:</strong> By accessing the Zimbabwe
              Digital Investment Platform, you agree to comply with these Terms of Service. Access to
              expanded project details is limited to registered demo users within this showcase environment.
            </p>
            <p>
              <strong className="text-white">2. Platform Usage:</strong> The platform is provided solely
              for reviewing, discovering, and engaging with ZIDA catalogue investment opportunities in a
              demonstration context. Unauthorized data extraction, credential sharing, or misuse is prohibited.
            </p>
            <p>
              <strong className="text-white">3. Intellectual Property:</strong> Platform architecture,
              governance workflows, and implementation methodologies are proprietary to Afronovation, Inc.
              ZIDA catalogue content and official government materials remain owned by their respective
              authorities.
            </p>
            <p>
              <strong className="text-white">4. No Investment Advice:</strong> Information presented on
              this platform does not constitute financial, legal, or investment advice. All investment
              decisions require independent due diligence and engagement with ZIDA and relevant authorities.
            </p>
          </div>
        </section>

        <section
          id="privacy"
          className="p-8 rounded scroll-mt-28"
          style={{
            backgroundColor: "var(--color-sovereign-deep)",
            border: "1px solid var(--color-sovereign-border)",
          }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Privacy Policy & Data Handling</h2>
          <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            <p>
              <strong className="text-white">1. Data Sovereignty:</strong> Afronovation respects the data
              sovereignty of the Republic of Zimbabwe. In a production deployment, sensitive national data
              and project intelligence would be subject to data localization and encryption standards agreed
              with designated authorities.
            </p>
            <p>
              <strong className="text-white">2. Information Collection:</strong> This demo collects name,
              email, organization, and investor profile information during registration and contact flows.
              Data is stored locally in your browser session for showcase purposes only — no production backend
              is connected.
            </p>
            <p>
              <strong className="text-white">3. Demo Persona Storage:</strong> Registration state and lead
              inquiries are persisted in local storage to simulate entitlement tiers (public, registered,
              qualified). Clear your browser data to reset your demo session.
            </p>
          </div>
        </section>

        <section
          id="cookies"
          className="p-8 rounded scroll-mt-28"
          style={{
            backgroundColor: "var(--color-sovereign-deep)",
            border: "1px solid var(--color-sovereign-border)",
          }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Cookie Policy</h2>
          <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            <p>
              <strong className="text-white">1. Essential Storage:</strong> We use browser local storage
              to manage demo persona state, cookie consent preferences, and lead capture records. These are
              strictly necessary for the showcase platform to function.
            </p>
            <p>
              <strong className="text-white">2. Analytics:</strong> This demonstration environment does not
              use third-party tracking or advertising cookies. No external analytics services are connected
              in the MVP showcase.
            </p>
            <p>
              <strong className="text-white">3. Managing Preferences:</strong> You may dismiss the cookie
              banner or clear browser storage at any time. See the{" "}
              <Link href="/legal#cookies" className="underline" style={{ color: "var(--color-gold)" }}>
                cookie notice
              </Link>{" "}
              on first visit.
            </p>
          </div>
        </section>

        <div className="pt-8 border-t text-xs" style={{ borderColor: "var(--color-sovereign-border)", color: "var(--color-text-muted)" }}>
          <p>Last Updated: July 2026</p>
          <p className="mt-2">
            For legal inquiries regarding platform licensing, MoU frameworks, or pilot engagements, contact{" "}
            <a href="mailto:legal@afronovation.com" className="underline" style={{ color: "var(--color-gold)" }}>
              legal@afronovation.com
            </a>
            .
          </p>
        </div>
      </div>
    </DeepDiveShell>
  );
}
