# Production Migration Plan

A living copy of the "Demo to Production Migration" plan, kept in the repo so it can be tracked and
updated alongside the code as each phase lands — not just inside the editor's own plan-file store.
Update the status checklist below as work progresses; keep the phase detail in sync with any
material decisions made along the way (the way `KNOWLEDGE_BASE.md` gets updated after each session).

**Goal**: migrate the Zimbabwe Investment Platform from a fully client-side demo (React Context +
`localStorage`/`sessionStorage`, no backend) to a hardened, Neon-backed pilot environment — Postgres
via Neon, Drizzle ORM, Neon Managed Better Auth, and Cloudflare R2 storage (behind a portable
storage-adapter module) — borrowing the Lesotho platform's schema/workflow *shape* (not its Supabase
runtime) per `BACKLOG.md`'s existing migration map. Target: ready for the Zimbabwe investment board's
validation, with public launch to follow their sign-off. Also folds in new source documents (ZIDA
2024 Annual Report, trade.gov, IDBZ) and scopes VFEX as an explicit post-pilot roadmap item.

## Progress log

- **2026-07-26** — First Hostinger Node.js-app deployment attempt of the real (Neon-backed) app
  surfaced two issues:
  1. **Red herring**: Hostinger's build log reported an `ERESOLVE` peer-dependency conflict
     between `@neondatabase/auth@0.4.2-beta` (optional peer `next@>=16`) and this project's
     `next@15`, "resolved" by an implicit `--legacy-peer-deps`. This is the same already-documented,
     intentional non-issue from the 2026-07-21 entry below — the package works fine on Next 15 per
     Neon's own docs, and upgrading to Next 16 was **not** done (would force a `middleware.ts` →
     `proxy.ts` rename and a full App Router regression pass, for zero effect on the real bug).
     Made the behavior deterministic instead: added a root `.npmrc` with `legacy-peer-deps=true`,
     so every host (Hostinger, Vercel, CI, local) resolves the same way without relying on a flag
     being passed manually.
  2. **Actual root cause of "can't log in"**: the Hostinger Node.js app had **zero** production
     environment variables configured, so `lib/auth/server.ts` / `lib/db/client.ts` were silently
     falling back to their build-safety placeholder values (see 2026-07-21 entry) and every real
     sign-in request failed. Neon Auth's trusted-origins list also didn't include
     `zidaproject.com`. **Fix (Hostinger app → Environment Variables panel)**: set every var listed
     in [.env.example](.env.example) — `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
     `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
     `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `RESEND_API_KEY` — with
     **`NEXT_PUBLIC_SITE_URL="https://zidaproject.com"`** (production domain, not localhost).
     Then, in the **Neon Console → Auth → trusted origins**, add `https://zidaproject.com` (and
     `https://www.zidaproject.com` if that's also served). Confirm the Hostinger app's start
     command runs `npm run build` then `npm run start` (already the correct scripts in
     `package.json`) on **Node ≥18.18** (Next 15's minimum).
- **2026-07-22 (Milestone 2)** — Phase 3 context cutover + route renames landed:
  - **API layer** — Route Handlers for projects, inquiries, engagements, taxonomies, site-settings, and `/api/me` (session + role booleans).
  - **DB mappers/queries** — `lib/db/mappers/*`, `lib/db/queries/projects.ts` + `taxonomies.ts`; projects use DB uuid as `InvestmentProject.id`, slug for URL lookup.
  - **Context cutover** — all five Context providers now fetch/mutate via API (seed data remains client fallback on fetch failure).
  - **Auth cutover** — `AuthProvider` + `useAuth()` replace persona switcher; `useDemoPersona()` re-exported as compatibility shim (no-op `setPersona`).
  - **Routes** — `/admin`, `/super-admin`, `/deal-room` live; old `-demo` paths redirect; middleware auth gate now active.
  - **Seed** — `seedEngagements()` added for illustrative Deal Room data (maps demo project ids → DB uuids by slug).
  - **Removed** — `components/shared/persona-switcher.tsx` from public UI.
- **2026-07-22 (Milestone 1)** — Neon live + auth pilot landed:
  - **Migration applied** — `npm run db:migrate` ran against Neon (`0000_friendly_nico_minoru.sql`, 20 tables).
  - **Seed script** — `lib/db/seed/` + `npm run db:seed`: taxonomies, site_settings, 32 projects (uuid IDs, slug as stable key), document placeholders (`pending-r2/…`), count verification.
  - **Pilot accounts** — five role accounts seeded via Neon Auth API; credentials in git-ignored `docs/PILOT_TEST_ACCOUNTS.md`.
  - **Auth UI** — `/auth/sign-in`, `/auth/sign-up`, header "Sign in" link, `POST /api/auth/ensure-profile` creates `profiles` row on signup/sign-in.
  - **Unchanged (by design)** — Hostinger demo untouched; R2/Resend still deferred (Phases 4–5).
- **2026-07-22** — Production-readiness decisions recorded:
  - **Email verification deferred** — Hostinger DNS + Resend domain verification and mandatory
    email verification are deferred to the **Phase 5 gate** (not Phase 1/2). Pilot auth uses
    seeded test accounts with `requireEmailVerification: false`; board demo uses either
    pre-provisioned accounts only (Option A) or verified `@zidaproject.com` sending (Option B).
    See [Email verification — deferred decision](#email-verification--deferred-decision-2026-07-22).
  - **Navigation & link integrity workstream** added — Contact promoted to primary header nav
    (was utility-bar only; mobile hamburger omitted it). Nav config centralized in
    `lib/config/navigation.ts`. Full site-wide link audit gates Phase 9 board-readiness.
  - **French (FR) i18n foundation** — `LocaleProvider`, `lib/i18n/messages/{en,fr}.ts`, working
    EN/FR language switcher in utility bar. Shell + homepage translated; remaining marketing pages
    gate Phase 6 / board-readiness (see [French i18n](#french-i18n-enfr)).
- **2026-07-21** — Phase 1 schema + Phase 2 auth scaffolding landed (code only, not yet run
  against real Neon infrastructure):
  - Installed `drizzle-orm`, `@neondatabase/serverless`, `@neondatabase/auth`, `@aws-sdk/client-s3`
    (+ presigner), `ws`, and dev tooling (`drizzle-kit`, `tsx`). Note: `@neondatabase/auth`
    declares an *optional* peer on `next@>=16` that conflicts with npm's resolver even though the
    package works on Next.js 15 per Neon's own docs (use `middleware.ts` instead of `proxy.ts`) —
    installed with `--legacy-peer-deps`, not a real version mismatch.
  - `.env.example` added (template only); `.gitignore` hardened to exclude all `.env*` except
    `.env.example` (previously only `.env*.local` was excluded).
  - Full Drizzle schema written under `lib/db/schema/` (enums, taxonomies, projects + 4 junction
    tables, project_documents, strategic_inquiries, investor_engagements, site_settings,
    audit_logs, profiles, relations) — mirrors `lib/types/index.ts` and
    `lib/data/taxonomies.ts` field-for-field. Taxonomy tables deliberately kept their existing
    human-readable string IDs (`"sec-health"`, `"pillar-01"`, etc.) as primary keys rather than
    switching to uuid, so the eventual seed migration is a straight port. Initial migration
    generated cleanly: `lib/db/migrations/0000_friendly_nico_minoru.sql` (20 tables).
  - `lib/db/client.ts` — Drizzle client on `@neondatabase/serverless`'s `Pool` (WebSocket driver,
    for real multi-statement transactions), not the HTTP-only driver.
  - Neon Managed Better Auth scaffolded: `lib/auth/server.ts` (`createNeonAuth`), `lib/auth/client.ts`,
    `app/api/auth/[...path]/route.ts` (catch-all handler), `middleware.ts` (authentication gate on
    the future `/admin`, `/super-admin`, `/deal-room` prefixes — inert until Phase 3's route
    renames land). Role-level authorization (which roles may enter each area) is deliberately
    **not** in middleware — Better Auth's session doesn't carry our custom `profiles.role` field,
    so `lib/auth/session.ts`'s `requireRole()` does that check server-side in each protected
    Server Component/Route Handler instead, per this doc's own Phase 2 rationale.
  - **Important build-safety fix**: initial versions of `lib/auth/server.ts` and
    `lib/db/client.ts` threw at *import time* if their env vars were unset. `next build` executes
    every route module during "Collecting page data" — including brand-new, not-yet-linked ones
    — so this broke the build entirely, which would have broken the live Hostinger build too
    (it has none of these env vars). Fixed by falling back to obviously-fake placeholder
    values at import time; real failures now surface only at actual request time, with a clear
    connection/auth error. Verified with a full clean `npm run build` — all existing demo routes
    and the new `/api/auth/[...path]` + middleware build successfully.
  - **Not done yet** (explicitly out of scope for this pass): running the migration against real
    Neon infra, creating the Neon branch split, generating a real `NEON_AUTH_COOKIE_SECRET`,
    the R2 storage adapter (Phase 4), Route Handlers for privileged mutations, the Phase 3
    context-cutover (existing demo pages/contexts are completely untouched and still fully
    functional on the persona switcher).

## Production tech stack

Same two-tier breakdown as [README.md](README.md); env var names listed here for deployment reference.

### Frontend / app

| Technology | Role |
| --- | --- |
| Next.js 15 | App Router, SSR, Route Handlers, middleware |
| TypeScript | Type-safe application code |
| Tailwind CSS v4 | Design system and responsive UI |
| Radix UI / shadcn-style | Accessible UI primitives |

### Production backend (pilot — in progress)

| Service | Role | Env vars / notes |
| --- | --- | --- |
| **Neon Postgres** | Primary database — projects, taxonomies, inquiries, engagements, site settings, audit logs. Serverless Postgres with branching; standard Postgres underneath for portability. Project: `zimbabwe-investment-platform`. | `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct, migrations) |
| **Neon Managed Better Auth** | Authentication and sessions — email/password, `neon_auth` schema in the same DB. Beta; replaces persona switcher in Phase 3. | `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` |
| **Drizzle ORM** | Schema, migrations, queries — `lib/db/schema/`, `lib/db/migrations/`. | Used with Neon serverless driver in `lib/db/client.ts` |
| **Cloudflare R2** | Private document storage via S3-compatible API. Bucket: `zimbabwe-investment-platform`. Portable to other S3 hosts or MinIO. | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |
| **Resend** | Transactional email — registrations, inquiry alerts, approvals, Better Auth verification/reset. Domain `zidaproject.com` added; **DNS not yet configured** (runbook below). | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (after domain verified) |
| **Vercel** (Phase 8) | Pilot/staging host for SSR + middleware + API (Hostinger static export cannot run Neon-backed app). | All env vars above + `NEXT_PUBLIC_SITE_URL` |

## Provisioned resources

Concrete IDs/URLs confirmed so far (no secrets recorded here — those live only in local
`.env.local` / the hosting provider's env settings, never in this repo):

- **Neon project**: `zimbabwe-investment-platform` (project ID `jolly-surf-10932408`), GitHub repo
  [ikourouma/zimbabwe](https://github.com/ikourouma/zimbabwe) connected to it.
- **Neon Postgres credentials**: **done** — `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`
  (direct) configured in local `.env.local`. **Migration applied + seed run** (Milestone 1, 2026-07-22).
- **Neon Managed Better Auth**: enabled (beta). Auth URL (`NEON_AUTH_BASE_URL`):
  `https://ep-sweet-paper-ainbxree.neonauth.c-4.us-east-1.aws.neon.tech/neondb/auth`.
  `NEON_AUTH_COOKIE_SECRET` configured locally.
- **Cloudflare R2**: bucket `zimbabwe-investment-platform` created. Account ID
  `86f3fdf094052c17a78dd7dc96e3382c` → S3-compatible endpoint
  `https://86f3fdf094052c17a78dd7dc96e3382c.r2.cloudflarestorage.com`. **API token done**
  (account token `zimbabwe-investment-platform`, scoped to bucket).
- **Resend**: account created. API key `zimbabwe-investment-platform` (Sending access) **done** in
  `.env.local`. Domain **`zidaproject.com` added — DNS not configured** (see runbook below).
- **Branching**: only the default branch exists today — creating the `main` + dev/preview split is
  in-scope for Phase 1, not something to do manually beforehand.
- **GitHub's role, clarified**: the repo isn't wired to Neon's per-PR preview-branch integration —
  it exists so the codebase is portable (can move off any single host later), supports team
  collaboration/staging, and is what Hostinger currently pulls from to serve the live
  `zidaproject.com` (static site, unrelated to this Neon/pilot build, and not touched until the
  board approves the cutover — see Phase 8).
- **Still outstanding (implementation, not credentials)**: Neon Auth trusted domains (add `localhost:3000` for local dev, and `zidaproject.com`/`www.zidaproject.com` for the Hostinger deployment, in Console if sign-in fails); R2 storage adapter code; Resend send integration (Phase 5); Vercel project (Phase 8). *Migration + seed + pilot auth accounts: done (Milestone 1).*

## Resend DNS runbook — `zidaproject.com` (execute when ready)

Domain is added in Resend with status **Pending** until DNS records are published on Hostinger.

**Prerequisites**

- Domain `zidaproject.com` in [Resend → Domains](https://resend.com/domains) (status: Pending)
- Access to **Hostinger DNS** for `zidaproject.com`
- Resend dashboard open showing the exact DNS records for your domain (values are unique per account)

**Steps**

1. **Open Resend domain details** — Resend → Domains → click `zidaproject.com`. Note each required
   record (typically **SPF** TXT, **DKIM** CNAME or TXT; Resend shows exact names and values).

2. **Open Hostinger DNS** — hPanel → **Domains** → `zidaproject.com` → **DNS / DNS Zone** (or
   **Advanced DNS**). Do **not** change A/CNAME records that point the website to Hostinger unless
   Resend explicitly requires it (sending DNS is usually separate TXT/CNAME only).

3. **Add each Resend record in Hostinger**

   | Resend type | Hostinger field | Typical mapping |
   | --- | --- | --- |
   | TXT (SPF) | Type: TXT, Name/Host: `@` or `zidaproject.com` | Paste Resend **Value** exactly |
   | CNAME (DKIM) | Type: CNAME, Name: e.g. `resend._domainkey` | Target: Resend **Value** |
   | TXT (DKIM) | Type: TXT, Name: as shown by Resend | Paste Value exactly |

   **Hostinger tips:** Name/Host may need only the subdomain part (e.g. `resend._domainkey`), not
   the full FQDN. TTL: default is fine. Do not duplicate SPF TXT records — merge per Resend docs if
   one already exists (one SPF TXT per domain).

4. **Save and wait for propagation** — often 15–60 minutes; up to 48 hours. Optional check:
   [dnschecker.org](https://dnschecker.org) for TXT/CNAME on `zidaproject.com`.

5. **Verify in Resend** — Domains → `zidaproject.com` → **Verify**. Status should become **Verified**.

6. **Update app config (Phase 5 email wiring)** — add to `.env.local` and later Vercel:
   ```env
   RESEND_FROM_EMAIL="ZIDA Investment Platform <noreply@zidaproject.com>"
   ```
   Optional inquiry sender: `investments@zidaproject.com`. Template in [.env.example](.env.example).

7. **Send a test email** — after Phase 5 code lands, confirm From shows `@zidaproject.com` and
   delivery is not spam-foldered.

**Until DNS is verified**

- Resend API key works, but mail from `@zidaproject.com` will fail or follow sandbox rules.
- Local testing can use Resend's onboarding domain (send only to the account signup email).

**If verification fails**

- Re-copy values from Resend (no typos/trailing spaces).
- Confirm records in public DNS (`nslookup -type=TXT zidaproject.com`).
- Check Hostinger did not append the domain twice in the Name field.
- Docs: [Resend — Add and verify domain](https://resend.com/docs/dashboard/domains/introduction)

## Email verification — deferred decision (2026-07-22)

**Decision (approved):** Defer Hostinger DNS + Resend domain verification and mandatory email
verification until the **Phase 5 gate** — when the platform is closer to board-readiness — not
during Phase 1/2 scaffolding.

### During build / pilot

- Use **seeded test accounts** (one per role) documented for internal QA and board walkthrough prep.
- Configure Better Auth with **`requireEmailVerification: false`** (or equivalent) so
  registration/login works without `@zidaproject.com` DNS being verified.
- `RESEND_API_KEY` stays in env for future wiring; **no production sends from `@zidaproject.com`**
  until the DNS runbook above is executed and the domain shows **Verified** in Resend.
- Local/dev testing may use Resend's onboarding/sandbox rules (send only to the account signup email).

### Before board walkthrough (Phase 9 gate — pick one)

| Option | Approach | When to choose |
| --- | --- | --- |
| **A — Minimal** | Board uses **pre-provisioned accounts only** — no self-service signup requiring email delivery | Fastest path to demo; accounts handed on a test-accounts sheet |
| **B — Full** | Execute the [Resend DNS runbook](#resend-dns-runbook--zidaprojectcom-execute-when-ready), verify domain, wire Better Auth verification/reset through Resend, smoke-test deliverability | Board needs to experience registration + email confirmation end-to-end |

Either option is acceptable for the pilot; document the choice on the board-readiness checklist.

## Status checklist

- [x] **neon-schema** — Create Neon project (with a dev/preview branch), enable Managed Better Auth, and write Drizzle schema/migrations (taxonomies, projects + junction tables, project_documents, strategic_inquiries, investor_engagements, site_settings, audit_logs). *Migration run + seed complete (2026-07-22 Milestone 1). Dev/preview branch split still optional.*
- [ ] **authorization-hardening** — Write server-side role-enforcement (middleware + Route Handlers using Neon Auth sessions) per table/action, with RLS via `auth.user_id()` as defense-in-depth on the most sensitive tables. *Middleware auth-gate + `requireRole()` helper done; per-table RLS policies and privileged-mutation Route Handlers still open.*
- [x] **auth-middleware** — Neon Managed Better Auth, role-aware middleware, sign-in/sign-up, ensure-profile, pilot accounts, persona switcher removed, `useAuth()` cutover (Milestone 1–2). *Users & Roles CRUD admin UI still deferred.*
- [ ] **route-handlers** — Add Route Handlers for all privileged mutations: project status transitions/publish/override, qualified-investor approval, investor engagement approval
- [ ] **context-cutover** — Cut over each Context provider's internals to Neon-backed data via Drizzle (projects, taxonomies, lead-capture/inquiries, deal-room engagements, site-settings) while preserving hook signatures
- [ ] **route-renames** — Rename `-demo` routes to production routes (`/admin`, `/super-admin`, `/deal-room`)
- [ ] **documents-storage** — Wire real document upload/storage via Cloudflare R2 (behind a storage-adapter module) and Data Room signed-URL access, replacing string placeholders
- [ ] **email-notifications** — Add Resend for registration, inquiry, and approval notification emails, and as Better Auth's email backend (verification/reset). *Resend integration + DNS verification deferred to Phase 5 gate; pilot auth does not block on email (see [deferred decision](#email-verification--deferred-decision-2026-07-22)).*
- [ ] **nav-link-integrity** — Promote Contact to primary nav; centralize nav config in `lib/config/navigation.ts`; site-wide link audit (Fortune 100 QA bar). *Contact was utility-bar only with no mobile nav entry — fixed in 2026-07-22 pass; full audit re-run gates Phase 9.*
- [ ] **french-i18n** — Bilingual EN/FR platform. *Foundation landed 2026-07-22: locale context, message files, shell + homepage in French; full page translation gates Phase 6 and board-readiness.*
- [ ] **content-refresh** — Reconcile ZIDA 2024 Annual Report PPPs against the existing catalogue and refresh sourced-citation stats/content across the site
- [ ] **hosting-cutover** — Deploy to Vercel on a pilot subdomain/preview URL; prepare DNS cutover plan for post-approval public launch
- [ ] **board-readiness** — Prepare seeded test accounts, run authorization review, and assemble the board walkthrough checklist

## Where this plan comes from

This isn't a cold start. Prior sessions already left two documents that materially de-risk this migration:

- [BACKLOG.md](BACKLOG.md) ("Demo to SaaS migration map") already maps every Context store to an intended backend table, and explicitly names the Lesotho platform's `database/*.sql` migrations as the schema to adapt from.
- [MVP-BUILD-INSTRUCTION-CURSOR-v1.0.md](MVP-BUILD-INSTRUCTION-CURSOR-v1.0.md) frames the platform's ownership model: **Afronovation owns/operates the platform as proprietary SaaS; Zimbabwe/ZIDA/government users are a configured tenant** with entitlements — not the platform owner. This shapes the role model below (Afronovation stays super admin in production too).

Current-state audit (full detail from research, condensed here):

- **6 Context providers**, all backed by `localStorage`/`sessionStorage`, zero `app/api` routes, zero middleware, zero ORM/auth/email packages installed.
- **~32 seed projects** (`lib/data/seed-raw.ts`, 938 lines) converted via `lib/data/seed-converter.ts` into `InvestmentProject` (~40 fields) — the canonical shape is already production-grade; it just isn't backed by a real table.
- **"Auth" is a dropdown** (`components/shared/persona-switcher.tsx`) that calls `setPersona()` — no real login, no server-side check anywhere. `useDemoPersona()` has ~15 consumers across 14 files (moderate blast radius).
- **Entitlement gating is purely client-side** (`lib/entitlements/visibility.ts`) — trivially bypassable today; must move server-side for a government-facing platform.
- **Lead capture** (`context/lead-capture-context.tsx`) persists to `localStorage` only, no email/notification.
- **No file uploads anywhere** — `documents: string[]` are placeholder labels, not real files.

## Reference stack: Lesotho platform (`08 - Platform`) — schema/workflow only, not runtime

Confirmed: Lesotho runs Next.js 15 + React 19 + **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) for Auth, Postgres, and Storage. 12 SQL migrations (`001_schema.sql` → `012_lesotho_ministries_seed.sql`) with a solid table set (`profiles`, `projects`, `sectors`, `pillars`, `institutions`, `strategic_inquiries`, `documents`, `investor_proposals`, `audit_logs`, etc.).

**Zimbabwe diverges on the runtime, per an explicit call to move off Supabase** (recurring free-tier project-pause/cold-start issues on prior projects). The table/workflow *shape* below still borrows from Lesotho's structure — that part is Postgres-generic — but the services are:

- **Database**: Neon Postgres (serverless, branching, no pause behavior). Standard Postgres underneath — `pg_dump`/`pg_restore` (or Neon's own export tooling) moves the data to any other Postgres host later, so this carries no real portability risk.
- **Auth**: **Neon Managed Better Auth** (`@neondatabase/auth`) — users/sessions/OAuth config and RBAC live directly in a `neon_auth` schema inside the same Neon database, no third-party identity vendor. Every Neon branch gets its own **isolated** auth data — pilot board test accounts never mix with active dev-branch work.
- **ORM**: Drizzle (has an official Better Auth adapter, pairs with Neon's serverless driver).
- **File storage**: **Cloudflare R2**, not Vercel Blob — chosen specifically for portability. Vercel Blob is proprietary at the API layer (built on R2 internally, but only reachable through Vercel's own SDK), so migrating off it later means scripting a full download/re-upload of every file. R2 speaks the standard S3 API, so a future move — to AWS S3, another S3-compatible provider, or a **self-hosted MinIO instance on government infrastructure** if that's ever requested — is a credentials/endpoint change, not a rewrite. R2 also has zero egress fees (vs. Vercel Blob's ~$0.05/GB+ data-transfer charge), which matters once investor-pack/document downloads scale up. All access goes through a small internal storage-adapter module (`uploadDocument()` / `getDocumentUrl()` / `deleteDocument()`) so the rest of the app never calls the R2 SDK directly — a later provider swap changes one file, not every call site.

**Three gaps from the Lesotho audit are explicitly hardened here**, since these are exactly the kind of thing that erodes a government board's confidence if discovered:

1. RLS policies were "demo scope, not production-strict" — Zimbabwe's authorization must be real. Primary enforcement moves to **server-side role checks** (Next.js middleware + Route Handlers/Server Components using `auth.getSession()`); real Postgres RLS via `auth.user_id()` is layered on top as defense-in-depth on the most sensitive tables (`projects`' financial columns, `investor_engagements`, `strategic_inquiries`), not as the only line of defense.
2. Role checks were client-side only; `middleware.ts` only checked "logged in?", not role — Zimbabwe's `middleware.ts` checks the actual role from the session, per protected route prefix.
3. The investor-approval → Deal Room loop was incomplete (no admin UI to set approval status, inserts often omitted `project_id`) — Zimbabwe's equivalent (`deal-room-store-context.tsx`'s `InvestorEngagement`) must ship complete.
4. **New, Zimbabwe-specific hardening**: `/super-admin`'s "Users & Roles" tab today (`app/super-admin-demo/page.tsx`) is a static, read-only reference table. With Better Auth's admin plugin, this becomes a **real** CRUD surface — list actual users, assign/change role, activate/deactivate accounts.

## Target role model (kept minimal for the pilot)

Map directly onto the access levels already implemented in `lib/entitlements/visibility.ts` and `demo-persona-context.tsx`, rather than jumping straight to all 10 personas listed in `MVP-BUILD-INSTRUCTION-CURSOR-v1.0.md` section 13 (Diaspora Investor, Project Owner, Embassy Desk User, etc. — real but not yet wired into any actual gating logic today):

- `registered`, `qualified`, `government`, `admin` (ZIDA/tenant), `super_admin` (Afronovation) — five real roles + unauthenticated `public`.
- Expanding to the full persona set is a fast-follow after the pilot, not a pilot blocker — call this out explicitly to the board as the next-phase roadmap so it reads as intentional sequencing, not a gap.

## Phase 1 — Neon foundation & schema (Week 1)

- New Neon project (name TBD, e.g. `zimbabwe-investment-platform`; region to be chosen and disclosed — same data-residency note as before, now scoped to Neon's region options, aligning with `app/legal/page.tsx`'s existing data-sovereignty language).
- Enable **Managed Better Auth** on the project (Neon Console) — provisions the `neon_auth` schema, an auth service URL, and a cookie-signing secret.
- Branching: a `main` branch (pilot → production data) and a `dev`/`preview` branch for schema iteration — auth data branches too, so board test accounts on `main` stay isolated from active dev work.
- Drizzle schema/migrations, shaped like Lesotho's tables but Zimbabwe-specific:
  - Lookup/taxonomy tables: `sectors`, `subsectors`, `strategic_pillars`, `sdgs`, `ministries`, `agencies_regulators`, `contact_reasons`, `provinces`, `user_roles` — directly mirroring `lib/data/taxonomies.ts`'s existing shapes so the seed migration is a straight port, not a redesign.
  - `projects` — mirrors `InvestmentProject` (`lib/types/index.ts`, ~40 fields) with FK columns for `sector_id`/`subsector_id`/`primary_beneficiary_ministry_id`/`implementing_agency_id`, plus junction tables `project_pillars`, `project_sdgs`, `project_secondary_ministries`, `project_regulators` for the array fields.
  - `project_documents` — real files via Cloudflare R2, replacing the `documents: string[]` placeholders; columns: `project_id`, `title`, `storage_key` (e.g. `projects/{project_id}/{document_id}-{filename}`), `visibility_level`, `uploaded_by`.
  - `strategic_inquiries` — mirrors `LeadInquiry` (all wizard fields already defined) + `status`, `reviewed_by`, `reviewed_at`.
  - `investor_engagements` — mirrors `InvestorEngagement` (`context/deal-room-store-context.tsx`) + a **complete** approval flow (see Phase 3).
  - `site_settings` — `cost_structure_hidden`, `flash_banner` (the flash-banner feature already spec'd in a separate plan slots straight into this table).
  - `audit_logs` — who did what when; every approve/publish/override/status-change writes a row. This is a trust-building feature worth surfacing to the board directly (a real "Governance Audit Trail" view in `/super-admin`).
  - User profile fields (`role`, `organization`, `ministry_id`, `account_status`) attach to `neon_auth.user` via a linked `profiles` table (1:1 on user id) rather than a separate auth system.
- Authorization approach per table: primary enforcement server-side (Phase 2); Postgres RLS via `auth.user_id()` layered on `projects` (financial columns), `investor_engagements`, and `strategic_inquiries` as defense-in-depth, not the sole mechanism.

## Phase 2 — Real authentication & hardened authorization (Week 1)

- Neon Managed Better Auth: email/password to start (`@neondatabase/auth`), using its Next.js server SDK (`createNeonAuth`, `.middleware()`, `.getSession()`) and client SDK for client components.
- Better Auth configured for pilot with **`requireEmailVerification: false`** — Resend is **not** wired as the email backend until the Phase 5 gate (see [deferred decision](#email-verification--deferred-decision-2026-07-22)); one integration point at Phase 5, not a second email vendor.
- `middleware.ts`: built on `auth.middleware()`, extended to enforce **role-level** checks per protected route prefix (`/admin`, `/super-admin`, `/deal-room`), not just "is logged in."
- Server-side authorization for every privileged mutation (approve project, publish, override status/visibility, approve qualified-investor status, approve investor engagement) via Next.js Route Handlers checking the session's role — never trust client-side role checks alone.
- **Real "Users & Roles" admin surface**: replace `/super-admin`'s static `userRoles` table with a live view over Better Auth's admin plugin — list registered users, assign/change role, activate/deactivate.
- Remove `components/shared/persona-switcher.tsx` from the public UI. Replace with a small set of **real seeded test accounts**, one per role, documented in a short "test accounts" sheet handed to the board so they can log in and experience the platform as each persona themselves.
- Update all ~15 `useDemoPersona()` consumer files to a new `useAuth()`/`useSession()` hook with the same derived-boolean shape (`isRegistered`, `isQualified`, `isAdmin`, `isSuperAdmin`, `isGovernment`) so consuming components need minimal changes.

## Phase 3 — Data layer cutover (Week 2)

For each Context provider, replace its internal implementation (fetch/mutate against Neon via Drizzle instead of localStorage/sessionStorage) while keeping the same hook signature wherever practical:

- `project-store-context.tsx` → reads from `projects` table (RSC or client fetch), `updateProject`/`addProject` route through Route Handlers enforcing `lib/governance/project-workflow.ts`'s existing `canTransition`/`getAvailableActions` (already pure, role-parameterized functions — reusable as-is, just fed a real role instead of a persona string).
- `lead-capture-context.tsx` → `strategic_inquiries` table; `addInquiry` triggers an email notification (Phase 5); `updateInquiryStatus("approved")` for an `engagementType: "investor"` inquiry should **actually flip the user's role to `qualified`** in `profiles` — closing the loop Lesotho left open.
- `taxonomy-store-context.tsx` → admin-managed taxonomy tables + CRUD Route Handlers.
- `deal-room-store-context.tsx` → `investor_engagements` with a **working** admin approval UI — approving sets `status = 'approved'`, which is the actual gate checked before Deal Room access, and the insert path always captures `project_id`.
- `site-settings-context.tsx` → `site_settings` row (includes the flash-banner feature).
- Route renames: `/admin-demo` → `/admin`, `/super-admin-demo` → `/super-admin`, `/deal-room-demo` → `/deal-room`.

## Phase 4 — Documents & file storage (Week 2)

- Build `lib/storage/` adapter (thin wrapper around `@aws-sdk/client-s3` pointed at R2's S3-compatible endpoint): `uploadDocument()`, `getSignedDocumentUrl()`, `deleteDocument()` — this is the only module that knows it's talking to R2, so a future provider swap is contained here.
- Cloudflare setup needed: an account, one R2 bucket (e.g. `zimbabwe-project-documents`), and a bucket-scoped API token (Access Key ID + Secret Access Key + Account ID). No public bucket access — every document stays private.
- Wire the Data Room UI (`app/projects/[slug]/page.tsx`) to real `project_documents` rows + short-lived signed URLs from the adapter (access mediated by a Route Handler that checks role before generating the URL), gated by `visibility_level`.
- Admin project form (`components/admin/project-form.tsx`) gains a real file upload control for feasibility studies/investor packs, replacing the comma-separated text field.

## Phase 5 — Notifications (Week 3)

**Gate:** This phase includes executing the [Resend DNS runbook](#resend-dns-runbook--zidaprojectcom-execute-when-ready) if Option B (full email) is chosen for the board demo.

- Add [Resend](https://resend.com) for transactional email: registration confirmation, new-inquiry alert to ZIDA/Afronovation admins, qualified-investor approval notice to the investor, contact-form confirmation.
- Better Auth's verification/password-reset emails route through this same Resend integration (one email vendor, not two). Enable `requireEmailVerification` here if the board demo requires self-service signup with email delivery.

## Phase 6 — Content refresh from the new source documents (Week 3)

Pulled the ZIDA 2024 Annual Report in full plus current VFEX market data:

- **Reconcile 2024 PPPs against the existing 32-project catalogue.** The report names 8 PPPs worth $770M (Harare-Nyamapanda Road $263M, Chirundu Border Post modernization $67M, Palm River SEZ $800M energy/metallurgical infrastructure, Masuwe SEZ cricket stadium $7.5M, plus cable manufacturing and others) — some overlap with existing seed projects, others don't. Add the missing ones as new draft projects through the real admin workflow built in Phase 3.
- **Refresh sourced-citation content** with 2024 figures: 709 licences issued (up from 615 in 2023), $8.63B total projected investment, the Single Window for Investor Entry (with UNCTAD), the DIY Licensing Portal (5-day processing), and the Investor Grievance Response mechanism — cited as "ZIDA 2024 Annual Report."
- **trade.gov and IDBZ** — fetched pages were mostly navigation shells linking to PDFs/subpages rather than extractable body content. Flag as a small follow-up content task; low risk, incremental enrichment only.

## Phase 7 — VFEX: scoped explicitly as post-pilot roadmap (not built now)

Strategic but not urgent. Captured here so it isn't lost:

- VFEX (Victoria Falls Stock Exchange) is Zimbabwe's USD-denominated bourse — 19 listed companies, ~$3.8B market cap, now exceeding the ZSE, with recent momentum (Econet InfraCo's $1B listing, Old Mutual's return). It represents a **public/secondary-market equity channel**, distinct from this platform's current focus (FDI/greenfield project pipeline).
- Recommended future shape: a "Capital Markets Access" section/page cross-referencing VFEX-listed companies relevant to priority sectors (e.g. Mining → Caledonia Mining, Padenga Holdings; ICT/Infrastructure → Econet InfraCo), backed by an admin-managed table (not hardcoded) since listings/market caps change.
- Not scheduled in this pilot; revisit after the board's validation.

## Phase 8 — Hosting cutover (Week 3)

- Deploy to **Vercel** (Hostinger's current static hosting can't run Next.js middleware/Route Handlers/SSR against a database) on a **separate pilot subdomain or preview URL first** — do not touch the live `www.zidaproject.com` (currently on Hostinger) until the board approves.
- Once approved: cut DNS over to Vercel for the public launch.
- Environment variables: `DATABASE_URL` (pooled, app runtime queries), `DATABASE_URL_UNPOOLED` (direct, for Drizzle migrations), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (after domain verified), `NEXT_PUBLIC_SITE_URL` (update `lib/config/site.ts`'s fallback once the pilot URL is known).

## Navigation & link integrity (pre–Phase 3 + Phase 9 gate)

Fortune 100–grade navigation and link audit — implemented incrementally, fully re-verified before the board demo.

### Primary nav — Contact

- **Contact** in primary header nav ([`lib/config/navigation.ts`](lib/config/navigation.ts) → [`site-header.tsx`](components/layout/site-header.tsx)), desktop and mobile sheet — after Afronovation, before Register.
- Utility bar retains FAQ only (Contact deduplicated from utility strip once in primary nav).
- Footer Platform Navigation includes Contact; footer copy no longer directs users to "the bar above."

### Single source of truth

Nav link arrays live in [`lib/config/navigation.ts`](lib/config/navigation.ts):

- `primaryNavLinks` — header + mobile
- `footerPlatformLinks`, `footerExecutiveLinks`, `footerLegalLinks` — footer columns
- `utilityNavLinks` — utility bar

### Site-wide link audit checklist (Phase 9 gate)

| Area | Checks |
| --- | --- |
| Static routes (19 pages under `app/**/page.tsx`) | Each reachable from nav, footer, or intentional deep link |
| Dynamic routes (`/sectors/[sector]`, `/projects/[slug]`) | Slugs resolve; no 404s for published projects |
| Legal anchors (`/legal#privacy`, `#terms`, `#cookies`) | Anchor IDs exist on `app/legal/page.tsx` |
| Demo → prod routes (`/admin-demo`, etc.) | Re-audit after Phase 3 renames |
| Sitemap (`app/sitemap.ts`) | Matches public routes; demo admin routes excluded |
| Internal CTAs (FAQ, strategic-partnerships, about-afronovation) | `/contact`, `/register`, `/strategic-partnerships` consistent |
| External links | `rel="noopener noreferrer"` where `target="_blank"` |
| Breadcrumbs (`sticky-breadcrumb.tsx`) | Parent links resolve |
| Mobile parity | Every primary nav item in hamburger menu including Contact |
| QA bar | Zero broken internal links on public surfaces; Contact reachable in ≤2 clicks |

Optional follow-up at Phase 8: automated link-check in CI against Vercel preview URL.

## French i18n (EN/FR)

Zimbabwe's investment promotion audience includes Francophone institutional investors and
partners across Africa and beyond — French is a **production requirement**, not a nice-to-have.

### Architecture (landed 2026-07-22)

| Piece | Location | Notes |
| --- | --- | --- |
| Locales | `lib/i18n/locales.ts` | `en` (default), `fr` |
| Message catalogs | `lib/i18n/messages/en.ts`, `fr.ts` | Typed `SiteMessages`; add keys in both files |
| Runtime | `context/locale-context.tsx` | `LocaleProvider`, `useLocale()`, `useTranslations()` |
| Persistence | `localStorage` + `zim-locale` cookie | Preference survives refresh; cookie enables future SSR locale |
| Switcher | `components/layout/language-switcher.tsx` | Utility bar EN / FR toggle (replaces "Coming Soon") |

### Translation coverage

| Tier | Scope | Status |
| --- | --- | --- |
| **Tier 1 — Shell** | Header, footer, utility bar, breadcrumbs, platform name | Done |
| **Tier 2 — Homepage** | Hero carousel, classification strip, strategic directory, featured projects, engagement pathway, access tiers, bottom CTA | Done |
| **Tier 3 — Marketing pages** | `/opportunity`, `/platform`, `/strategic-alignment`, `/sectors`, `/projects`, `/zimbabwe`, `/contact`, `/faq`, `/legal`, `/register`, `/strategic-partnerships`, `/investor-journey`, `/about-afronovation` | **Phase 6 gate** |
| **Tier 4 — Dynamic content** | Project titles/descriptions, taxonomy labels from DB post-cutover | **Post Phase 3** — optional `locale` column or translation table |
| **Tier 5 — SEO** | `hreflang`, `/fr/` URL prefix (if adopted), localized metadata | **Phase 8 / board-readiness** |

### Implementation rules

- New user-facing strings: add to **both** `en.ts` and `fr.ts` in the same PR — no English-only additions.
- Prefer `useTranslations()` in client components; for Server Components, read `zim-locale` cookie via `cookies()` once page migration begins.
- Professional French tone: institutional investment platform, not machine-translated marketing fluff.
- Board-readiness: FR switcher works on all pages visited in a typical walkthrough (Tier 1–3 complete).

### Future: URL-based locales (optional upgrade)

Current approach uses a client-side locale preference (no URL change). For public launch SEO,
consider migrating to `/fr/...` prefix routes via Next.js i18n routing or `next-intl` — document
decision at Phase 8 hosting cutover.

## Phase 9 — Board-readiness checklist (Week 4 buffer)

- Seeded real test accounts per role, documented for the board.
- **Navigation & link integrity sign-off** — header, footer, mobile, breadcrumbs, sitemap, legal anchors (re-run after `-demo` route renames).
- **French i18n sign-off** — Tier 3 marketing pages translated; FR switcher verified on board walkthrough path.
- RLS + Route Handler authorization review (the specific hardening this plan calls for, re-verified before demo day).
- Full responsive/perf pass (already largely done per prior sessions — spot-check post-cutover).
- A short, honest "what's real vs. still simulated" note prepared internally — transparency here protects credibility better than a gap being discovered live.
- Backup/rollback plan for the Neon project before the live walkthrough (Neon's branching makes this cheap — snapshot/branch `main` immediately before the board session).

## Explicitly out of scope for this pilot

- Full 10-persona model (Diaspora Investor, Project Owner, Embassy Desk User, etc.) — fast-follow.
- VFEX integration — Phase 7, post-pilot.
- Deep trade.gov/IDBZ content extraction — small follow-up task.
- Government SSO / official ZIDA identity federation — real email/password accounts for the pilot; revisit if the board requires SSO for full public launch.

## Cross-references

- [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md) — living record of what's already been built and why; update this after each phase of the migration lands, same as every prior page redesign.
- [BACKLOG.md](BACKLOG.md) — deferred items, including the original "Demo to SaaS migration map" this plan formalizes, and the platform-template documentation initiative that follows once this migration is complete.
- [MVP-BUILD-INSTRUCTION-CURSOR-v1.0.md](MVP-BUILD-INSTRUCTION-CURSOR-v1.0.md) — the platform's original mission/ownership brief.
