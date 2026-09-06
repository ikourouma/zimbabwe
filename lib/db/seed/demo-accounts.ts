import type { AccountRole } from "@/lib/auth/types";

/**
 * Stakeholder demo roster — the accounts ZIDA and government reviewers sign into while working
 * through docs/walkthrough/. Deliberately separate from PILOT_ACCOUNTS in ./accounts.ts: the
 * `+pilot` set is wired into e2e/roles.ts, the cleanup allowlist and the entitlement specs, so
 * giving stakeholders their own `+demo` set means a stakeholder mid-walkthrough can never
 * collide with automation, and the whole demo cohort can be retired on one email suffix.
 *
 * Naming rule, chosen so a tester can guess an address without knowing role names:
 *   <org>.admin  — runs the org        (maps to `admin`, `ministry_admin` or `super_admin`)
 *   <org>.team   — works in the org    (maps to `government` or `qualified`)
 */

/** The five institutional KYC columns isKycComplete() checks (lib/db/queries/users.ts), plus the
 *  named signatory used to prepopulate "Propose a Project". `organization` lives on the account
 *  itself since it doubles as the display name in the user directory. */
export type DemoKyc = {
  phone: string;
  hqAddress: string;
  businessRegistrationId: string;
  websiteUrl: string;
  executiveRepresentativeName: string;
  executiveRepresentativeTitle: string;
};

export type DemoAccount = {
  email: string;
  role: AccountRole;
  name: string;
  jobTitle: string;
  /** One-line purpose, shared by docs/DEMO_ACCOUNTS.md and the .env.local reference block so the
   *  two can never drift. */
  description: string;
  ministryId?: string;
  organization: string | null;
  /** `null` means deliberately left incomplete. Only registered+demo uses it: the qualification
   *  walkthrough is worthless if the profile it asks you to complete is already complete. */
  kyc: DemoKyc | null;
};

const ZIDA = "Zimbabwe Investment and Development Agency";

const MINISTRY_NAMES: Record<string, string> = {
  "min-ict": "Ministry of Information Communication Technology, Postal and Courier Services",
  "min-agriculture": "Ministry of Lands, Agriculture, Fisheries, Water and Rural Resettlement",
  "min-energy": "Ministry of Energy and Power Development",
  "min-industry": "Ministry of Industry and Commerce",
};

/** Per-ministry contact block. Addresses are the real Harare government buildings each ministry
 *  occupies, so screenshots read as plausible to a Zimbabwean reviewer. */
const MINISTRY_CONTACT: Record<
  string,
  { phone: string; hqAddress: string; registrationId: string; websiteUrl: string }
> = {
  "min-ict": {
    phone: "+263 242 700 016",
    hqAddress: "Livingstone House, 48 Samora Machel Avenue, Harare, Zimbabwe",
    registrationId: "GVT-ZW-ICT-0142",
    websiteUrl: "https://www.ictministry.gov.zw",
  },
  "min-agriculture": {
    phone: "+263 242 706 081",
    hqAddress: "Ngungunyana Building, 1 Borrowdale Road, Harare, Zimbabwe",
    registrationId: "GVT-ZW-AGR-0071",
    websiteUrl: "https://www.lands.gov.zw",
  },
  "min-energy": {
    phone: "+263 242 704 861",
    hqAddress: "Chaminuka Building, 5 Central Avenue, Harare, Zimbabwe",
    registrationId: "GVT-ZW-ENG-0093",
    websiteUrl: "https://www.energy.gov.zw",
  },
  "min-industry": {
    phone: "+263 242 702 731",
    hqAddress: "Mukwati Building, Corner Fourth Street and Livingstone Avenue, Harare, Zimbabwe",
    registrationId: "GVT-ZW-IND-0058",
    websiteUrl: "https://www.miic.gov.zw",
  },
};

function ministryKyc(ministryId: string, repName: string, repTitle: string): DemoKyc {
  const contact = MINISTRY_CONTACT[ministryId];
  if (!contact) throw new Error(`No contact block defined for ministry ${ministryId}`);
  return {
    phone: contact.phone,
    hqAddress: contact.hqAddress,
    businessRegistrationId: contact.registrationId,
    websiteUrl: contact.websiteUrl,
    executiveRepresentativeName: repName,
    executiveRepresentativeTitle: repTitle,
  };
}

/** ZIDA's own establishing instrument — the Zimbabwe Investment and Development Agency Act, 2019
 *  (No. 10 of 2019) — used where a company would carry a registration number. */
function zidaKyc(repName: string, repTitle: string): DemoKyc {
  return {
    phone: "+263 242 780 172",
    hqAddress: "ZB Life Towers, 77 Jason Moyo Avenue, Harare, Zimbabwe",
    businessRegistrationId: "ZIDA-ACT-2019-10",
    websiteUrl: "https://www.zidazim.co.zw",
    executiveRepresentativeName: repName,
    executiveRepresentativeTitle: repTitle,
  };
}

/** The investing organisation shared by qualified+demo and its two team members. Held in one
 *  place because the "My Team" panel is incoherent if the three rows disagree on the company. */
export const DEMO_INVESTOR_ORG = "Zambezi Growth Partners";

function investorKyc(repName: string, repTitle: string, phone: string): DemoKyc {
  return {
    phone,
    hqAddress: "1201 Wilson Boulevard, Suite 400, Arlington, Virginia 22209, United States",
    businessRegistrationId: "DE-7742119",
    websiteUrl: "https://www.zambezigrowth.com",
    executiveRepresentativeName: repName,
    executiveRepresentativeTitle: repTitle,
  };
}

/** Three accounts per ministry: two scoped Ministry Officials and one national reviewer who is
 *  affiliated with the ministry but, being `government`, sees the whole country. Having both in
 *  every ministry is what lets a stakeholder observe the boundary and the national view in one
 *  session instead of taking either on trust. */
function ministryTrio(
  ministryId: string,
  people: { primary: string; deputy: string; officer: string },
): DemoAccount[] {
  const label = MINISTRY_NAMES[ministryId];
  if (!label) throw new Error(`No display name defined for ministry ${ministryId}`);
  return [
    {
      email: `${ministryId}.admin+demo@zidaproject.com`,
      role: "ministry_admin",
      name: people.primary,
      jobTitle: "Director, Investment Coordination",
      description: `${label} — primary Ministry Official`,
      ministryId,
      organization: label,
      kyc: ministryKyc(ministryId, people.primary, "Director, Investment Coordination"),
    },
    {
      email: `${ministryId}.admin2+demo@zidaproject.com`,
      role: "ministry_admin",
      name: people.deputy,
      jobTitle: "Deputy Director, Investment Coordination",
      description: `${label} — peer Ministry Official (multi-admin case)`,
      ministryId,
      organization: label,
      kyc: ministryKyc(ministryId, people.deputy, "Deputy Director, Investment Coordination"),
    },
    {
      email: `${ministryId}.team+demo@zidaproject.com`,
      role: "government",
      name: people.officer,
      jobTitle: "Senior Projects Officer",
      description: `Platform-wide reviewer affiliated with ${label}`,
      ministryId,
      organization: label,
      kyc: ministryKyc(ministryId, people.officer, "Senior Projects Officer"),
    },
  ];
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  // --- Investors -----------------------------------------------------------------------------
  {
    email: "registered+demo@zidaproject.com",
    role: "registered",
    name: "Daniel Okoro",
    jobTitle: "Investment Manager",
    description:
      "Newly self-registered investor, pre-verification — the qualification walkthrough starts here",
    organization: "Sable Ridge Ventures",
    // Intentionally null. Every other account is verification-complete so approvals can be
    // demonstrated; this one is left incomplete so "complete your profile, then apply" is a real
    // journey rather than a form that is already filled in.
    kyc: null,
  },
  {
    email: "qualified+demo@zidaproject.com",
    role: "qualified",
    name: "Grace Mutindi",
    jobTitle: "Managing Partner",
    description: 'Vetted investor and owner of the organisation team — the "My Team" persona',
    organization: DEMO_INVESTOR_ORG,
    kyc: investorKyc("Grace Mutindi", "Managing Partner", "+1 703 555 0142"),
  },
  {
    email: "qualified.team+demo@zidaproject.com",
    role: "qualified",
    name: "Peter Lindqvist",
    jobTitle: "Portfolio Director",
    description: `Vetted investor, team member under ${DEMO_INVESTOR_ORG}`,
    organization: DEMO_INVESTOR_ORG,
    kyc: investorKyc("Peter Lindqvist", "Portfolio Director", "+1 703 555 0143"),
  },
  {
    email: "qualified.team2+demo@zidaproject.com",
    role: "qualified",
    name: "Aisha Bello",
    jobTitle: "Investment Associate",
    description: `Vetted investor, team member under ${DEMO_INVESTOR_ORG}`,
    organization: DEMO_INVESTOR_ORG,
    kyc: investorKyc("Aisha Bello", "Investment Associate", "+1 703 555 0144"),
  },

  // --- ZIDA ----------------------------------------------------------------------------------
  // No ministryId, and that is deliberate. On a `government` account ministryId is a scope, not a
  // label: app/api/projects/[id]/amendment-request/route.ts confines the reviewer to that
  // ministry's projects and routes the request to that ministry's admin. ZIDA is not a line
  // ministry, so an empty value is the accurate one — these two review nationally. Amendment and
  // association requests are demonstrated by the four min-*.team+demo accounts instead.
  {
    email: "zida.team+demo@zidaproject.com",
    role: "government",
    name: "Tafadzwa Mutasa",
    jobTitle: "Investment Promotion Officer",
    description: "ZIDA desk reviewer — national scope, no ministry affiliation",
    organization: ZIDA,
    kyc: zidaKyc("Tafadzwa Mutasa", "Investment Promotion Officer"),
  },
  {
    email: "zida.team2+demo@zidaproject.com",
    role: "government",
    name: "Rumbidzai Nyoni",
    jobTitle: "Project Appraisal Officer",
    description: "ZIDA desk reviewer — national scope, no ministry affiliation",
    organization: ZIDA,
    kyc: zidaKyc("Rumbidzai Nyoni", "Project Appraisal Officer"),
  },
  {
    email: "zida.admin+demo@zidaproject.com",
    role: "admin",
    name: "Farai Chigumba",
    jobTitle: "Head of Investment Facilitation",
    description: "ZIDA console admin — publishes projects and accredits investors",
    organization: ZIDA,
    kyc: zidaKyc("Farai Chigumba", "Head of Investment Facilitation"),
  },
  {
    email: "super.admin+demo@zidaproject.com",
    role: "super_admin",
    name: "Amara Sesay",
    jobTitle: "Platform Operations Manager",
    description:
      "Platform owner (Afronovation) — configuration, taxonomies, entitlements, override",
    organization: "Afronovation, Inc.",
    kyc: {
      phone: "+1 844 664 4247",
      hqAddress: "Cary, North Carolina, United States",
      businessRegistrationId: "NC-2114887",
      websiteUrl: "https://www.afronovation.com",
      executiveRepresentativeName: "Amara Sesay",
      executiveRepresentativeTitle: "Platform Operations Manager",
    },
  },

  // --- Ministries ----------------------------------------------------------------------------
  ...ministryTrio("min-ict", {
    primary: "Tapiwa Zvobgo",
    deputy: "Chiedza Mabhena",
    officer: "Blessing Chirwa",
  }),
  ...ministryTrio("min-agriculture", {
    primary: "Nyasha Gwenzi",
    deputy: "Rudo Masuku",
    officer: "Tinashe Mhaka",
  }),
  ...ministryTrio("min-energy", {
    primary: "Simbarashe Ncube",
    deputy: "Memory Sibanda",
    officer: "Takudzwa Moyo",
  }),
  ...ministryTrio("min-industry", {
    primary: "Panashe Dube",
    deputy: "Vimbai Chihota",
    officer: "Munyaradzi Bere",
  }),
];

/** A pending investor application waiting in the review queue, plus the `registered` account
 *  behind it. These are queue depth for the approval walkthrough, not personas anyone signs in
 *  as: several stakeholders each need something to approve, and the first approver would
 *  otherwise empty the queue for everyone after them.
 *
 *  Field values are constrained to what the wizard actually offers (see `investorTypes` and
 *  `ticketSizeRanges` in components/strategic-partnerships/engagement-wizard.tsx) so a seeded
 *  application is indistinguishable from a hand-submitted one. */
export type DemoApplicant = {
  account: DemoAccount;
  application: {
    investorType: string;
    sectorIds: string[];
    ticketSizeRange: string;
    message: string;
  };
};

function applicant(
  slug: string,
  name: string,
  org: string,
  jobTitle: string,
  kyc: Omit<DemoKyc, "executiveRepresentativeName" | "executiveRepresentativeTitle">,
  application: DemoApplicant["application"],
): DemoApplicant {
  return {
    account: {
      email: `${slug}+demo@zidaproject.com`,
      role: "registered",
      name,
      jobTitle,
      description: `Pending investor application from ${org} — queue depth for the approval walkthrough`,
      organization: org,
      kyc: {
        ...kyc,
        executiveRepresentativeName: name,
        executiveRepresentativeTitle: jobTitle,
      },
    },
    application,
  };
}

export const DEMO_APPLICANTS: DemoApplicant[] = [
  applicant(
    "applicant1",
    "Sandile Nkomo",
    "Meridian Frontier Capital",
    "Head of Africa Investments",
    {
      phone: "+27 11 555 0188",
      hqAddress: "155 West Street, Sandton, Johannesburg 2196, South Africa",
      businessRegistrationId: "ZA-2016/447281/07",
      websiteUrl: "https://www.meridianfrontier.com",
    },
    {
      investorType: "Institutional Investor",
      sectorIds: ["sec-renewable-energy"],
      ticketSizeRange: "$5M–$25M",
      message:
        "We are seeking utility-scale solar and hydro opportunities in Zimbabwe with a view to a 15-year hold. We would like access to feasibility documentation and an introduction to the relevant ministry desk.",
    },
  ),
  applicant(
    "applicant2",
    "Chen Wei",
    "Pacific Rim Infrastructure Group",
    "Director, Project Finance",
    {
      phone: "+65 6555 0114",
      hqAddress: "8 Marina Boulevard, Level 32, Singapore 018981",
      businessRegistrationId: "SG-201731884K",
      websiteUrl: "https://www.pacrim-infra.com",
    },
    {
      investorType: "Strategic Partner",
      sectorIds: ["sec-infrastructure", "sec-mining"],
      ticketSizeRange: "$25M+",
      message:
        "We are evaluating corridor infrastructure and beneficiation projects under a PPP structure, and would like to understand the concession framework and current readiness levels before committing to a site visit.",
    },
  ),
  applicant(
    "applicant3",
    "Lerato Dlamini",
    "Ubuntu AgriFund",
    "Managing Director",
    {
      phone: "+263 242 555 0136",
      hqAddress: "Block C, Arundel Office Park, Norfolk Road, Harare, Zimbabwe",
      businessRegistrationId: "ZW-CR-8841-2021",
      websiteUrl: "https://www.ubuntuagrifund.co.zw",
    },
    {
      investorType: "Development Finance Institution",
      sectorIds: ["sec-agriculture"],
      ticketSizeRange: "$1M–$5M",
      message:
        "We finance agro-processing and irrigation schemes with a smallholder outgrower component. We would like to review the agriculture pipeline and discuss blended-finance structures with the ministry.",
    },
  ),
];

/** Organisation team membership, stored in `org_invites` as owner -> invited with status
 *  `active`. Setting role alone is not enough: without these rows the three qualified accounts
 *  are unrelated investors and the "My Team" panel renders empty. */
export const DEMO_TEAM_LINKS: { ownerEmail: string; memberEmail: string }[] = [
  {
    ownerEmail: "qualified+demo@zidaproject.com",
    memberEmail: "qualified.team+demo@zidaproject.com",
  },
  {
    ownerEmail: "qualified+demo@zidaproject.com",
    memberEmail: "qualified.team2+demo@zidaproject.com",
  },
];

/** Demo accounts share the pilot password by default, but read their own variable first so the
 *  two cohorts can be rotated independently without one locking the other out. */
export function demoPassword(): string {
  const password = process.env.DEMO_ACCOUNT_PASSWORD ?? process.env.PILOT_ACCOUNT_PASSWORD;
  if (!password) {
    throw new Error(
      "Set DEMO_ACCOUNT_PASSWORD or PILOT_ACCOUNT_PASSWORD before seeding demo accounts",
    );
  }
  return password;
}

export function isDemoEmail(email: string): boolean {
  return email.includes("+demo@");
}
