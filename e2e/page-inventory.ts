/**
 * Every page each persona can reach, with the caption used in their walkthrough guide.
 *
 * Shared by the screenshot capture pass and the document generator so a guide can never reference
 * an image that was never captured, and a captured image is never left out of a guide.
 *
 * `slug` becomes the screenshot filename. `caption` is stakeholder-facing prose, not a nav label â€”
 * it answers "what am I looking at and why would I come here", which is what the guides need.
 */

export interface PageEntry {
  slug: string;
  path: string;
  title: string;
  caption: string;
  /**
   * A taller viewport for this page only, in pixels.
   *
   * Set it where the default 800px cuts a page off somewhere that makes the image contradict
   * itself. The activity and executive report pages are the case that prompted it: each opens with
   * a summary block and then a table of the rows behind it, so at 800px the summary announced five
   * engagements above a table showing two, with a third sliced through the middle at the fold. A
   * reader sees a report disagreeing with its own headline. Left off elsewhere, since a viewport
   * capture is the honest picture of what a reader meets on arrival.
   */
  viewportHeight?: number;
}

/** Unauthenticated. The concept note's Public Visitor persona. */
export const PUBLIC_PAGES: PageEntry[] = [
  { slug: "home", path: "/", title: "Home", caption: "The public entry point, summarising Zimbabwe's investment opportunity and the governed workflow behind every published project." },
  { slug: "opportunity", path: "/opportunity", title: "National Opportunity", caption: "Why Zimbabwe, why now, and the case for a governed digital investment catalogue." },
  { slug: "platform", path: "/platform", title: "Platform Concept", caption: "How the registry, governance workflow and entitlement tiers fit together." },
  { slug: "strategic-alignment", path: "/strategic-alignment", title: "Strategic Pillars", caption: "The national transformation pillars each project is classified against." },
  { slug: "sectors", path: "/sectors", title: "Priority Sectors", caption: "Economic sectors with their associated project pipelines." },
  { slug: "projects", path: "/projects", title: "Project Registry", caption: "The searchable catalogue of published opportunities. Financial indicators are withheld at this tier." },
  { slug: "investor-journey", path: "/investor-journey", title: "Investor Journey", caption: "The four-step pathway from browsing the registry to strategic engagement." },
  { slug: "strategic-partnerships", path: "/strategic-partnerships", title: "Strategic Partnerships", caption: "The gateway where an institutional investor or partner submits a qualification application." },
  { slug: "zimbabwe", path: "/zimbabwe", title: "National Profile", caption: "Country overview and macroeconomic context." },
  { slug: "contact", path: "/contact", title: "Contact", caption: "General enquiries, with a reason-for-contact field that drives routing and segmentation." },
  { slug: "faq", path: "/faq", title: "FAQs", caption: "Common questions about access tiers, qualification and the platform's governance model." },
  { slug: "about-afronovation", path: "/about-afronovation", title: "Afronovation", caption: "The implementation partner and platform owner." },
  { slug: "sign-in", path: "/auth/sign-in", title: "Sign In", caption: "Where every persona begins. The destination after signing in depends on the account's role." },
  { slug: "sign-up", path: "/auth/sign-up", title: "Create Account", caption: "Self-registration, which creates a Registered Investor account." },
  { slug: "legal", path: "/legal", title: "Legal", caption: "Privacy policy, terms of service and cookie policy." },
];

/** Investor Dashboard pages available to every authenticated non-staff role. */
const DEAL_ROOM_BASE: PageEntry[] = [
  { slug: "overview", path: "/deal-room", title: "Overview", caption: "The console landing page: activity, engagement funnel, and next steps toward qualification." },
  { slug: "pipeline", path: "/deal-room/pipeline", title: "Pipeline", caption: "The national project registry with filtering, presented as board, list, table or matrix." },
  { slug: "saved", path: "/deal-room/saved", title: "Saved Projects", caption: "Projects bookmarked for later review." },
  { slug: "vault", path: "/deal-room/vault", title: "Document Vault", caption: "Personal document store: non-disclosure certificate, accreditation records and memorandum snapshots." },
  { slug: "reports", path: "/deal-room/reports", title: "My Activity Report", caption: "A personal record of registry and engagement activity.", viewportHeight: 1600 },
  { slug: "profile", path: "/deal-room/profile", title: "My Profile", caption: "Organisation and verification details. Completing these is a precondition of qualification." },
  { slug: "settings", path: "/deal-room/settings", title: "Account", caption: "Account and security settings." },
];

/** Unlocked only once an account reaches the qualified tier. */
const DEAL_ROOM_QUALIFIED_ONLY: PageEntry[] = [
  { slug: "proposals", path: "/deal-room/proposals", title: "My Proposals", caption: "Projects this account has proposed, and their position in the review workflow." },
  { slug: "engagements", path: "/deal-room/engagements", title: "Engagements", caption: "Formal engagements raised against projects, from draft through to approval." },
  { slug: "mou", path: "/deal-room/mou", title: "MOU Registry", caption: "Memoranda of understanding across engagements, with their current status." },
  { slug: "communication", path: "/deal-room/communication", title: "Communication Hub", caption: "Message threads with the investment authority and ministry stakeholders." },
];

export const REGISTERED_PAGES: PageEntry[] = DEAL_ROOM_BASE;

export const QUALIFIED_PAGES: PageEntry[] = [
  ...DEAL_ROOM_BASE,
  ...DEAL_ROOM_QUALIFIED_ONLY,
  { slug: "teams", path: "/deal-room/teams", title: "Team", caption: "Colleagues invited to act on this organisation's behalf." },
];

/** Government reviewers share the Investor Dashboard but the shell is badged as a reviewer console. */
export const GOVERNMENT_PAGES: PageEntry[] = [...DEAL_ROOM_BASE, ...DEAL_ROOM_QUALIFIED_ONLY];

export const MINISTRY_PAGES: PageEntry[] = [
  { slug: "overview", path: "/ministry", title: "Overview", caption: "Ministry-scoped landing page: pipeline health and recent activity for this ministry only." },
  { slug: "projects", path: "/ministry/projects", title: "Ministry Pipeline", caption: "Projects where this ministry is the beneficiary. Projects of other ministries are not visible." },
  { slug: "review", path: "/ministry/review", title: "Review Queue", caption: "Submissions awaiting ministry validation, plus pending amendment requests." },
  { slug: "engagements", path: "/ministry/engagements", title: "Engagements", caption: "Investor engagements on this ministry's projects, read-only." },
  { slug: "mou", path: "/ministry/mou", title: "MOU Registry", caption: "Memoranda involving this ministry's projects." },
  { slug: "inquiries", path: "/ministry/inquiries", title: "Inquiries", caption: "Enquiries linked to this ministry's projects." },
  { slug: "communication", path: "/ministry/communication", title: "Communication Hub", caption: "Message threads on this ministry's projects." },
  { slug: "users", path: "/ministry/users", title: "Users & Roles", caption: "Government staff accounts belonging to this ministry." },
  { slug: "teams", path: "/ministry/teams", title: "Team", caption: "Ministry team invitations and roster." },
  { slug: "reports", path: "/ministry/reports", title: "Reports", caption: "Ministry-scoped reporting.", viewportHeight: 1600 },
  { slug: "profile", path: "/ministry/profile", title: "My Profile", caption: "Personal profile and ministry assignment." },
  { slug: "account", path: "/ministry/account", title: "Account", caption: "Account and security settings." },
];

export const ADMIN_PAGES: PageEntry[] = [
  { slug: "overview", path: "/admin", title: "Overview", caption: "Command centre: project status distribution, pending enquiries and the governance activity feed." },
  { slug: "projects", path: "/admin/projects", title: "Projects", caption: "The full project registry across every ministry and sector." },
  { slug: "review", path: "/admin/review", title: "Review Queue", caption: "Projects awaiting review, revision or publication. Publication authority sits here." },
  { slug: "inquiries", path: "/admin/inquiries", title: "Inquiries", caption: "Enquiries and qualified-investor applications, with approve, decline and request-changes decisions." },
  { slug: "mou", path: "/admin/mou", title: "MOU Registry", caption: "All memoranda across the platform." },
  { slug: "users", path: "/admin/users", title: "Users & Roles", caption: "The account directory, with role assignment and accreditation review." },
  { slug: "reports", path: "/admin/reports", title: "Reports", caption: "Government executive reporting.", viewportHeight: 1600 },
  { slug: "communication", path: "/admin/communication", title: "Communication Hub", caption: "Staff and stakeholder messaging." },
  { slug: "profile", path: "/admin/profile", title: "My Profile", caption: "Personal profile." },
  { slug: "account", path: "/admin/account", title: "Account", caption: "Account and security settings." },
];

export const SUPER_ADMIN_PAGES: PageEntry[] = [
  { slug: "overview", path: "/super-admin", title: "Analytics", caption: "Platform-wide analytics across sectors, enquiries and governance activity." },
  { slug: "projects", path: "/super-admin/projects", title: "Projects", caption: "The full project registry." },
  { slug: "review", path: "/super-admin/review", title: "Review Queue", caption: "The platform-wide review queue." },
  { slug: "users", path: "/super-admin/users", title: "Users & Roles", caption: "The account directory and entitlement assignment." },
  { slug: "inquiries", path: "/super-admin/inquiries", title: "Inquiries", caption: "All enquiries platform-wide, filterable by category and status." },
  { slug: "mou", path: "/super-admin/mou", title: "MOU Registry", caption: "All memoranda platform-wide." },
  { slug: "reports", path: "/super-admin/reports", title: "Reports", caption: "Executive reporting.", viewportHeight: 1600 },
  { slug: "taxonomies", path: "/super-admin/taxonomies", title: "Taxonomies", caption: "Sectors, ministries, strategic pillars and development goals â€” the classification scheme every project is filed against." },
  { slug: "communication", path: "/super-admin/communication", title: "Communication Hub", caption: "Staff messaging." },
  { slug: "settings", path: "/super-admin/settings", title: "Site Settings", caption: "Tenant and site configuration." },
  { slug: "audit", path: "/super-admin/audit", title: "Audit Log", caption: "The governance audit trail: who did what, when, and on whose authority." },
  { slug: "override", path: "/super-admin/override", title: "Publishing Override", caption: "Platform-owner authority to force a status or visibility change outside the normal workflow." },
  { slug: "profile", path: "/super-admin/profile", title: "My Profile", caption: "Personal profile." },
  { slug: "account", path: "/super-admin/account", title: "Account", caption: "Account and security settings." },
];

export const PAGES_BY_PERSONA: Record<string, PageEntry[]> = {
  registered: REGISTERED_PAGES,
  qualified: QUALIFIED_PAGES,
  government: GOVERNMENT_PAGES,
  ministry: MINISTRY_PAGES,
  admin: ADMIN_PAGES,
  superadmin: SUPER_ADMIN_PAGES,
};

