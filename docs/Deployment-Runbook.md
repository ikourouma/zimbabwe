# Deployment runbook

One-page checklist for a new environment. The Hostinger lesson from `PRODUCTION_MIGRATION_PLAN.md`: a build with empty env vars will "run" and then every sign-in fails.

## 1. Environment variables

Copy `.env.example` → host env panel (or `.env.local` for a laptop).

Required:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled Postgres |
| `DATABASE_URL_UNPOOLED` | Neon direct (Drizzle Kit) |
| `NEON_AUTH_BASE_URL` | Managed Better Auth |
| `NEON_AUTH_COOKIE_SECRET` | 32+ chars |
| `NEXT_PUBLIC_SITE_URL` | Canonical public origin, e.g. `https://zidaproject.com` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Private document/avatar storage |
| `RESEND_API_KEY` | Invite + review notification email |
| `RESEND_FROM_EMAIL` | Must be on a **verified** Resend domain |

Optional: `PILOT_ACCOUNT_PASSWORD` for seeded QA accounts only.

## 2. Neon Auth

In Neon Console → Auth:

- Add trusted origins: production origin **and** `www` if served
- Turn **Require email verification** on before open public registration
- Confirm the cookie domain matches the live host

## 3. Database

```
npm run db:migrate
npx tsx --env-file=.env.local scripts/wave3-schema.ts
npx tsx --env-file=.env.local scripts/wave4-rls.ts
npm run db:seed
```

`db:push` is interactive and may propose unrelated destructive enum rewrites. Prefer targeted SQL scripts for incremental columns.

## 4. Email

- Verify the sending domain in Resend
- Send one Invite user from Users & Roles
- File a test amendment and confirm ZIDA inboxes (or accept that an invalid key only logs a 401 and does not roll back the card)

Until the domain is verified, Invite still writes an audit row; delivery returns `queued_or_unconfigured`.

## 5. What "done" means

- Sign-in with a seeded admin lands on `/admin` (or `/super-admin`)
- A registered user hitting `/admin` is redirected to `/deal-room`, not told to sign in
- Public legal/footer copy does not claim localStorage-only
- Review Queue shows submissions, amendments, and association requests
- Entitlement Management on Site Settings changes live field masking
- Investor Propose a Project Financials step shows E1 + E2 + E3; government create shows E1 only
- Account → Security can change password, enroll TOTP, and revoke sessions
- Document Vault lists NDA / accreditation / MOU snapshots

## 6. Explicitly not done

- MOU e-sign
- VDR per-viewer watermarking
- Province free-text → `provinceId` (blocked on ZIDA content review)
- Full automated test suite
- Multi-tenant country template settings (Zimbabwe/ZIDA remain hardcoded)
