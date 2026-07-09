# Zimbabwe Digital Investment & Economic Intelligence Platform
## MVP Build Instruction for Cursor v1.0
Prepared by Afronovation | July 2026

## 1. Mission
Build a showcase-ready MVP for the Zimbabwe Digital Investment & Economic Intelligence Platform ahead of the July 10, 2026 government meeting.

The MVP must demonstrate that Afronovation can transform ZIDA's static 2025 project catalogue into a governed, searchable, investor-facing digital investment intelligence platform while preserving Afronovation ownership, super admin control, and SaaS platform IP.

## 2. Strategic Platform Positioning
- Afronovation owns, controls, operates, and maintains the platform as proprietary SaaS infrastructure.
- Afronovation is the super admin and controls full platform configuration, modules, taxonomies, entitlements, and publishing rules.
- Zimbabwe/ZIDA/government users are configured tenant or institutional users based on assigned entitlements.
- Government/ZIDA data, official content, and project records remain owned by the designated Zimbabwean authorities.
- The platform does not replace ZIDA or government systems; it strengthens investment visibility, project discovery, investor engagement, and institutional coordination.

## 3. Non-Negotiables
- Do not break the existing app structure.
- Do not introduce unnecessary backend complexity before the July 10 showcase.
- Prioritize visual polish, narrative clarity, and stable demo flow.
- Use static/seeded data for the MVP unless a database already exists.
- All sectors, strategic pillars, SDGs, ministries, agencies, contact reasons, project metadata, statuses, and visibility levels must be modeled as admin-managed entities, even if seeded statically for the demo.
- Visitor registration must be encouraged to unlock deeper project details.
- Sensitive project details and documents must not be fully public by default.
- All projects must follow review and approval before publication.
- Persona and entitlement logic must be visible in the UX and data model.
- Position the platform as Afronovation-owned SaaS infrastructure configured for Zimbabwe.

## 4. Recommended Cursor Model / Agent Use
- Phase 0: Ask Cursor to inspect the repo and produce an implementation plan before modifying files.
- Phase 1: Use the strongest available coding/reasoning model for data model, routing, page scaffolding, and shared components.
- Phase 2: Use the same strong model for review workflow, entitlement mock logic, and admin/super admin screens.
- Phase 3: Use a faster model for copy refinement, spacing, responsive adjustments, and final QA fixes.
- Do not allow Cursor to refactor unrelated areas or introduce new dependencies without justification.

## 5. Design System Direction
Use an established design-system approach rather than inventing a new system from scratch.

- GOV.UK / USWDS principles: public-sector clarity, accessibility, plain-language service design, forms, and navigation.
- Carbon-style dashboard logic: enterprise tables, filters, admin screens, analytics cards, and structured workflows.
- shadcn/ui + Tailwind + Radix: fast implementation of modern, accessible SaaS components.
- Zimbabwe color adaptation: deep green, gold, white/off-white, charcoal, and minimal red; avoid overusing flag colors.

## 6. Required Pages
- `/` - Landing page
- `/platform` - Platform overview
- `/sectors` - Sector explorer
- `/sectors/[sector]` - Sector detail pages
- `/projects` - Searchable project registry
- `/projects/[slug]` - Project detail pages
- `/strategic-alignment` - Pillars, SDGs, beneficiary ministries
- `/investor-journey` - How to invest and register
- `/contact` - Contact form with reason-for-contact selector
- `/register` or registration modal - Investor lead capture
- `/admin-demo` - Institutional admin preview
- `/super-admin-demo` - Afronovation super admin preview
- `/about-afronovation` - Afronovation as implementation partner

## 7. Core Public Features
- Browse country investment overview.
- Browse sectors and strategic pillars.
- Search projects.
- Filter projects by sector, strategic pillar, SDG, beneficiary ministry, location/province, capital required, readiness level, and financing type.
- View high-level public project details.
- Encourage registration to unlock deeper details.
- Submit investment interest.
- Request meeting.
- Contact platform with reason-for-contact selection.

## 8. Core Registered User Features
- View expanded project details.
- Save or bookmark projects.
- Request access to documents.
- Submit investment profile.
- Request investor pack.
- Request meeting or follow-up.

## 9. Admin and Super Admin Requirements
### Institutional Admin Demo
- Add/edit project.
- Select sector and subsector.
- Select strategic pillar.
- Add SDG tags.
- Assign primary beneficiary ministry.
- Assign secondary beneficiary ministries.
- Add implementing agency and regulators where applicable.
- Add project owner.
- Add financing type and readiness level.
- Upload document placeholders.
- Review investor inquiries.
- Save draft and submit for approval.

### Reviewer / Approver Demo
- Validate required fields.
- Request changes with reviewer notes.
- Approve project.
- Publish project according to visibility level.
- Archive project.

### Afronovation Super Admin Demo
- Manage sectors.
- Manage strategic pillars.
- Manage SDG tags.
- Manage ministries and agencies.
- Manage contact reasons.
- Manage users and roles.
- Manage entitlements.
- Manage country/tenant settings.
- View platform-wide analytics.
- Control publishing workflow and override statuses.

## 10. Project Governance Requirement
All projects must follow a controlled workflow before publication. No project can be published directly from draft.

Required statuses:
- `draft`
- `submitted_for_review`
- `under_review`
- `changes_requested`
- `approved`
- `published`
- `archived`

Rules:
- Required project fields must be completed before submission.
- Project creators can save drafts and submit for review.
- Reviewers can approve, reject, request changes, or archive based on entitlement.
- Only authorized approvers and Afronovation Super Admin can publish.
- Afronovation Super Admin can override, unpublish, archive, or reassign review status.
- Reviewer notes must be captured when changes are requested.
- Approval metadata must be visible: approved by, approved date, published by, last updated.

## 11. Data Model Requirements
Model all taxonomies and metadata as admin-managed entities, even if seeded statically for the demo.

Entities:
- Sector: `id`, `name`, `slug`, `description`, `status`
- Subsector: `id`, `sectorId`, `name`, `slug`, `status`
- Strategic Pillar: `id`, `name`, `slug`, `description`, `status`
- SDG: `id`, `number`, `name`, `colorToken`, `description`
- Ministry: `id`, `name`, `shortName`, `type`, `status`
- Agency / Regulator: `id`, `name`, `parentMinistryId`, `type`, `status`
- Contact Reason: `id`, `label`, `routingCategory`, `status`
- User Role: `id`, `name`, `permissions`, `scope`
- Project: see full project template below

## 12. Required Project Template
```ts
type ProjectStatus =
  | "draft"
  | "submitted_for_review"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "archived";

type VisibilityLevel =
  | "public"
  | "registered"
  | "qualified_investor"
  | "admin_only";

type InvestmentProject = {
  id: string;
  title: string;
  slug: string;
  sectorId: string;
  subsectorId?: string;
  strategicPillarIds: string[];
  sdgIds: string[];
  primaryBeneficiaryMinistryId: string;
  secondaryBeneficiaryMinistryIds?: string[];
  implementingAgencyId?: string;
  regulatorIds?: string[];
  projectOwner: string;
  location: string;
  province?: string;
  district?: string;
  capitalRequired?: string;
  financingType?: string;
  projectReadiness: string;
  projectStatus: ProjectStatus;
  visibilityLevel: VisibilityLevel;
  irr?: string;
  npv?: string;
  roi?: string;
  paybackPeriod?: string;
  projectedRevenue?: string;
  opportunitySummary: string;
  description: string;
  scope: string[];
  developmentImpact: string[];
  documents: string[];
  sourceReference?: string;
  dataVerificationStatus: "unverified" | "pending_review" | "verified";
  reviewerNotes?: string;
  createdBy: string;
  submittedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  publishedBy?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  publishedAt?: string;
};
```

## 13. Personas to Model
1. Public Visitor
2. Registered Investor
3. Qualified Investor / Strategic Partner
4. Diaspora Investor
5. Project Owner
6. ZIDA / Investment Authority Admin
7. Beneficiary Ministry User
8. Embassy Investment Desk User
9. Afronovation Platform Manager
10. Afronovation Super Admin

## 14. Contact Page Requirements
Include a reason-for-contact dropdown with these default options. These options must be modeled as super-admin-managed values.

- Investment Opportunity
- Project Partnership
- Government / Institutional Inquiry
- Diaspora Investment
- Development Finance / DFI Inquiry
- Technical Partnership
- Tourism / Destination Inquiry
- Media / Press
- General Question
- Other

## 15. Seed Data Requirement
Use the prepared ZIDA seed data file as the primary source for the first MVP project records:

```txt
docs/data/Zimbabwe_ZIDA_Seed_Projects_v1.0.md
```

This seed file contains curated demo-ready project records extracted from the ZIDA 2025 project catalogue, together with supporting taxonomy guidance for sectors, strategic pillars, SDGs, ministries, governance status, visibility levels, and implementation notes. Cursor must review this file before creating or modifying any project seed data.

Implementation requirement:
- Convert the seed project records from `docs/data/Zimbabwe_ZIDA_Seed_Projects_v1.0.md` into the project data structure used by the app, preferably `lib/data/zimbabwe-projects.ts` or the existing project data folder convention discovered during repo inspection.
- Preserve the source-aligned project names, sectors, locations, project owners, capital requirements, financial indicators, and opportunity summaries where provided.
- Model all sectors, strategic pillars, SDGs, ministries, agencies, contact reasons, statuses, and visibility levels as admin-managed entities, even if initially seeded statically.
- Mark all records as demo / pending official validation unless official approval is later provided by ZIDA or the relevant Government of Zimbabwe authority.
- Do not invent missing financial values, ministries, IRR, NPV, payback periods, or project details. Use placeholders such as `Pending official validation` where information is unavailable or requires confirmation.
- Ensure all seeded projects follow the required project template, review workflow states, visibility model, and approval gate before publication.

Minimum showcase requirement:
Use at least 12-15 projects from the seed file across health, agriculture, ICT, manufacturing, mining, infrastructure, renewable energy, tourism, and financial services. The full seed file may include more projects for optional expansion.

Recommended projects for the first showcase subset:
- Masuwe International Medical Center
- Goromonzi Agro Processing Industrial Park
- Agro Strong Beef and Dairy Farming Venture
- Misty Mountains Coffee Production
- TelOne FTTH Deployment
- TelOne Data Centres Project
- Sunway City High-Tech Park
- SIRDC Integrated Foundry
- Buck Special Grant Gold Mining Project
- MNHSA Livingstone Flats Project
- Kumusha Power Project
- Solgas Solar Project
- Hwange 50MW Solar Plant
- Jafuta Estate / Masuwe SEZ Tourism Project

## 16. Build Priority
1. Inspect existing repo and confirm framework, routing, component library, data folder structure, and styling approach.
2. Create seeded data model for projects, sectors, pillars, SDGs, ministries, agencies, contact reasons, roles, and visibility levels.
3. Build landing page and platform overview.
4. Build project registry with search and filters.
5. Build project detail page with gated sections and registration prompts.
6. Build sector explorer and strategic alignment page.
7. Build contact page and investor inquiry form.
8. Build admin demo project creation form with required field validation.
9. Build reviewer dashboard and project status workflow.
10. Build super admin demo for taxonomies, roles, entitlements, tenant settings, and publishing controls.
11. Polish responsive design, empty states, demo labels, and meeting-ready narrative flow.

## 17. Demo Success Criteria
- Executive can understand the value in under 2 minutes.
- Project registry feels searchable and real.
- Project detail pages feel investor-grade.
- Registration flow clearly supports lead capture.
- Admin demo shows how ZIDA/government users manage content.
- Review workflow shows that projects cannot be published without approval.
- Super admin demo shows Afronovation ownership and platform control.
- Persona and entitlement structure is visible and credible.
- The MVP naturally leads to a paid 60-90 day pilot.

## 18. Cursor Prompt to Start
Copy this into Cursor first:

> You are operating as the senior full-stack product engineer for Afronovation. Before editing files, inspect the repository and produce a concise implementation plan for the Zimbabwe Digital Investment & Economic Intelligence Platform MVP. The MVP must be showcase-ready for a July 10, 2026 government meeting. It must preserve Afronovation ownership and super admin control, use seeded data unless a backend already exists, implement project governance with review/approval before publishing, support lead capture via registration prompts, and model sectors, SDGs, ministries, pillars, roles, contact reasons, statuses, and visibility levels as admin-managed entities. Use `docs/data/Zimbabwe_ZIDA_Seed_Projects_v1.0.md` as the primary seed source for the first project records and convert it into the app's project data structure, without inventing missing values. Do not refactor unrelated app areas. Prioritize stable demo flow, executive design quality, and accurate implementation of the concept note.
