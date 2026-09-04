# Backlog

Living list of **deferred** work. The platform is Neon-backed (Postgres, Drizzle, Neon Auth, R2, Resend). Do not treat older "no backend / demo persona" notes as current — those claims were true of the 2026 client-only prototype and are no longer accurate.

Training material lives in `docs/` (MOU, amendments, review queue, ministry scoping, role map, inquiries, public-site ops, deployment runbook).

## Deferred by product decision

- **MOU e-signature.** Lifecycle ends at metadata `executed`. No vendor integration.
- **VDR per-viewer watermarking.** Preview/download audit events exist; there is no dynamic overlay on the file bytes.
- **Province FK cleanup.** Seed `province` text is messy. Needs ZIDA content judgment before `provinceId`.

## Post-pilot

- **Dedicated Access Requests page.** Today, qualified-investor applications are a filtered view
  inside `/admin/inquiries` and `/super-admin/inquiries` (Qualified Investor banner + pilot
  closeout plan), reusing the same table and the unified `user.role_changed` audit spine both
  role-grant paths (inquiry approval and the manual Users-console edit) now emit. Build a real
  page over that same data once volume justifies dedicated nav — no migration needed, since the
  table and audit trail are already shaped for it. **Revocation gap:** there is currently no flow
  anywhere in the product that moves an account from `qualified` back to `registered` — the manual
  Users-console role edit can technically do it, but nothing prompts or governs that decision (no
  reason-required "why is this being revoked", no applicant-facing notice, no re-check of whether
  they still hold an approved application). That gap is the strongest argument for the dedicated
  page once it's built.

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
