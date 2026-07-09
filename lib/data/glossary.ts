/**
 * Small fixed dictionary of common project-finance/institutional acronyms, surfaced in a
 * "Glossary of Terms" sidebar card on the project detail page — purely informational, always
 * public, and immune to empty/sparse states by construction (see `getRelevantGlossaryTerms`).
 */

export interface GlossaryTerm {
  term: string;
  definition: string;
  /** Lowercase keywords matched against project text to decide relevance. */
  keywords: string[];
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: "PPP",
    definition: "Public-Private Partnership — a long-term contract between government and a private investor to jointly deliver a public asset or service.",
    keywords: ["ppp", "public-private", "public private partnership"],
  },
  {
    term: "BOT",
    definition: "Build-Operate-Transfer — a private partner builds and operates an asset for a fixed concession period, then transfers ownership to the state.",
    keywords: ["bot", "build-operate-transfer", "build operate transfer"],
  },
  {
    term: "EPC",
    definition: "Engineering, Procurement and Construction — a contract model where a single contractor delivers a project from design through completion.",
    keywords: ["epc", "engineering, procurement", "engineering procurement"],
  },
  {
    term: "IRR",
    definition: "Internal Rate of Return — the annualized rate of return a project is expected to generate over its lifetime.",
    keywords: ["irr", "internal rate of return"],
  },
  {
    term: "NPV",
    definition: "Net Present Value — the present-day value of a project's future cash flows, net of the initial investment.",
    keywords: ["npv", "net present value"],
  },
  {
    term: "ROI",
    definition: "Return on Investment — net financial return expressed as a percentage of the capital invested.",
    keywords: ["roi", "return on investment"],
  },
  {
    term: "SEZ",
    definition: "Special Economic Zone — a designated area offering preferential tax, customs, and regulatory treatment to attract investment.",
    keywords: ["sez", "special economic zone"],
  },
  {
    term: "DFI",
    definition: "Development Finance Institution — a government-backed or multilateral institution (e.g. IFC, DBSA) that finances development projects.",
    keywords: ["dfi", "development finance institution"],
  },
  {
    term: "MOU",
    definition: "Memorandum of Understanding — a non-binding agreement outlining the intent of parties to collaborate on a project.",
    keywords: ["mou", "memorandum of understanding"],
  },
  {
    term: "FDI",
    definition: "Foreign Direct Investment — capital invested by a foreign entity to establish or expand operations in a domestic market.",
    keywords: ["fdi", "foreign direct investment"],
  },
  {
    term: "PCN",
    definition: "Project Concept Note — an early-stage document outlining a project's rationale, scope, and indicative costs ahead of full appraisal.",
    keywords: ["pcn", "project concept note", "concept note"],
  },
  {
    term: "TA",
    definition: "Technical Assistance — non-financial support (advisory, capacity-building, feasibility studies) provided to prepare a project for investment.",
    keywords: ["ta", "technical assistance", "capacity building", "feasibility"],
  },
];

const DEFAULT_TERMS = ["PPP", "IRR", "NPV", "ROI", "EPC", "BOT"];

interface ProjectLike {
  financingType?: string;
  capitalRequired?: string;
  opportunitySummary?: string;
  scope?: string[];
  irr?: string;
  npv?: string;
  roi?: string;
}

/**
 * Picks the most relevant glossary terms for a given project by scanning its financing/summary/
 * scope text for keyword matches, always prioritizing IRR/NPV/ROI when the corresponding project
 * field is populated (a deliberate conversion hook: "here's what NPV means, register to see the
 * actual number"). Falls back to a fixed default subset if fewer than 4 terms matched, so the
 * sidebar card is never sparse.
 */
export function getRelevantGlossaryTerms(project: ProjectLike, max = 6): GlossaryTerm[] {
  const haystack = [project.financingType, project.capitalRequired, project.opportunitySummary, ...(project.scope ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matched = new Set<string>();

  if (project.irr) matched.add("IRR");
  if (project.npv) matched.add("NPV");
  if (project.roi) matched.add("ROI");

  for (const entry of GLOSSARY_TERMS) {
    if (matched.has(entry.term)) continue;
    if (entry.keywords.some((kw) => haystack.includes(kw))) matched.add(entry.term);
  }

  if (matched.size < 4) {
    for (const term of DEFAULT_TERMS) matched.add(term);
  }

  const ordered = GLOSSARY_TERMS.filter((entry) => matched.has(entry.term));
  return ordered.slice(0, max);
}
