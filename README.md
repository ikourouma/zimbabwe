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

Next.js 15 · TypeScript · Tailwind CSS v4 · shadcn-style UI · Client-side demo state (no backend)
