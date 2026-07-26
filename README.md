# Zimbabwe Digital Investment & Economic Intelligence Platform

Showcase MVP for the July 10, 2026 government meeting. Powered by **Afronovation**.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo flow

1. `/` — Landing and featured projects
2. `/projects` — Search/filter registry (try "Renewable Energy" + "Hwange")
3. `/projects/hwange-50mw-solar-power-plant-project` — Gated detail → register
4. `/admin-demo` — Project CRUD, review queue, inquiries
5. `/super-admin-demo` — Taxonomies, analytics, publishing override
6. `/about-afronovation` — Platform ownership narrative

## Persona switcher

Use the header dropdown to simulate: Public → Registered → Qualified → Admin → Super Admin.

## Data

- Seed source: `docs/data/Zimbabwe_ZIDA_Seed_Projects_v1.0.md`
- Converted projects: `lib/data/zimbabwe-projects.ts` (30 ZIDA records)
- All data marked **pending official validation**

## Stack

The **live site on Hostinger** (`www.zidaproject.com`) still runs the client-side demo (persona
switcher + `localStorage`) until Phase 3 cutover. The production backend below is provisioned and
documented in [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md).

### Frontend / app

| Technology | Role |
| --- | --- |
| Next.js 15 | App Router, SSR, Route Handlers, middleware |
| TypeScript | Type-safe application code |
| Tailwind CSS v4 | Design system and responsive UI |
| Radix UI / shadcn-style | Accessible UI primitives |

### Production backend (pilot — in progress)

| Service | Role |
| --- | --- |
| **Neon Postgres** | Primary database — projects, taxonomies, inquiries, engagements, site settings, audit logs. Serverless Postgres with branching; standard Postgres underneath for portability (`pg_dump` / export). Project: `zimbabwe-investment-platform`. |
| **Neon Managed Better Auth** | Authentication and sessions — email/password, user accounts in `neon_auth` schema, integrated with the same Neon DB. Beta; replaces demo persona switcher in Phase 3. |
| **Drizzle ORM** | Type-safe schema, migrations, and queries against Neon (`lib/db/schema/`, `lib/db/migrations/`). |
| **Cloudflare R2** | Private document storage (investor packs, feasibility studies) via S3-compatible API. Bucket: `zimbabwe-investment-platform`. Zero egress fees; portable to other S3-compatible hosts or self-hosted MinIO if government requests rehosting. |
| **Resend** | Transactional email — registration confirmations, inquiry alerts, qualified-investor approvals, Better Auth verification/reset. API key scoped to `zimbabwe-investment-platform`; domain `zidaproject.com` added (DNS pending — see plan runbook). |
| **Vercel** (planned Phase 8) | Pilot/staging host for SSR + middleware + API routes (Hostinger static export cannot run the Neon-backed app). |
