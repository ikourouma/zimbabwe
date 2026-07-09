import { getSiteStats } from "@/lib/data/site-stats";

const stats = getSiteStats();

export const gatewaySlides = [
  {
    id: "vision",
    overline: "REPUBLIC OF ZIMBABWE · ZIDA INVESTMENT INTELLIGENCE",
    headline: "Discover governed, searchable investment opportunities across Zimbabwe",
    highlight: "Powered by Afronovation",
    description:
      "A sovereign-grade digital investment intelligence platform transforming ZIDA's static 2025 catalogue into a governed, investor-facing registry.",
    primaryCta: { label: "Explore Projects", href: "/projects" },
    secondaryCta: { label: "Register", href: "/register" },
  },
  {
    id: "country",
    overline: "The Republic of Zimbabwe",
    headline: "Zimbabwe's diversified ZIDA investment catalogue",
    description:
      "A multi-sector pipeline spanning provinces and strategic pillars — curated from the ZIDA 2025 Projects deck for executive review and investor discovery.",
    primaryCta: { label: "Explore Zimbabwe", href: "/zimbabwe" },
    secondaryCta: { label: "Priority Sectors", href: "/sectors" },
  },
  {
    id: "trust",
    overline: "Trust & Governance",
    headline: "Curated from ZIDA 2025 — review-governed before publication",
    description:
      "Every project follows draft → review → publish workflow. Register for full project detail — verified investors unlock capital estimates and financial indicators.",
    primaryCta: { label: "Browse Registry", href: "/projects" },
    secondaryCta: { label: "Create Investor Profile", href: "/register" },
  },
];

export const matrixNodes = [
  {
    id: "opportunity",
    title: "National Investment Opportunity",
    desc: "Why Zimbabwe, why now, and why a governed digital ZIDA catalogue.",
    href: "/opportunity",
    metric: String(stats.totalProjects),
    metricLabel: "Projects",
  },
  {
    id: "platform",
    title: "Platform Architecture",
    desc: "Registry, governance, and entitlements — Afronovation SaaS configured for Zimbabwe.",
    href: "/platform",
    metric: "Governed",
    metricLabel: "Workflow",
  },
  {
    id: "pillars",
    title: "Strategic Pillars",
    desc: "Eleven transformation pillars aligned to ZIDA investment themes.",
    href: "/strategic-alignment",
    metric: String(stats.pillarCount),
    metricLabel: "Pillars",
  },
  {
    id: "sectors",
    title: "Priority Sectors",
    desc: "Eight economic sectors with seed-derived project pipelines.",
    href: "/sectors",
    metric: String(stats.sectorCount),
    metricLabel: "Sectors",
  },
  {
    id: "projects",
    title: "ZIDA Project Registry",
    desc: "Searchable, filterable catalogue of governed investment opportunities.",
    href: "/projects",
    metric: String(stats.publishedProjects),
    metricLabel: "Published",
  },
  {
    id: "contact",
    title: "Strategic Partnerships & Inquiries",
    desc: "Executive gateway for institutional investors and strategic partners.",
    href: "/strategic-partnerships",
    metric: "24/7",
    metricLabel: "Executive Gateway",
    isSpecial: true,
  },
];

export const platformName = {
  short: "Zimbabwe Investment Platform",
  full: "Zimbabwe Digital Investment & Economic Intelligence Platform",
  overline: "Republic of Zimbabwe",
  tagline: "Powered by Afronovation",
};

export const classificationStrip = [
  { label: "Classification", value: "Public Demo Showcase" },
  { label: "Status", value: "Phase 1 — Concept Validation" },
  { label: "Registry Access", value: "Persona-Based Preview" },
  { label: "Endorsement", value: "Pending ZIDA Validation" },
];

export const accessTiers = [
  {
    id: "public",
    label: "Public Visitor",
    description: "Open access to the governed ZIDA catalogue — no account required.",
    features: ["Project titles, sectors & locations", "Opportunity summaries", "Strategic pillar, SDG & beneficiary ministry alignment", "Priority sector briefings"],
    cta: { label: "Browse Registry", href: "/projects" },
  },
  {
    id: "registered",
    label: "Registered Investor",
    description: "Create an investor profile — your first step toward credential-verified, qualified-tier access.",
    features: ["Financing-type filters in the project registry", "Profile on file for qualified-investor credential review"],
    cta: { label: "Register Now", href: "/register" },
    featured: true,
  },
  {
    id: "qualified",
    label: "Qualified Investor",
    description: "Admin-verified investors gain access to full financial figures, gated documents, and direct engagement.",
    features: ["Capital estimates & IRR / NPV / ROI", "Gated documents & investor packs", "Meeting & document requests", "Direct engagement with ZIDA"],
    cta: { label: "Investor Journey", href: "/investor-journey" },
  },
];

export const engagementSteps = [
  {
    step: "01",
    title: "Browse the Registry",
    desc: "Explore the ZIDA 2025 catalogue — sectors, pillars, and projects — with no account required.",
    href: "/projects",
  },
  {
    step: "02",
    title: "Register Your Interest",
    desc: "Create an investor profile to start your credential review and enable registry filtering.",
    href: "/register",
  },
  {
    step: "03",
    title: "Qualify for Deep Access",
    desc: "Verified investors gain access to capital estimates, financial indicators, gated documents, and direct engagement requests.",
    href: "/investor-journey",
  },
  {
    step: "04",
    title: "Engage Strategically",
    desc: "Connect with ZIDA and Afronovation for structured due diligence and partnership discussions.",
    href: "/contact",
  },
];
