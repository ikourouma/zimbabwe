import type { Metadata } from "next";
import Link from "next/link";
import { DeepDiveShell } from "@/components/layout/deep-dive-shell";
import { ExecutiveCard } from "@/components/system/executive-card";
import { SITE_URL } from "@/lib/config/site";
import { fetchFaqEntries } from "@/lib/db/queries/content";
import type { FaqEntry as FaqRow } from "@/lib/types";

const PAGE_URL = `${SITE_URL}/faq`;

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about the Zimbabwe Digital Investment Platform — data sourcing, governance, investor access tiers, and how to get in touch.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Frequently Asked Questions",
    description: "Common questions about the ZIDA project registry, governance, and investor access tiers.",
    url: PAGE_URL,
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "FAQs", item: PAGE_URL },
  ],
};

interface FaqEntry {
  question: string;
  answer: React.ReactNode;
}

interface FaqCategory {
  category: string;
  items: FaqEntry[];
}

const faqCategories: FaqCategory[] = [
  {
    category: "About the Platform",
    items: [
      {
        question: "What is this platform?",
        answer: (
          <>
            A governed digital investment intelligence platform that strengthens investment visibility, project
            discovery, investor engagement, and institutional coordination for Zimbabwe — without replacing ZIDA
            or government systems. It transforms ZIDA&apos;s static 2025 Projects catalogue into a searchable,
            filterable, investor-facing registry.
          </>
        ),
      },
      {
        question: "Is this an official ZIDA or Government of Zimbabwe platform?",
        answer: (
          <>
            No. This is a proprietary Afronovation SaaS demonstration configured for Zimbabwe. It does not
            constitute an official ZIDA, Government of Zimbabwe, or Ministry portal. ZIDA and government systems
            remain the authoritative source for investment promotion, licensing, and regulatory processes. See the{" "}
            <Link href="/legal" className="underline" style={{ color: "var(--color-gold)" }}>
              Governance &amp; Legal
            </Link>{" "}
            page for the full disclaimer.
          </>
        ),
      },
      {
        question: "Where does the project data come from, and how is it verified?",
        answer: (
          <>
            Project data is derived from the ZIDA 2025 Projects deck for executive review and investor discovery.
            All catalogue entries, ministry mappings, and capital estimates are pending official validation by
            designated Zimbabwean authorities — each project carries a data verification status badge on its
            detail page, and a source reference line noting the origin document.
          </>
        ),
      },
    ],
  },
  {
    category: "Governance & Data",
    items: [
      {
        question: "How are projects reviewed before they appear in the registry?",
        answer: (
          <>
            Every project follows a draft → review → publish workflow before it is visible in the public registry.
            Entitlements then expand further as investors register and qualify, so the registry reflects both
            governance status and investor access level at once.
          </>
        ),
      },
      {
        question: "What does \"Illustrative Policy Initiative\" mean on some projects?",
        answer: (
          <>
            A small number of entries are illustrative policy initiatives drawn from Zimbabwe&apos;s national
            strategy documents (for example, the digital transformation and AI strategies) rather than the ZIDA
            2025 catalogue itself. They are flagged &ldquo;Illustrative Policy Initiative · TA Required&rdquo;
            because a phased approach — capacity building, infrastructure development, and governance/regulatory
            framework work — is needed before they become investment-ready, distinct from catalogue projects that
            are already investor-facing.
          </>
        ),
      },
      {
        question: "Who manages sectors, pillars, ministries, and other taxonomies?",
        answer: (
          <>
            These structures are configured centrally by a super admin rather than hard-coded, so the platform can
            evolve without a code change or redeploy. Every project is expected to align to at least one sector,
            one strategic pillar, one or more SDGs, and a primary beneficiary ministry (with secondary/tertiary
            ministries where relevant) — the same underlying mechanism that lets this platform template be
            reconfigured for a different country.
          </>
        ),
      },
    ],
  },
  {
    category: "Registration & Investor Access",
    items: [
      {
        question: "What's the difference between a Public Visitor, Registered Investor, and Qualified Investor?",
        answer: (
          <>
            <strong className="text-white">Public Visitor</strong> — open access to project titles, sectors,
            locations, opportunity summaries, and strategic/SDG/ministry alignment, no account required.{" "}
            <strong className="text-white">Registered Investor</strong> — create an investor profile to unlock
            financing-type filters in the registry and put your profile on file for credential review.{" "}
            <strong className="text-white">Qualified Investor</strong> — admin-verified investors gain capital
            estimates, IRR/NPV/ROI, gated documents and investor packs, and direct meeting/document requests.
          </>
        ),
      },
      {
        question: "How do I become a Qualified Investor?",
        answer: (
          <>
            First{" "}
            <Link href="/register" className="underline" style={{ color: "var(--color-gold)" }}>
              register
            </Link>{" "}
            an investor profile, then submit a{" "}
            <Link href="/strategic-partnerships" className="underline" style={{ color: "var(--color-gold)" }}>
              Strategic Partnerships &amp; Inquiries
            </Link>{" "}
            request. Our team reviews and approves qualified-investor credentials — once approved, capital
            estimates and financial indicators unlock automatically wherever they appear on the platform.
          </>
        ),
      },
      {
        question: "Why can't I see capital estimates or financial indicators yet?",
        answer: (
          <>
            Capital estimates, IRR, NPV, ROI, and total project cost figures are reserved for verified Qualified
            Investors. Registering unlocks expanded project scope and financing-type filters, but financial figures
            specifically only unlock once our team has verified your investor status — this protects sensitive
            figures while still letting every visitor evaluate the strategic fit of an opportunity.
          </>
        ),
      },
    ],
  },
  {
    category: "Getting in Touch",
    items: [
      {
        question: "What's the difference between \"Contact Us\" and \"Strategic Partnerships & Inquiries\"?",
        answer: (
          <>
            <strong className="text-white">Contact Us</strong> is the standard form for general questions, media
            and press inquiries, and anything that doesn&apos;t need a dedicated review pathway.{" "}
            <strong className="text-white">Strategic Partnerships &amp; Inquiries</strong> is a three-step, routed
            form for investors, government/DFI counterparts, and strategic or technical partners with a specific
            mandate — it captures ticket size, sector interest, or nature of engagement, and routes to the desk
            best placed to respond.
          </>
        ),
      },
      {
        question: "How do I request project documents or a meeting?",
        answer: (
          <>
            From any project&apos;s detail page, use the Data Room actions — &ldquo;Request document
            access,&rdquo; &ldquo;Submit investment interest,&rdquo; or &ldquo;Request meeting.&rdquo; These carry
            the project context directly into the Strategic Partnerships &amp; Inquiries form so your request is
            routed with full context attached.
          </>
        ),
      },
    ],
  },
];

/** Merges super-admin-managed FAQ entries (Phase 1 marketing CMS) into the built-in categories —
 *  matched into an existing category by name (case-insensitive), or appended as a new category
 *  when none matches. Purely additive: the curated baseline content never disappears. */
function mergeCmsEntries(base: FaqCategory[], cmsEntries: FaqRow[]): FaqCategory[] {
  if (cmsEntries.length === 0) return base;
  const merged = base.map((c) => ({ ...c, items: [...c.items] }));
  for (const entry of cmsEntries) {
    const target = merged.find((c) => c.category.toLowerCase() === entry.category.toLowerCase());
    const item: FaqEntry = { question: entry.question, answer: entry.answer };
    if (target) target.items.push(item);
    else merged.push({ category: entry.category, items: [item] });
  }
  return merged;
}

export default async function FaqPage() {
  const cmsEntries = await fetchFaqEntries().catch(() => []);
  const categories = mergeCmsEntries(faqCategories, cmsEntries);
  return (
    <DeepDiveShell overline="Support" title="Frequently Asked Questions" backLabel="Return to Platform">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <p className="text-sm leading-relaxed mb-12 max-w-2xl -mt-6" style={{ color: "var(--color-text-secondary)" }}>
        Common questions about how the platform sources and governs data, how investor access tiers work, and how
        to reach the right desk for your inquiry.
      </p>

      <div className="space-y-12">
        {categories.map((category) => (
          <section key={category.category}>
            <h2
              className="text-lg font-medium text-white mb-5"
              style={{ letterSpacing: "var(--type-heading-tracking)" }}
            >
              {category.category}
            </h2>
            <div className="space-y-4">
              {category.items.map((item) => (
                <ExecutiveCard key={item.question}>
                  <h3 className="text-sm font-semibold text-white mb-2">{item.question}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {item.answer}
                  </p>
                </ExecutiveCard>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div
        className="mt-12 p-6 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ backgroundColor: "var(--color-sovereign-deep)", border: "1px solid var(--color-sovereign-border)" }}
      >
        <div>
          <h3 className="text-base font-medium text-white mb-1">Still have a question?</h3>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            General questions go to Contact Us; investment, government/DFI, or partnership mandates go to Strategic
            Partnerships &amp; Inquiries.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link href="/contact" className="btn-sovereign-ghost px-5 py-2.5 text-sm whitespace-nowrap">
            Contact Us
          </Link>
          <Link href="/strategic-partnerships" className="btn-sovereign px-5 py-2.5 text-sm whitespace-nowrap">
            Strategic Partnerships
          </Link>
        </div>
      </div>
    </DeepDiveShell>
  );
}
