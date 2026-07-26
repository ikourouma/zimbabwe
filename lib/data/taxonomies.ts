import type {
  Agency,
  ContactReason,
  Ministry,
  SDG,
  Sector,
  StrategicPillar,
  Subsector,
  UserRole,
} from "@/lib/types";
import { slugify } from "@/lib/utils";

export const sectors: Sector[] = [
  { id: "sec-health", name: "Health", slug: "health", description: "Healthcare infrastructure and medical services investment opportunities.", status: "active" },
  { id: "sec-agriculture", name: "Agriculture", slug: "agriculture", description: "Agriculture, agro-processing, and food security projects.", status: "active" },
  { id: "sec-ict", name: "ICT", slug: "ict", description: "Digital economy, broadband, and ICT infrastructure projects.", status: "active" },
  { id: "sec-manufacturing", name: "Manufacturing", slug: "manufacturing", description: "Industrialization and value-addition manufacturing projects.", status: "active" },
  { id: "sec-mining", name: "Mining", slug: "mining", description: "Mining, exploration, and resource development opportunities.", status: "active" },
  { id: "sec-infrastructure", name: "Infrastructure", slug: "infrastructure", description: "Housing, urban development, and SEZ infrastructure projects.", status: "active" },
  { id: "sec-renewable-energy", name: "Renewable Energy", shortName: "Energy", slug: "renewable-energy", description: "Solar, biogas, and clean energy transition projects.", status: "active" },
  { id: "sec-tourism-financial", name: "Tourism and Financial Services", shortName: "Tourism & Finance", slug: "tourism-and-financial-services", description: "Tourism SEZ, hospitality, and financial services hub projects.", status: "active" },
];

export const strategicPillars: StrategicPillar[] = [
  {
    id: "pillar-01",
    name: "Investment Attraction & Private Sector Growth",
    slug: "investment-attraction-private-sector-growth",
    description: "Attracting private investment and enabling business growth.",
    strategicMandate: "Mobilize domestic and foreign private capital by strengthening investment facilitation, One-Stop-Shop services, and an enabling regulatory environment for business growth.",
    targetOutcomes: ["Streamline investor facilitation and licensing", "Expand One-Stop Investment Services Centre capacity", "Grow foreign and diaspora direct investment inflows"],
    policyAlignment: { primary: "ZIDA Act [Chapter 14:37] (2019) — One-Stop Investment Services Centre", secondary: "Vision 2030 — Upper-Middle-Income Society by 2030" },
    status: "active",
  },
  {
    id: "pillar-02",
    name: "Industrialization & Value Addition",
    slug: "industrialization-value-addition",
    description: "Industrial development and local value addition.",
    strategicMandate: "Build local manufacturing and value-addition capacity to reduce import dependency and grow export-ready industrial output.",
    targetOutcomes: ["Expand local manufacturing and processing capacity", "Increase share of value-added exports", "Reduce import-substitution gaps in priority goods"],
    policyAlignment: { primary: "NDS1 (2021–2025) — industrialization priority area", secondary: "NDS2 (2026–2030) — structural transformation" },
    status: "active",
  },
  {
    id: "pillar-03",
    name: "Agriculture, Food Security & Agro-Processing",
    slug: "agriculture-food-security-agro-processing",
    description: "Food security and agricultural industrialization.",
    strategicMandate: "Strengthen food security and agricultural value chains through irrigation, agro-processing, and export-oriented farming investment.",
    targetOutcomes: ["Expand irrigated and diversified crop production", "Grow agro-processing and export value chains", "Improve smallholder market inclusion"],
    policyAlignment: { primary: "NDS1 (2021–2025) — food security priority area", secondary: "Vision 2030" },
    status: "active",
  },
  {
    id: "pillar-04",
    name: "Mining, Beneficiation & Resource Development",
    slug: "mining-beneficiation-resource-development",
    description: "Mining sector development and beneficiation.",
    strategicMandate: "Grow mineral beneficiation and downstream value addition to capture more value from Zimbabwe's mineral resource base.",
    targetOutcomes: ["Expand mineral exploration and development", "Grow local beneficiation and downstream processing", "Increase mining-sector export earnings"],
    policyAlignment: { primary: "NDS1 (2021–2025) — mining value-chain priority area", secondary: "Vision 2030" },
    status: "active",
  },
  {
    id: "pillar-05",
    name: "Energy Security & Climate Resilience",
    slug: "energy-security-climate-resilience",
    description: "Energy security, renewable energy transition, and climate resilience.",
    strategicMandate: "Expand renewable generation capacity and climate-resilient infrastructure to secure national energy supply while advancing climate adaptation and mitigation commitments.",
    targetOutcomes: ["Expand renewable generation and grid capacity", "Strengthen climate adaptation and resilience infrastructure", "Reduce carbon intensity of the energy mix"],
    policyAlignment: { primary: "NDS1 / NDS2 — energy and climate resilience priority areas", secondary: "Vision 2030" },
    status: "active",
  },
  {
    id: "pillar-06",
    name: "Digital Infrastructure & Connectivity",
    slug: "digital-infrastructure-connectivity",
    description: "National fibre, broadband, and data-centre infrastructure closing the connectivity divide.",
    strategicMandate: "Build sovereign, resilient digital infrastructure — national fibre backbone, Tier IV data centres, and high-performance compute capacity — closing the urban-rural connectivity divide.",
    targetOutcomes: ["Expand national fibre/broadband coverage", "Deliver Tier IV-standard data centre and compute capacity", "Reduce urban-rural connectivity gap"],
    policyAlignment: { primary: "National ICT Policy 2022–2027 — Infrastructure & Services priority area", secondary: "Zimbabwe National AI Strategy 2026–2030 — Pillar 2: AI Infrastructure & Computational Sovereignty" },
    status: "active",
  },
  {
    id: "pillar-07",
    name: "Digital Economy, e-Government & Cybersecurity",
    slug: "digital-economy-egovernment-cybersecurity",
    description: "E-government service delivery, digital economy adoption, and cybersecurity/data-protection governance.",
    strategicMandate: "Transform public-service delivery and grow the digital economy through e-government platforms, AI adoption, and a trusted cybersecurity/data-protection framework.",
    targetOutcomes: ["Digitize priority government service workflows", "Grow AI-enabled digital economy adoption across sectors", "Strengthen cybersecurity and data-protection governance"],
    policyAlignment: { primary: "National ICT Policy 2022–2027 — E-Government Rollout & Cyber and Data Protection Act", secondary: "Zimbabwe National AI Strategy 2026–2030 — Pillars 3 & 4" },
    status: "active",
  },
  {
    id: "pillar-08",
    name: "Infrastructure, Housing & Urban Development",
    slug: "infrastructure-housing-urban-development",
    description: "Urban regeneration and housing development.",
    strategicMandate: "Expand housing supply and urban infrastructure through public-private partnerships and regeneration of urban centres.",
    targetOutcomes: ["Expand affordable and market-rate housing supply", "Modernize urban infrastructure and utilities", "Grow PPP-financed regeneration projects"],
    policyAlignment: { primary: "NDS1 (2021–2025) — infrastructure and housing priority area", secondary: "Vision 2030" },
    status: "active",
  },
  {
    id: "pillar-09",
    name: "Tourism, Culture & Destination Development",
    slug: "tourism-culture-destination-development",
    description: "Tourism and destination development.",
    strategicMandate: "Grow tourism-sector investment and destination infrastructure to diversify foreign-currency earnings and showcase Zimbabwe's natural and cultural assets.",
    targetOutcomes: ["Expand tourism and hospitality infrastructure", "Grow destination and SEZ-linked tourism investment", "Increase tourism foreign-currency earnings"],
    policyAlignment: { primary: "NDS1 (2021–2025) — tourism priority area", secondary: "Vision 2030" },
    status: "active",
  },
  {
    id: "pillar-10",
    name: "Health, Human Capital & Social Services",
    slug: "health-human-capital-social-services",
    description: "Healthcare and human capital development.",
    strategicMandate: "Expand healthcare infrastructure and human-capital development to improve service delivery and reduce outbound medical/skills dependency.",
    targetOutcomes: ["Expand healthcare infrastructure and capacity", "Strengthen human-capital and workforce development", "Reduce outbound medical travel dependency"],
    policyAlignment: { primary: "NDS1 (2021–2025) — health and human capital priority area", secondary: "Vision 2030" },
    status: "active",
  },
  {
    id: "pillar-11",
    name: "Diaspora, Trade & Global Partnerships",
    slug: "diaspora-trade-global-partnerships",
    description: "Diaspora engagement and global partnerships.",
    strategicMandate: "Mobilize diaspora capital and strengthen global trade partnerships to diversify investment sources and market access.",
    targetOutcomes: ["Grow diaspora direct investment channels", "Expand regional and global trade partnerships", "Strengthen export market diversification"],
    policyAlignment: { primary: "NDS1 / NDS2 — diaspora and trade priority areas", secondary: "Vision 2030" },
    status: "active",
  },
];

export const sdgs: SDG[] = [
  { id: "sdg-1", number: 1, name: "No Poverty", colorToken: "#E5243B", description: "SDG 1: No Poverty" },
  { id: "sdg-2", number: 2, name: "Zero Hunger", colorToken: "#DDA63A", description: "SDG 2: Zero Hunger" },
  { id: "sdg-3", number: 3, name: "Good Health and Well-Being", colorToken: "#4C9F38", description: "SDG 3: Good Health and Well-Being" },
  { id: "sdg-4", number: 4, name: "Quality Education", colorToken: "#C5192D", description: "SDG 4: Quality Education" },
  { id: "sdg-5", number: 5, name: "Gender Equality", colorToken: "#FF3A21", description: "SDG 5: Gender Equality" },
  { id: "sdg-6", number: 6, name: "Clean Water and Sanitation", colorToken: "#26BDE2", description: "SDG 6: Clean Water and Sanitation" },
  { id: "sdg-7", number: 7, name: "Affordable and Clean Energy", colorToken: "#FCC30B", description: "SDG 7: Affordable and Clean Energy" },
  { id: "sdg-8", number: 8, name: "Decent Work and Economic Growth", colorToken: "#A21942", description: "SDG 8: Decent Work and Economic Growth" },
  { id: "sdg-9", number: 9, name: "Industry, Innovation and Infrastructure", colorToken: "#FD6925", description: "SDG 9: Industry, Innovation and Infrastructure" },
  { id: "sdg-10", number: 10, name: "Reduced Inequalities", colorToken: "#DD1367", description: "SDG 10: Reduced Inequalities" },
  { id: "sdg-11", number: 11, name: "Sustainable Cities and Communities", colorToken: "#FD9D24", description: "SDG 11: Sustainable Cities and Communities" },
  { id: "sdg-12", number: 12, name: "Responsible Consumption and Production", colorToken: "#BF8B2E", description: "SDG 12: Responsible Consumption and Production" },
  { id: "sdg-13", number: 13, name: "Climate Action", colorToken: "#3F7E44", description: "SDG 13: Climate Action" },
  { id: "sdg-14", number: 14, name: "Life Below Water", colorToken: "#0A97D9", description: "SDG 14: Life Below Water" },
  { id: "sdg-15", number: 15, name: "Life on Land", colorToken: "#56C02B", description: "SDG 15: Life on Land" },
  { id: "sdg-16", number: 16, name: "Peace, Justice and Strong Institutions", colorToken: "#00689D", description: "SDG 16: Peace, Justice and Strong Institutions" },
  { id: "sdg-17", number: 17, name: "Partnerships for the Goals", colorToken: "#19486A", description: "SDG 17: Partnerships for the Goals" },
];

/** Real, deduplicated Zimbabwean government ministries — super-admin managed (add/edit/remove via
 *  TaxonomyStoreProvider). Names sourced from https://zimembassydc.org/government/ and
 *  https://www.parlzim.gov.zw/ministers/ (illustrative mapping to portfolios — pending formal
 *  ZIDA/government validation). No minister names are stored or displayed anywhere on this
 *  platform, public or gated — only ministry names and, optionally, an illustrative office title
 *  (`representativeTitle`) shown in the Deal Room. ZIDA itself is modeled separately as
 *  `agency-zida` in the `agencies` array below, not duplicated here as a ministry. */
export const ministries: Ministry[] = [
  { id: "min-finance", name: "Ministry of Finance, Economic Development and Investment Promotion", shortName: "Finance", type: "beneficiary", status: "pending_validation" },
  { id: "min-industry", name: "Ministry of Industry and Commerce", shortName: "Industry & Commerce", type: "beneficiary", status: "pending_validation" },
  { id: "min-agriculture", name: "Ministry of Lands, Agriculture, Fisheries, Water and Rural Resettlement", shortName: "Agriculture", type: "beneficiary", status: "pending_validation" },
  { id: "min-mining", name: "Ministry of Mines and Mining Development", shortName: "Mines & Mining", type: "beneficiary", status: "pending_validation" },
  { id: "min-ict", name: "Ministry of Information Communication Technology, Postal and Courier Services", shortName: "ICT", type: "beneficiary", status: "pending_validation" },
  { id: "min-energy", name: "Ministry of Energy and Power Development", shortName: "Energy", type: "beneficiary", status: "pending_validation" },
  { id: "min-environment", name: "Ministry of Environment, Climate and Wildlife", shortName: "Environment & Climate", type: "beneficiary", status: "pending_validation" },
  { id: "min-transport", name: "Ministry of Transport and Infrastructural Development", shortName: "Transport & Infrastructure", type: "beneficiary", status: "pending_validation" },
  { id: "min-housing", name: "Ministry of National Housing and Social Amenities", shortName: "Housing", type: "beneficiary", status: "pending_validation" },
  { id: "min-tourism", name: "Ministry of Tourism and Hospitality Industry", shortName: "Tourism", type: "beneficiary", status: "pending_validation" },
  { id: "min-health", name: "Ministry of Health and Child Care", shortName: "Health", type: "beneficiary", status: "pending_validation" },
  { id: "min-foreign-affairs", name: "Ministry of Foreign Affairs and International Trade", shortName: "Foreign Affairs & Trade", type: "beneficiary", status: "pending_validation" },
];

/** Canonical province registry — super-admin managed (see TaxonomyStoreProvider), independent of the
 *  free-text `province` field on individual seed projects, which still needs a manual data-cleanup pass. */
export const provinces: string[] = [
  "Bulawayo",
  "Harare",
  "Manicaland",
  "Mashonaland Central",
  "Mashonaland East",
  "Mashonaland West",
  "Masvingo",
  "Matabeleland North",
  "Matabeleland South",
  "Midlands",
];

export const agencies: Agency[] = [
  { id: "agency-zida", name: "Zimbabwe Investment and Development Agency (ZIDA)", type: "agency", status: "active" },
  { id: "agency-telone", name: "TelOne (Pvt) Ltd", type: "parastatal", status: "active" },
  { id: "agency-sirdc", name: "Scientific and Industrial Research & Development Centre (SIRDC)", type: "agency", status: "active" },
  { id: "agency-nrz", name: "National Railways of Zimbabwe", type: "parastatal", status: "active" },
  { id: "agency-zetdc", name: "Zimbabwe Electricity Transmission and Distribution Company (ZETDC)", type: "regulator", parentMinistryId: "min-energy", status: "active" },
];

export const contactReasons: ContactReason[] = [
  { id: "cr-01", label: "Investment Opportunity", routingCategory: "investment", status: "active" },
  { id: "cr-02", label: "Project Partnership", routingCategory: "partnership", status: "active" },
  { id: "cr-03", label: "Government / Institutional Inquiry", routingCategory: "government", status: "active" },
  { id: "cr-04", label: "Diaspora Investment", routingCategory: "diaspora", status: "active" },
  { id: "cr-05", label: "Development Finance / DFI Inquiry", routingCategory: "dfi", status: "active" },
  { id: "cr-06", label: "Technical Partnership", routingCategory: "technical", status: "active" },
  { id: "cr-07", label: "Tourism / Destination Inquiry", routingCategory: "tourism", status: "active" },
  { id: "cr-08", label: "Media / Press", routingCategory: "media", status: "active" },
  { id: "cr-09", label: "General Question", routingCategory: "general", status: "active" },
  { id: "cr-10", label: "Other", routingCategory: "other", status: "active" },
  // Routes straight to the Super Admin Inquiries inbox (app/super-admin/inquiries) rather than the
  // shared ZIDA admin queue — for board-level, platform-governance, or executive-escalation
  // matters that specifically need the platform owner (Afronovation), not ZIDA staff.
  { id: "cr-11", label: "Platform / Executive Escalation", routingCategory: "executive", status: "active" },
];

export const userRoles: UserRole[] = [
  { id: "role-public", name: "Public Visitor", permissions: ["view_public"], scope: "tenant" },
  { id: "role-registered", name: "Registered Investor", permissions: ["view_public", "view_registered"], scope: "tenant" },
  { id: "role-qualified", name: "Qualified Investor / Strategic Partner", permissions: ["view_public", "view_registered", "view_qualified", "request_documents"], scope: "tenant" },
  { id: "role-diaspora", name: "Diaspora Investor", permissions: ["view_public", "view_registered"], scope: "tenant" },
  { id: "role-owner", name: "Project Owner", permissions: ["view_public", "edit_own_projects"], scope: "institutional" },
  { id: "role-zida-admin", name: "ZIDA / Investment Authority Admin", permissions: ["view_public", "view_registered", "create_projects", "submit_review", "manage_inquiries"], scope: "institutional" },
  { id: "role-ministry", name: "Beneficiary Ministry User", permissions: ["view_public", "view_registered", "view_ministry_projects"], scope: "institutional" },
  { id: "role-embassy", name: "Embassy Investment Desk User", permissions: ["view_public", "view_registered"], scope: "institutional" },
  { id: "role-platform-mgr", name: "Afronovation Platform Manager", permissions: ["view_all", "manage_taxonomies", "view_analytics"], scope: "platform" },
  { id: "role-super-admin", name: "Afronovation Super Admin", permissions: ["view_all", "manage_taxonomies", "manage_users", "override_publishing", "view_analytics"], scope: "platform" },
];

const subsectorDefs: { sectorId: string; name: string }[] = [
  { sectorId: "sec-health", name: "Healthcare Infrastructure" },
  { sectorId: "sec-agriculture", name: "Livestock and Dairy" },
  { sectorId: "sec-agriculture", name: "Agro-Processing / Special Economic Zone" },
  { sectorId: "sec-agriculture", name: "Crop Production / Irrigation / Diversified Farming" },
  { sectorId: "sec-agriculture", name: "Tree Crops / Export Agriculture" },
  { sectorId: "sec-agriculture", name: "Coffee / Specialty Agriculture" },
  { sectorId: "sec-agriculture", name: "Beef Feedlot / Livestock" },
  { sectorId: "sec-ict", name: "Broadband Infrastructure / Fibre" },
  { sectorId: "sec-ict", name: "Broadband Infrastructure / Last-Mile Connectivity" },
  { sectorId: "sec-ict", name: "Wireless Broadband / Rural Connectivity" },
  { sectorId: "sec-ict", name: "Data Centres / Cloud Infrastructure" },
  { sectorId: "sec-manufacturing", name: "Consumer Goods / Soap and Detergents" },
  { sectorId: "sec-manufacturing", name: "Railway Materials / Concrete Sleepers" },
  { sectorId: "sec-manufacturing", name: "Solar Manufacturing / Building Materials" },
  { sectorId: "sec-manufacturing", name: "Biomanufacturing / Animal Health" },
  { sectorId: "sec-manufacturing", name: "Fertilizer / Industrial Chemicals" },
  { sectorId: "sec-manufacturing", name: "Foundry / Metal Fabrication" },
  { sectorId: "sec-mining", name: "Gold Mining / Exploration" },
  { sectorId: "sec-mining", name: "Gold Exploration" },
  { sectorId: "sec-infrastructure", name: "Housing / Urban Regeneration" },
  { sectorId: "sec-infrastructure", name: "High-Tech Park / SEZ / Innovation Infrastructure" },
  { sectorId: "sec-renewable-energy", name: "Solar Power-as-a-Service / Mini-Grids" },
  { sectorId: "sec-renewable-energy", name: "Solar PV Expansion" },
  { sectorId: "sec-renewable-energy", name: "Biogas / Clean Cooking / Rural Energy" },
  { sectorId: "sec-renewable-energy", name: "Solar PV / Battery Storage / Green Hydrogen / AI Data Centre" },
  { sectorId: "sec-renewable-energy", name: "Utility-Scale Solar PV" },
  { sectorId: "sec-tourism-financial", name: "Tourism SEZ / Hospitality / Financial Services Hub" },
];

export const subsectors: Subsector[] = subsectorDefs.map((s, i) => ({
  id: `sub-${i + 1}`,
  sectorId: s.sectorId,
  name: s.name,
  slug: slugify(s.name),
  status: "active" as const,
}));

export function getSectorById(id: string) {
  return sectors.find((s) => s.id === id);
}

/** Compact single-line label for badges/chips — falls back to the full sector name. */
export function getSectorDisplayName(sector?: Sector) {
  return sector?.shortName ?? sector?.name;
}

export function getSectorBySlug(slug: string) {
  return sectors.find((s) => s.slug === slug);
}

export function getSubsectorById(id: string) {
  return subsectors.find((s) => s.id === id);
}

export function getSubsectorByName(sectorId: string, name: string) {
  return subsectors.find((s) => s.sectorId === sectorId && s.name === name);
}

export function getPillarById(id: string) {
  return strategicPillars.find((p) => p.id === id);
}

export function getPillarByName(name: string) {
  return strategicPillars.find((p) => p.name === name);
}

export function getSdgById(id: string) {
  return sdgs.find((s) => s.id === id);
}

export function getSdgByLabel(label: string) {
  const match = label.match(/^SDG (\d+):/);
  if (!match) return undefined;
  return sdgs.find((s) => s.number === parseInt(match[1], 10));
}

export function getMinistryById(id: string) {
  return ministries.find((m) => m.id === id);
}

export function getMinistryByName(name: string) {
  return ministries.find((m) => m.name === name);
}

export function getContactReasonById(id: string) {
  return contactReasons.find((c) => c.id === id);
}

export function getRoleById(id: string) {
  return userRoles.find((r) => r.id === id);
}
