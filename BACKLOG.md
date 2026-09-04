# Backlog

Living list of **deferred** work. The platform is Neon-backed (Postgres, Drizzle, Neon Auth, R2, Resend). Do not treat older "no backend / demo persona" notes as current — those claims were true of the 2026 client-only prototype and are no longer accurate.

Training material lives in `docs/` (MOU, amendments, review queue, ministry scoping, role map, inquiries, public-site ops, deployment runbook).

## Deferred by product decision

- **MOU e-signature.** Lifecycle ends at metadata `executed`. No vendor integration.
- **VDR per-viewer watermarking.** Preview/download audit events exist; there is no dynamic overlay on the file bytes.
- **Province FK cleanup.** Seed `province` text is messy. Needs ZIDA content judgment before `provinceId`.

## Polish that can follow training

- Remaining SEO / JSON-LD on marketing pages
- `llms.txt` and richer answer-engine markup
- Live sector-stats parity on `/sectors` (some pages still use static seed helpers)
- Light/dark consistency on leftover marketing pages
- In-app notification read-state in the database (bell is still localStorage last-seen)

## Platform template (post-Zimbabwe)

Zimbabwe is the reference implementation for a reusable country template. Still to write when this instance is feature-frozen:

- Country-agnostic design-system spec (today: `KNOWLEDGE_BASE.md`)
- Portable schema/seed pack (today: `lib/db/schema/` + `lib/db/seed/`)
- Multi-tenant tenant settings (country name, authority name, and branding are still Zimbabwe/ZIDA hardcoded)

## Historical migration map

The Context → API cutover described in `PRODUCTION_MIGRATION_PLAN.md` **has landed**. Providers fetch Neon via Route Handlers. The demo persona switcher is gone. `-demo` routes are leftovers, not the live consoles.

Do not re-open "build a backend" as a backlog item.
