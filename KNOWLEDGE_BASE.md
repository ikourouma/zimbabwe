# Knowledge Base

A living record of what has been built and *why* — updated after every future session so decisions
survive across sessions without re-deriving them from chat history or plan files. This is a
changelog-with-rationale, not a spec: for the eventual formal design-system specification and
platform-template documentation, see the "Platform template documentation" entry in
[BACKLOG.md](BACKLOG.md).

How to use this doc: add a short entry to the relevant section whenever a page ships or a
cross-cutting pattern is introduced. Prefer terse, dated bullets over prose — this file is meant to
be scanned, not read cover to cover.

## Design system foundations

- **Visual language**: Stripe-aligned editorial system — negative letter-tracking, light font
  weights for display type, never pure black/white. Tokens live in
  [app/globals.css](app/globals.css):
  - Ink/canvas: `--color-sovereign-midnight`, `--color-sovereign-panel`, `--color-text-primary` /
    `-secondary` / `-muted` (dark shell); `--color-canvas`, `--color-ink` (light shell, used on
    `/projects`, `/contact`, `/admin-demo`, `/super-admin-demo` via `LayoutChrome`'s
    `LIGHT_PREFIXES`).
  - Type scale: `--type-display-size` / `-tracking` / `-leading` (H1s), `--type-heading-tracking`
    (H2/H3s). Applied via inline `style`, not Tailwind classes, since Tailwind v4 doesn't expose
    arbitrary CSS custom properties as utility values here.
  - Layout: `--max-width-sovereign` (1280px) is the standard content width via the `.page-container`
    class — used across the top nav, footer, and nearly every page body so everything lines up
    edge-to-edge. `--max-width-executive` (900px) is reserved for long-form reading columns
    (e.g. the "Strategic Case" text column on Opportunity).
  - Components: `.sovereign-panel` / `ExecutiveCard` (`components/system/executive-card.tsx`) for
    bordered content panels; `.btn-sovereign` / `.btn-sovereign-ghost` are pill-shaped
    (`--radius-pill`).
- **Nav & footer**: solid colors (`--color-nav-bg`, `--color-footer-bg`), no blur/transparency —
  deliberate choice over the initial glass-morphism approach, confirmed with the user early on.
  Footer's logo lockup mirrors the header's exactly (flag/map icon + "Republic of Zimbabwe" overline
  + platform name) — the Afronovation logo was removed from the footer as low-value/low-visibility.
  Header height is responsive (`h-16 lg:h-20`) with proportionally scaled logo.

## Architecture patterns established

- **Server Component + Client Content split** — the pattern for giving any page real per-page SEO
  metadata while still using client-side hooks/animations. Reference implementation:
  [app/opportunity/page.tsx](app/opportunity/page.tsx) (thin Server Component: `metadata` export +
  `BreadcrumbList` JSON-LD) rendering
  [components/opportunity/opportunity-page-content.tsx](components/opportunity/opportunity-page-content.tsx)
  (`"use client"`, holds all interactive content). Apply this same split when redesigning each of
  the other ~11 pages (tracked in `BACKLOG.md`).
- **Live stats hook** — [lib/hooks/use-site-stats.ts](lib/hooks/use-site-stats.ts) calls
  `useProjectStore()` + `useTaxonomyStore()` and feeds their live arrays into
  `computeSiteStats()` ([lib/data/site-stats.ts](lib/data/site-stats.ts), refactored into a pure
  function that takes data as parameters). `getSiteStats()` remains as a zero-arg wrapper over
  static seed data for pages/content files that haven't been converted to live stats yet
  (`content/zimbabwe-site.ts`'s `matrixNodes`, `/platform`, `/strategic-alignment`, `/zimbabwe`).
  Any project/taxonomy edit in the super-admin demo now reflects immediately on the landing hero and
  Opportunity page — no rebuild needed.
- **Entitlement / visibility gating** — [lib/entitlements/visibility.ts](lib/entitlements/visibility.ts)
  (`getRequiredLevelForField`, `getAccessLevel`, `canAccessContent`) defines which `AccessLevel`
  (`public` / `registered` / `qualified` / `admin`) each project field requires.
  `components/projects/capital-breakdown.tsx` is the reference implementation: it fully **hides**
  (not blurs) the cost structure for non-registered users — confirmed UX decision, since the
  engagement pathway and access-tier comparison already explain what registering unlocks, so a
  "teaser" pattern added no value. Values are labeled "Total Cost **Estimate**" etc.
  (`lib/utils/capital.ts`'s `TOTAL_COST_LABEL`) to set expectations that costs can change.
- **Sitewide settings kill-switch** — [context/site-settings-context.tsx](context/site-settings-context.tsx)
  holds `costStructureHidden`, toggleable live by a super admin in the "Field Visibility Matrix" card
  on `/super-admin-demo` (Roles tab). This is the template for any future sitewide content
  kill-switch.
- **Province registry (Phase 1)** — `provinces: string[]` in
  [lib/data/taxonomies.ts](lib/data/taxonomies.ts), managed live via
  [context/taxonomy-store-context.tsx](context/taxonomy-store-context.tsx) (`addProvince` /
  `renameProvince` / `removeProvince`), surfaced in `/super-admin-demo`'s Taxonomies tab. This
  registry — not the messy free-text `province` field on individual seed projects — is what drives
  the platform-wide province *count*. Full data migration of the ~30 seed projects' free-text
  province values is deferred (see `BACKLOG.md`).
- **Sticky breadcrumb** — [components/layout/sticky-breadcrumb.tsx](components/layout/sticky-breadcrumb.tsx),
  wired once into [components/layout/layout-chrome.tsx](components/layout/layout-chrome.tsx), shown
  on every route except `/` and `HIDE_CHROME` routes (`/register`). Resolves dynamic segments
  (`/sectors/[sector]`, `/projects/[slug]`) live via the taxonomy/project stores.
- **SEO foundations** — `metadataBase` + `Organization`/`WebSite` JSON-LD in
  [app/layout.tsx](app/layout.tsx), [app/sitemap.ts](app/sitemap.ts) (static routes + sector slugs +
  published project slugs), [app/robots.ts](app/robots.ts) (allows known AI crawlers — `GPTBot`,
  `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot` — disallows the two demo-admin routes).
  Canonical site URL lives in [lib/config/site.ts](lib/config/site.ts) (`SITE_URL`, currently a
  placeholder pending a real production domain).

## Production backend (in progress)

- **Drizzle schema + Neon Managed Better Auth scaffolding** — `lib/db/schema/` (20 tables,
  mirroring `lib/types/index.ts` and `lib/data/taxonomies.ts` field-for-field) and
  `lib/auth/{server,client,session}.ts` are the first real backend code in the repo, added
  alongside — not instead of — the existing Context/`localStorage` demo, which is untouched and
  still what every page runs on today. See [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md)
  for the full phased plan and live status.
- **Taxonomy tables keep their existing string IDs** (`"sec-health"`, `"pillar-01"`, etc.) as
  primary keys rather than uuid, specifically so the eventual seed migration from
  `lib/data/taxonomies.ts`'s arrays is a straight port, not a redesign.
- **Auth/DB modules must never throw at import time** — `next build` executes every route module
  (including unused ones) during "Collecting page data," so a missing-env-var check that throws
  at module scope breaks the build outright, which would break the live Hostinger build (it has
  none of these vars). Both `lib/auth/server.ts` and `lib/db/client.ts` fall back to an
  obviously-fake placeholder value at import time instead; real failures surface only when a
  request actually tries to use them. Apply this same pattern to any future module gated on an
  env var that isn't guaranteed to be set in every build environment.
- **Role authorization is layered, not centralized in middleware** — `middleware.ts` only proves
  "is there a valid session" (Better Auth's session has no custom fields). Which roles may enter
  a given area is checked separately, server-side, via `lib/auth/session.ts`'s `requireRole()` in
  each protected Server Component/Route Handler, once it joins the session to the `profiles`
  table for the real `role` column.
- **Production tech stack documented** — Neon Postgres, Neon Managed Better Auth, Drizzle ORM,
  Cloudflare R2, and Resend are listed with descriptions in [README.md](README.md) and
  [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md#production-tech-stack). All service
  credentials are configured in local `.env.local` only (never in `.env.example` or this repo).
- **Resend sending is live (2026-09-04)** — `zidaproject.com` is **Verified** in Resend and
  `npm run email:test` sends the four inquiry-lifecycle templates successfully from
  `notifications@zidaproject.com`. Mandatory *signup* email verification remains **deferred**;
  pilot auth still uses seeded accounts with verification disabled. See
  [Email verification — deferred decision](PRODUCTION_MIGRATION_PLAN.md#email-verification--deferred-decision-2026-07-22)
  and the [Resend DNS runbook](PRODUCTION_MIGRATION_PLAN.md#resend-dns-runbook--zidaprojectcom-completed-2026-09-04).
  Two cautions carried forward: DNS values must be pasted from Resend's copy button (never retyped
  or hand-transcribed) and corrections must **replace** the prior TXT rather than be added beside
  it, since a DKIM name must resolve to exactly one record. Keep the apex SPF as
  `v=spf1 include:_spf.mail.hostinger.com ~all` — it was overwritten with the SES value during this
  work, which silently breaks outbound mail from the Hostinger mailboxes.
- **Navigation centralized** — shared link arrays in `lib/config/navigation.ts`; Contact is in
  primary header nav (desktop + mobile), not only the utility bar.
- **French (FR) i18n** — `LocaleProvider` + `lib/i18n/messages/{en,fr}.ts`; utility-bar language
  switcher is live (no longer "Coming Soon"). Shell + homepage support FR; remaining pages tracked
  in [PRODUCTION_MIGRATION_PLAN.md — French i18n](PRODUCTION_MIGRATION_PLAN.md#french-i18n-enfr).
- **Milestone 2 — Context cutover (2026-07-22)** — All five Context providers backed by Neon API
  Route Handlers; `AuthProvider`/`useAuth()` replaces persona switcher. Production routes:
  `/admin`, `/super-admin`, `/deal-room` (middleware-protected). Re-run `npm run db:seed` to load
  investor engagements after pulling this milestone.
- **Auth & registration UX (2026-07-22)** — **`/register`** = investor **application** (writes to
  `strategic_inquiries`; no login). **`/auth/sign-in`** = returning users + pilot testers (Better Auth
  session). **`/auth/sign-up`** redirects to `/register` (no public self-service account creation).
  Both `/register` and `/auth/sign-in` share [`ExecutiveAccessShell`](components/layout/executive-access-shell.tsx)
  (split institutional layout). Header nav uses responsive short labels so **Contact** stays visible
  at 1280px.
- **Pilot test accounts** — five role accounts seeded by `npm run db:seed` via
  [`lib/db/seed/accounts.ts`](lib/db/seed/accounts.ts). Credentials written locally to git-ignored
  **`docs/PILOT_TEST_ACCOUNTS.md`** (emails: `registered+pilot@`, `qualified+pilot@`,
  `government+pilot@`, `admin+pilot@`, `superadmin+pilot@zidaproject.com`). Sign in at `/auth/sign-in`.
  Optional: set `PILOT_ACCOUNT_PASSWORD` in `.env.local` for a fixed password across re-seeds.
- **Milestone 1 — Neon live + auth (2026-07-22)** — Drizzle migration applied to Neon; `npm run db:seed`
  loads taxonomies, 32 projects (DB uuid IDs, **`slug` is the stable public key** for Milestone 2 cutover),
  site_settings, and document placeholders. Auth: `/auth/sign-in`, `/auth/sign-up`, `POST /api/auth/ensure-profile`,
  header Sign in link. Pilot credentials: git-ignored `docs/PILOT_TEST_ACCOUNTS.md`.

## Page-by-page log

- **Top nav & footer** — rebuilt to solid dark colors, Stripe-aligned type, pill buttons, mirrored
  logo lockups, responsive height increase on the nav. Nav links centralized in
  `lib/config/navigation.ts` (2026-07-22). **Contact** is in primary header nav (desktop + mobile),
  not only the utility bar; utility bar retains FAQs only.
- **Landing page** (`app/page.tsx`) — hero carousel top-anchored (fixed a large gap that came from
  vertical-centering + duplicate top padding), stat values on the "country" slide now computed live
  via `useSiteStats()` instead of baked in at content-file load time. New sections added:
  classification strip, investor engagement pathway (4 steps), investor access tiers comparison —
  these explain what registering/qualifying unlocks, which is what justified fully hiding (not
  blurring) gated content elsewhere on the platform.
- **Project cards** (`components/projects/project-card.tsx`, `capital-breakdown.tsx`) — cost
  structure display standardized to bulleted, multi-line breakdowns parsed from the free-text
  `capitalRequired` field (`lib/utils/capital.ts`); sector names shortened to a single line via
  `Sector.shortName` / `getSectorDisplayName()` (e.g. "Renewable Energy" → "Energy").
- **Opportunity page** (`/opportunity`) — converted to the Server/Client split (first page to get
  real per-page metadata + `BreadcrumbList` JSON-LD); `DeepDiveShell` H1 and `ExecutiveCard.Header`
  h3 moved to Stripe type tokens (benefits all 7 pages sharing these components); "Why Now" panel's
  edge-bleed CSS trick (`-mx-6 px-0` cancelling itself out at `md:` and up, leaving zero internal
  padding) replaced with real padding at every breakpoint. Content fully rewritten to lead with
  Zimbabwe's actual investment case (GDP growth, mining/lithium momentum, diaspora remittances, ZIDA
  incentives/protections) instead of narrating the platform's own catalogue-digitisation — the
  digitisation story stopped being news once the platform itself became the proof. Added a "Continue
  the narrative: Platform Concept" forward link as the page-to-page wiring pattern to repeat on each
  subsequent page.
- **Platform page** (`/platform`) — converted to the Server/Client split; live stats via
  `useSiteStats()` in the "Starting Point" panel; all 6 capability cards made clickable, with live
  data badges on Project Registry and Admin-Managed Taxonomies. Added an "Afronovation" link to the
  Ownership Model button row (ghost-styled, matching "Strategic Pillars" — no new button color
  introduced, keeping "Browse Registry" as the one primary CTA). New "Reusable by Design" section
  states the platform architecture's reusability as a factual property without ever calling
  Zimbabwe's deployment a "template" or "reference implementation" — an explicit decision: every
  country deployment, including this one, should read as built specifically for that country.
- **Platform page capability cards — link vs. drawer split**: only cards with a genuine public
  destination link out (Project Registry → `/projects`, Persona & Entitlements →
  `/investor-journey`, Content Gating → `/register`, Lead Capture → `/contact`). Governance
  Workflow and Admin-Managed Taxonomies have no public destination — their only "home" is an
  internal staff/super-admin console (`/admin-demo`, `/super-admin-demo`, both already disallowed
  in `robots.ts`) — so they open an in-page explainer drawer instead (`components/ui/sheet.tsx` +
  `components/platform/capability-drawer.tsx`), avoiding both the "public visitor dropped into a
  CMS backend" problem and two brand-new marketing pages that would exist only to hold a paragraph
  of copy. Each drawer is persona-aware via `useDemoPersona()`: if the visitor has switched to the
  Admin/Super Admin demo persona, the drawer shows a real "Open Console" link; otherwise it's pure
  explanatory copy with a hint pointing at the persona switcher. The two affordances are
  visually distinguished on the card itself — an `ArrowUpRight` corner icon for cards that navigate,
  an `Info` icon for cards that open a drawer.
- **Drawer elevation** (`capability-drawer.tsx`) — after review, the drawer *mechanism* stayed (still
  the right call: both destinations are internal-only regardless, and a drawer avoids two throwaway
  pages for a paragraph of copy each); the fix for "feels flat" was richer content, not a structural
  change. Governance Workflow now renders a vertical icon-in-circle timeline (Pencil → Send → Eye →
  CheckCircle → Rocket) instead of a pill row, with Changes Requested/Archived called out in prose
  rather than as extra nodes (keeps the primary line readable). Admin-Managed Taxonomies now renders
  a 3-tile stat grid (Sectors/Pillars/Provinces) reusing the Platform page's own "Starting Point"
  stat-tile convention rather than inventing a new one. Both drawers gained a `HighlightCallout` for
  their single most compelling point (the governance guarantee; the Field Visibility Matrix) and a
  thin gold-to-green gradient accent strip across the top of the sheet.
- **Contact page** (`/contact`) — converted to the Server/Client split (closes a metadata/SEO gap
  that existed on no other page); redesigned as a two-column layout (trust panel + elevated form
  card) while **staying in the light shell** — deliberately not converted to dark, since Contact is
  a task/utility page in the same category as `/projects`, not a narrative/marketing page. Submit
  button switched from a generic button to `.btn-sovereign`, the site's one primary pill CTA. Added
  phone capture with country code + flag via a new hand-rolled `PhoneInput`
  (`components/shared/phone-input.tsx`) backed by `lib/data/countries.ts` — no phone-number library
  dependency added, consistent with how the rest of the site's forms (e.g. `/register`) are built.
  `LeadInquiry.phone` is optional, to keep conversion friction low.
- **Investor Journey page** (`/investor-journey`) — was pre-Stripe-refresh and, more importantly, was
  duplicating content that already existed in fully-elevated form on the homepage
  (`InvestorEngagementProcess`, `InvestorAccessTiers`, both driven by `engagementSteps`/`accessTiers`
  in `content/zimbabwe-site.ts`). Rebuilt as a Server/Client split whose only new UI is a
  `DeepDiveShell` intro (overline/title/framing paragraph); the two homepage sections are reused
  verbatim as full-bleed siblings below it, not rebuilt. This is the highest-leverage fix in this
  round: near-zero new visual surface, maximum consistency with the homepage. Required one additive,
  backward-compatible change to `DeepDiveShell`: an optional `minHeightScreen` prop (default `true`)
  so the intro doesn't force a full viewport of empty space before the full-bleed sections start.

## Content & data conventions

- **Sourced citations for editorial/macro facts** — when copy cites external data (e.g. Opportunity's
  Three Forces cards), include a short source tag (e.g. "RBZ 2026 Monetary Policy Statement · ZIDA
  Investment Regulations, 2026") rather than presenting figures as unattributed platform claims.
- **"Estimate" labeling** — any forward-looking or cost-dependent figure shown to investors should
  be explicitly labeled as an estimate (e.g. "Total Cost Estimate"), since costs can move with time
  and resource availability.
- **Single-line compact labels** — `shortName` fields (currently on `Sector`) are the pattern for any
  taxonomy entity that needs a compact badge/chip label distinct from its full display name.
- **Full-hide over blur-teaser for gated content** — established on the cost structure, intended as
  the default pattern for any future gated field, given the platform already has a dedicated
  engagement-pathway/access-tier narrative explaining the value of registering.

## Cross-references

- Deferred work and the eventual platform-template documentation initiative:
  [BACKLOG.md](BACKLOG.md).
- Active backend/production build-out (Neon + Drizzle + Better Auth + Cloudflare R2), tracked with a
  live status checklist: [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md).
- Nothing in this repo yet corresponds to a formal, versioned design-system spec document (compare
  the Lesotho reference platform's `design-system-spec-v2.md`) — that is intentionally deferred until
  the Zimbabwe page-by-page rebuild is further along; see `BACKLOG.md`.
