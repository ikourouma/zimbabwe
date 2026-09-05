# UAT Test Guide — Zimbabwe Investment Platform

**Environment:** `https://www.zidaproject.com` (production pilot) or `http://localhost:3000` (local)  
**Password:** value of `PILOT_ACCOUNT_PASSWORD` in deployment env (shared with UAT team out-of-band)

All seeded content is illustrative and marked *pending official validation*.

---

## 1. Registered investor — `registered+pilot@zidaproject.com`

1. Sign in → lands on `/deal-room`. `lib/auth/post-login-destination.ts` sends every non-staff role there; the Investor Dashboard is tiered rather than qualified-only, so a registered user gets Overview, Pipeline, Saved Projects, Document Vault, My Activity Report, My Profile and Account. Engagements, MOU Registry, My Proposals, Team and Communication Hub stay hidden until qualification.
2. Browse the registry at `/projects` — financial fields (IRR, NPV, ROI) are **hidden**.
3. Open a published project detail — gated sections show registration prompts.
4. Submit contact form at `/contact` — success only after server confirms (button disabled while submitting).
5. Type `/admin` then `/super-admin` straight into the address bar — each shows "You do not have access to this console", then lands on `/deal-room`.
6. Type `/ministry` straight into the address bar — a brief skeleton is expected here instead of that notice (see Known limitations), but it must still land on `/deal-room`. Coming to rest on a Ministry Desk shell is a failure.

## 2. Qualified investor — `qualified+pilot@zidaproject.com`

1. Sign in → `/deal-room` pipeline.
2. Registry API returns financial fields on published projects.
3. Open project detail — full financials visible (no flash before auth resolves).
4. **Vault** (`/deal-room/vault`) — skeleton while loading; upload shows error toast on failure.
5. **Engagements** — submit or view an engagement; MOU panel allows co-draft while status is `drafting`.
6. **NDA gate** — skeleton while session loads, then NDA accept or bypass if already accepted.
7. Type `/ministry` straight into the address bar — brief skeleton, then lands on `/deal-room`. Coming to rest on a Ministry Desk shell is a failure.

## 3. Government reviewer — `government+pilot@zidaproject.com`

1. Sign in → Deal Room with government-scoped pipeline.
2. Review queue items for assigned ministry projects.
3. Secondary-beneficiary projects appear **read-only** (no false edit affordances).
4. MOU workflow — delegate assigned user can act on behalf of ministry party.
5. Type `/ministry` straight into the address bar — brief skeleton, then lands on `/deal-room`. A government reviewer is not a ministry official; coming to rest on a Ministry Desk shell is a failure.

## 4. Ministry admin — `ministryadmin+pilot@zidaproject.com`

1. Sign in → `/ministry` dashboard. A skeleton that never fills in means the deploy is stale — confirm the commit via `/api/version` rather than guessing.
2. Review queue scoped to own ministry only.
3. Association-request cards filtered to own ministry.
4. MOU field comments — can post comments as ministry admin.
5. Cannot access `/admin` or `/super-admin` — each shows "You do not have access to this console", then lands on `/ministry`.
6. Type `/deal-room` straight into the address bar — a brief skeleton instead of that notice, then it must land on `/ministry`. Coming to rest on an Investor Dashboard shell is a failure.

## 5. Platform admin — `admin+pilot@zidaproject.com`

1. Sign in → `/admin`.
2. **Review queue** — approve/reject `submitted_for_review` project (seeded by `npm run seed:demo`).
3. **Inquiries** — POST forces `pending` status; ministry admins only see own ministry inquiries.
4. **Projects** — approved/published projects lock content edits for reviewers.
5. Cannot access `/super-admin` — shows "You do not have access to this console", then lands on `/admin`.

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

The first line of output reports the deployed commit, e.g. `Build: 413e59a built ...`. If that does not match the commit you expect, the deploy did not land and the rest of the run means nothing.

What the run does and does not prove:

- `denied /admin` and `denied /super-admin` are checked end to end — the response carries the access-denied bounce and no console markup.
- `no-store /<console>` confirms the `Cache-Control` header that stops a shared cache reusing one user's console. `Vary: Cookie` is deliberately not asserted; LiteSpeed's compression overwrites it with `Accept-Encoding` on this host.
- The two lines marked `(client-gated shell)` are weaker. They prove only that no console content is served for `/deal-room` and `/ministry`. The redirect itself happens after hydration and is invisible over HTTP, so it is verified by the address-bar steps in sections 1-4 above.

---

## Known limitations (pilot)

- Email verification is set per Neon Managed Better Auth call (e.g. `app/api/users/create/route.ts` passes `emailVerification: "disabled"`), not by an env flag — there is no `REQUIRE_EMAIL_VERIFICATION` variable read anywhere in the code. If stricter verification is ever needed, it must be configured in the Neon Auth console, not `.env`.
- Resend sending is live — `zidaproject.com` was verified 2026-09-04 and `npm run email:test` delivers all four inquiry-lifecycle templates. Note `lib/email/send.ts` logs and swallows send failures by design, so if a decision email doesn't arrive, check server logs rather than trusting a green request. `RESEND_REPLY_TO` and `INQUIRY_ALERT_EMAIL` must also be set in the Hostinger panel for production, alongside `NEXT_PUBLIC_SITE_URL="https://zidaproject.com"` — every email's call-to-action link is built from it; see `.env.example`.
- Production must be rebuilt on Hostinger after each `main` push — check the commit reported by `/api/version` (the smoke suite prints it) before a board walkthrough.
- `/deal-room` and `/ministry` deny a wrong-role user client-side, not over HTTP. `components/dashboard/dashboard-shell.tsx` wraps only those two consoles in `NdaGate`, which renders a skeleton while the session loads, so neither the page nor the access-denied notice is in the server HTML — both appear only after hydration. The server still refuses to serve any console content, so this is a verification gap rather than an exposure. A wrong-role user resting on a skeleton is expected; resting on a populated console is not.
- Entitlements were re-audited 2026-09-04 after the auth refactor, covering cross-ministry scoping and qualified-tier gating. No path was found for a `registered` or wrong-ministry user to read another party's engagements, MOU content, message threads, or qualified-tier documents; `middleware.ts` gates console *pages* for authentication only, so every API authorization decision is made in the route handler via `requireRole()` plus the entitlement helpers, and that is where to look when verifying. Two write-side gaps found and fixed in the same pass: `PATCH /api/projects/[id]` allowed a `ministry_admin` to rewrite `primaryBeneficiaryMinistryId` (the very field their own scope check reads, letting them transfer a project out of their ministry unilaterally), and the message-attachment upload route was missing the ministry guard its sibling routes all apply.
- VFEX integration, government SSO, and full 10-persona model are post-pilot.
- Document downloads return 404 JSON if R2 object missing (run `scripts/backfill-pending-documents.ts` after fresh DB seed).

---

## Cleanup

Remove ad-hoc smoke accounts (never pilot accounts):

```bash
npx tsx --env-file=.env.local scripts/cleanup-test-accounts.ts
npx tsx --env-file=.env.local scripts/cleanup-test-accounts.ts --confirm
```
