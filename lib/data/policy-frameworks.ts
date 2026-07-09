/** Real, publicly available Zimbabwean national policy/strategy documents, used to give the
 *  strategic pillars an authentic policy-alignment footing. Mapping from pillar -> document is
 *  illustrative (curated by this platform, not an official ZIDA/government cross-reference) —
 *  see POLICY_ALIGNMENT_DISCLAIMER, reused everywhere this data is surfaced. */
export interface NationalPolicyFramework {
  id: string;
  name: string;
  shortName: string;
  dateRange: string;
  description: string;
  issuingAuthority: string;
}

export const POLICY_ALIGNMENT_DISCLAIMER =
  "Illustrative mapping to publicly available national frameworks — pending formal ZIDA/government validation.";

export const nationalPolicyFrameworks: NationalPolicyFramework[] = [
  {
    id: "policy-vision-2030",
    name: "Vision 2030 — Towards a Prosperous & Empowered Upper-Middle-Income Society",
    shortName: "Vision 2030",
    dateRange: "2018–2030",
    description: "Zimbabwe's long-term national aspiration to reach upper-middle-income status by 2030, anchoring all medium-term national development strategies.",
    issuingAuthority: "Government of Zimbabwe",
  },
  {
    id: "policy-nds1",
    name: "National Development Strategy 1 (NDS1)",
    shortName: "NDS1 (2021–2025)",
    dateRange: "2021–2025",
    description: "The first 5-year medium-term plan implementing Vision 2030, covering growth, infrastructure, and social-development priority areas.",
    issuingAuthority: "Ministry of Finance, Economic Development and Investment Promotion",
  },
  {
    id: "policy-nds2",
    name: "National Development Strategy 2 (NDS2)",
    shortName: "NDS2 (2026–2030)",
    dateRange: "2026–2030",
    description: "The successor medium-term plan to NDS1, carrying Zimbabwe's development priorities through to the 2030 Vision horizon.",
    issuingAuthority: "Ministry of Finance, Economic Development and Investment Promotion",
  },
  {
    id: "policy-zida-act",
    name: "Zimbabwe Investment and Development Agency Act [Chapter 14:37]",
    shortName: "ZIDA Act (2019)",
    dateRange: "2019",
    description: "Establishes ZIDA and the One-Stop Investment Services Centre, the statutory foundation for investment facilitation referenced throughout this platform.",
    issuingAuthority: "Parliament of Zimbabwe",
  },
  {
    id: "policy-ict",
    name: "National ICT Policy",
    shortName: "National ICT Policy (2022–2027)",
    dateRange: "2022–2027",
    description: "Zimbabwe's digital-transformation policy framework covering ICT infrastructure, e-government, digital inclusion, and cybersecurity/data protection.",
    issuingAuthority: "Ministry of Information Communication Technology, Postal and Courier Services",
  },
  {
    id: "policy-ai-strategy",
    name: "Zimbabwe National Artificial Intelligence Strategy",
    shortName: "National AI Strategy (2026–2030)",
    dateRange: "2026–2030",
    description: "Zimbabwe's sovereign AI framework — talent & capacity, infrastructure & computational sovereignty, adoption & service transformation, and governance/ethics/regulatory pillars — aligned to Vision 2030, NDS, and the National ICT Policy.",
    issuingAuthority: "Ministry of Information Communication Technology, Postal and Courier Services",
  },
];

export function getPolicyFrameworkById(id: string) {
  return nationalPolicyFrameworks.find((p) => p.id === id);
}
