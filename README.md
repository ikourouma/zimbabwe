# Zimbabwe Digital Investment & Economic Intelligence Platform

Production pilot for **ZIDA** stakeholder walkthroughs. Powered by **Afronovation**.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill Neon, R2, Resend, auth URLs
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pilot accounts (UAT)

Six role-based accounts live at `@zidaproject.com` (password in `PILOT_ACCOUNT_PASSWORD`):

| Role | Email | Home |
| --- | --- | --- |
| Registered | `registered+pilot@` | `/projects` |
| Qualified investor | `qualified+pilot@` | `/deal-room` |
| Government reviewer | `government+pilot@` | `/deal-room` |
| Ministry admin | `ministryadmin+pilot@` | `/ministry` |
| Platform admin | `admin+pilot@` | `/admin` |
| Super admin | `superadmin+pilot@` | `/super-admin` |

See [docs/UAT-Test-Guide.md](docs/UAT-Test-Guide.md) for per-role walkthrough paths.

## Demo / UAT scripts

```bash
npm run seed:demo          # idempotent lifecycle states for walkthrough
npm run smoke              # six-role API + route smoke test (localhost)
npm run smoke -- https://www.zidaproject.com   # against production

npx tsx --env-file=.env.local scripts/cleanup-test-accounts.ts          # dry-run
npx tsx --env-file=.env.local scripts/cleanup-test-accounts.ts --confirm  # delete smoke accounts
```

## Workspace routes

| Surface | Path |
| --- | --- |
| Public registry | `/`, `/projects`, `/sectors`, `/contact` |
| Deal Room (qualified+) | `/deal-room` |
| Ministry console | `/ministry` |
| Platform admin | `/admin` |
| Super admin | `/super-admin` |

Legacy `-demo` preview routes have been retired; auth is real Neon Better Auth.

## Stack

| Layer | Technology |
| --- | --- |
| App | Next.js 15 (App Router), TypeScript, Tailwind v4 |
| Database | Neon Postgres + Drizzle ORM |
| Auth | Neon Managed Better Auth |
| Storage | Cloudflare R2 (private documents) |
| Email | Resend (`zidaproject.com`) |
| Hosting | Hostinger Node.js (`www.zidaproject.com`) |

Migration history and env checklist: [PRODUCTION_MIGRATION_PLAN.md](PRODUCTION_MIGRATION_PLAN.md).

## Data

- Seed source: `docs/data/Zimbabwe_ZIDA_Seed_Projects_v1.0.md`
- Illustrative records are marked **pending official validation**
