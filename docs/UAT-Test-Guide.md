# UAT Test Guide — Zimbabwe Investment Platform

**Environment:** `https://www.zidaproject.com` (production pilot) or `http://localhost:3000` (local)  
**Password:** value of `PILOT_ACCOUNT_PASSWORD` in deployment env (shared with UAT team out-of-band)

All seeded content is illustrative and marked *pending official validation*.

---

## 1. Registered investor — `registered+pilot@zidaproject.com`

1. Sign in → lands on `/projects`.
2. Browse registry — financial fields (IRR, NPV, ROI) are **hidden**.
3. Open a published project detail — gated sections show registration prompts.
4. Submit contact form at `/contact` — success only after server confirms (button disabled while submitting).
5. Confirm `/admin`, `/ministry`, `/super-admin` redirect or deny access.

## 2. Qualified investor — `qualified+pilot@zidaproject.com`

1. Sign in → `/deal-room` pipeline.
2. Registry API returns financial fields on published projects.
3. Open project detail — full financials visible (no flash before auth resolves).
4. **Vault** (`/deal-room/vault`) — skeleton while loading; upload shows error toast on failure.
5. **Engagements** — submit or view an engagement; MOU panel allows co-draft while status is `drafting`.
6. **NDA gate** — skeleton while session loads, then NDA accept or bypass if already accepted.

## 3. Government reviewer — `government+pilot@zidaproject.com`

1. Sign in → Deal Room with government-scoped pipeline.
2. Review queue items for assigned ministry projects.
3. Secondary-beneficiary projects appear **read-only** (no false edit affordances).
4. MOU workflow — delegate assigned user can act on behalf of ministry party.

## 4. Ministry admin — `ministryadmin+pilot@zidaproject.com`

1. Sign in → `/ministry` dashboard (404 on production = deploy not current).
2. Review queue scoped to own ministry only.
3. Association-request cards filtered to own ministry.
4. MOU field comments — can post comments as ministry admin.
5. Cannot access `/admin` or `/super-admin`.

## 5. Platform admin — `admin+pilot@zidaproject.com`

1. Sign in → `/admin`.
2. **Review queue** — approve/reject `submitted_for_review` project (seeded by `npm run seed:demo`).
3. **Inquiries** — POST forces `pending` status; ministry admins only see own ministry inquiries.
4. **Projects** — approved/published projects lock content edits for reviewers.
5. Cannot access `/super-admin`.

## 6. Super admin — `superadmin+pilot@zidaproject.com`

1. Sign in → `/super-admin`.
2. Users & roles, taxonomies, site settings.
3. KPI link → `/super-admin/inquiries`.
4. Full cross-ministry visibility.

---

## Seeded demo records (`npm run seed:demo`)

| Artifact | Purpose |
| --- | --- |
| Project in `submitted_for_review` | Admin review-queue happy path |
| MOU statuses: `in_review`, `both_approved`, `finalized`, `ready_for_signature` | MOU lifecycle UI |
| Accreditation document (qualified pilot) | Vault / accreditation queue |
| Project team assignment | Team tab on project |
| Announcement + marketing popup | Comms surfaces |
| Site content block `uat_demo_callout` | CMS block |
| MOU field comment | Comment thread on MOU |

Re-running the script is idempotent — existing records are skipped.

---

## Automated checks

```bash
npm run smoke                              # localhost
npm run smoke -- https://www.zidaproject.com
```

Validates sign-in, `/api/me` role, financial field gating, home route, and forbidden paths for all six roles.

---

## Known limitations (pilot)

- Email verification controlled by `REQUIRE_EMAIL_VERIFICATION` env flag.
- Resend requires verified `RESEND_FROM_EMAIL` domain for production deliverability.
- Production must be rebuilt on Hostinger after each `main` push — verify `/ministry` and `/api/me` schema before board walkthrough.
- VFEX integration, government SSO, and full 10-persona model are post-pilot.
- Document downloads return 404 JSON if R2 object missing (run `scripts/backfill-pending-documents.ts` after fresh DB seed).

---

## Cleanup

Remove ad-hoc smoke accounts (never pilot accounts):

```bash
npx tsx --env-file=.env.local scripts/cleanup-test-accounts.ts
npx tsx --env-file=.env.local scripts/cleanup-test-accounts.ts --confirm
```
