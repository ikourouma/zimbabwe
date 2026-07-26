# Backlog

Deferred items and larger initiatives tracked across sessions. Scoped deliberately out of the
current one-page-at-a-time redesign flow so each shipped page stays small and reviewable.

## AI / LLM discoverability

Full answer-engine / AI-crawler discoverability strategy, designed to be country-agnostic since
this platform is a template reused for other countries. `app/robots.ts` already allows known AI
crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`) as a first step. Still
to do:

- `llms.txt` at the site root summarizing the platform, key routes, and data provenance for LLM
  consumers.
- Deeper structured data: `Dataset`/`GovernmentService`-style JSON-LD for the project registry,
  per-project `Article`/`Dataset` markup on `/projects/[slug]`.
- A canonical, crawlable content feed (e.g. JSON or RSS-style) enumerating published projects for
  answer engines that don't render client-side content.
- Revisit once the real production domain replaces the `SITE_URL` placeholder in
  `lib/config/site.ts`.

## Personal Document Vault (aggregated "my records" page)

`components/deal-room/mou-panel.tsx`'s "Download Snapshot" button (added alongside the NDA
server-side gate and Sector/Ministry MOU template seeding work) is the deliberately-scoped
interim solution: a finalized/executed MOU's frozen `contentSnapshot` is downloadable as JSON
directly from the MOU tab, no new route or nav entry required.

The full version — a dedicated Vault page/section aggregating **all** of a user's MOU snapshots
across every engagement, their downloaded project documents (`document.downloaded` audit events),
and their NDA acceptance certificate (`profiles.ndaAcceptedAt`/`ndaVersion`/`ndaAcceptedIp`) in one
browsable destination — is scaffolded conceptually but not built. It would be a pure aggregation
*view* over existing tables (no new storage, no consolidation of R2 prefixes), so the remaining
work is UI/nav (where does it live — `/account/vault`? a Deal Room tab?) plus a cross-table query.
Revisit once enough per-user content has accumulated (more than the 1 MOU + a handful of document
downloads typical today) to justify a standalone page over the in-context snapshot button.

## Institutional Compliance Dossier — deferred infrastructure

Scoped out of the Sovereign Dossier Drawer Round 2 upgrade (`components/dashboard/user-detail-drawer.tsx`)
as explicitly deferred rather than built now:

- **Full VDR watermarking.** The drawer's "VDR Previews" KPI and the Preview links added to the two
  investor-facing document lists (`components/dashboard/project-detail-drawer.tsx`,
  `app/projects/[slug]/page.tsx`) are a real but lightweight signal — an inline-disposition signed R2
  URL plus a distinct `document.previewed` audit event (`app/api/projects/[id]/documents/[docId]/download/route.ts`).
  There is no dynamic per-viewer watermark overlay on the rendered document itself; a leaked preview
  URL is only as traceable as the audit log entry that generated it.
- **Admin-visible per-account device/IP session telemetry.** The Security & Governance tab's "Active
  Device & IP Telemetry" scaffold (`DeferredAction`, same convention as the MFA/password-reset/session
  scaffolds above it) notes that Neon Auth's admin session API (`listUserSessions`) exists but isn't
  wired into the drawer yet — staff can't currently see another user's active sessions/IPs from the
  console.
- **Accreditation document upload + review queue.** The Compliance & NDA tab's "Commitment Letter" /
  "Investment Guarantee Letter" rows stay disabled "Coming soon" scaffolds — no upload UI, storage
  path, or ZIDA review workflow exists yet for investor-submitted accreditation documents.

## Full province data migration

`lib/data/taxonomies.ts` now has a canonical `provinces: string[]` registry (super-admin managed,
see `super-admin-demo` → Taxonomies tab), which drives the platform-wide province *count*. The
~30 seed projects' free-text `province` field is still genuinely messy in places (e.g.
`"Harare / National"`, multi-province entries, deck/title-slide mismatches requiring validation).
Untangling that into a clean per-project foreign key (`provinceId`) is a content-judgment task
requiring ZIDA/domain-expert input, not a schema change — deferred until that input is available.

## SEO rollout to remaining pages

`/opportunity` is the fully-worked reference template: Server Component + Client Content split,
real per-page `metadata` (title/description/OpenGraph/canonical), and matching `BreadcrumbList`
JSON-LD. Apply the same pattern to the other ~11 client-component pages as each gets its own
redesign pass:

- `/platform`, `/strategic-alignment`, `/sectors`, `/sectors/[sector]`, `/projects`,
  `/projects/[slug]`, `/about-afronovation`, `/investor-journey`, `/zimbabwe`, `/contact`.
- `/legal` already has real per-page metadata (Server Component) but no `BreadcrumbList` JSON-LD
  yet — quick follow-up.

## Live stats parity for Sectors pages

`/sectors` and `/sectors/[sector]` still use the static-seed stats pattern (`getSectorStats`,
`getLargestCapitalProject` called directly against `zimbabweProjects`). Give them the same
`useSiteStats()`-style live-store treatment applied to the landing hero and Opportunity page when
those pages get their own redesign pass.

## Platform template documentation (post-completion)

Zimbabwe is the reference implementation for a platform template meant to be reused for other
countries. Once the page-by-page rebuild is feature-complete, produce full template documentation —
not started now, just tracked so scope isn't lost. Concrete foundation to adapt from: the Lesotho
platform at `C:\Users\ikour\Projects\lesotho\08 - Platform`.

- **Formal design-system specification** — modeled on Lesotho's `design-system-spec-v2.md`, but
  written to be explicitly country-agnostic (Zimbabwe becomes the reference implementation, not the
  subject). `KNOWLEDGE_BASE.md` is the informal, running precursor to this document.
- **Backend & database schema** — modeled on Lesotho's `database/*.sql` migration series (`001_schema.sql`
  through `012_lesotho_ministries_seed.sql` — core schema, ERP phases, seed data, storage buckets).
  Zimbabwe currently has no backend/DB — all state lives in React `Context` + `sessionStorage`
  (`ProjectStoreContext`, `TaxonomyStoreContext`, `SiteSettingsContext`, etc.) — so this doc defines
  the eventual real schema those contexts would be backed by.
- **Persona dashboards ("Sovereign Workspace")** — modeled on Lesotho's `components/workspace/`
  (sidebar/tabs shell, `ProjectProposalWizard`, `ProjectDetailDrawer`, `ExecutiveBriefingTemplate`,
  `AITransformationAdvisor`) and its `sovereign-workspace-information-architecture-v1.md` — mapped to
  Zimbabwe's existing `userRoles` taxonomy (`lib/data/taxonomies.ts`): Registered/Qualified/Diaspora
  Investor, Project Owner, ZIDA/Investment Authority Admin, Beneficiary Ministry User, Embassy
  Investment Desk User, Afronovation Platform Manager, Afronovation Super Admin.
- **Workflows** — draft → review → publish project lifecycle, investor engagement pathway (browse →
  register → qualify → engage), document-request flow — currently simulated client-side via demo
  personas; to be formalized once real backend work begins.
- **UI stability rules** — Lesotho's `knowledgebase-ui-architecture.md` (e.g. documented flexbox
  anti-patterns for fixed-position brand elements) is a good model for capturing hard-won layout
  rules as they're discovered in Zimbabwe, feeding into `KNOWLEDGE_BASE.md` in the meantime.

### Deal Room demo (`/deal-room-demo`) — approval model caveat

Added as a client-side demo prototype (project kanban + government/investor engagement tracking),
gated by the demo persona switcher (`qualified`, new `government`, `admin`, `super_admin`). This is
**not** a real per-investor, per-project approval workflow — "access" is just "which demo persona is
currently selected." Lesotho's real model (`investor_proposals.status = 'Approved'`, checked per
investor + per project before War Room access) is the target to build toward once real auth exists.
`lib/types/index.ts`'s `InvestorEngagement` type and `context/deal-room-store-context.tsx` are
already shaped to make that transition straightforward (see migration map below).

### Demo to SaaS migration map

**This map is now being executed** — see [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md)
for the live, phased build-out (Neon + Drizzle + Better Auth + Cloudflare R2) with a status checklist
kept up to date as each phase lands. The mapping below is preserved as the original rationale.

So the eventual backend/auth build-out isn't reverse-engineering the client-side demo, here is the
current Context/storage → intended backend mapping. Every context below is consumed by components
only through its hook (`useProjectStore()`, etc.), never via direct storage access, so migrating
means reimplementing what's *inside* the provider — consuming components should not need to change.

- `context/project-store-context.tsx` (`sessionStorage: zim-project-store`) → `projects` table +
  CRUD/status-transition endpoints. `lib/governance/project-workflow.ts`'s `canTransition` /
  `getAvailableActions` are pure, role-parameterized functions already shaped like backend
  authorization checks (API middleware or DB row-level-security policies) — the "role" input just
  changes from a demo-persona string to a real authenticated user's role claim.
- `context/lead-capture-context.tsx` (`localStorage: zim-lead-inquiries`) → a
  `strategic_inquiries`-style table + admin review endpoint.
- `context/demo-persona-context.tsx` (`localStorage: zim-demo-persona`) → real auth session + role
  claim; the persona switcher UI (`components/shared/persona-switcher.tsx`) is removed entirely.
- `context/taxonomy-store-context.tsx` → admin-managed taxonomy tables (sectors, pillars, SDGs,
  ministries, provinces) + super-admin CRUD endpoints.
- `context/deal-room-store-context.tsx` (`sessionStorage: zim-deal-room-engagements`, new) →
  `investor_engagements`/`investor_proposals` table + approve/reject endpoint. Its `InvestorEngagement`
  type (`lib/types/index.ts`) is deliberately shaped to match that table already, so this is intended
  to be closer to "point at a real table" than a data-model rework.
- Route naming: `-demo`-suffixed routes (`/admin-demo`, `/super-admin-demo`, `/deal-room-demo`) only
  affect the route folder and breadcrumb label — the underlying components/contexts have no "demo"
  branching baked into their logic. Cutover to real routes (`/admin`, `/deal-room`, real auth instead
  of the persona switcher) should be a rename + swapped data layer, not a rewrite.
