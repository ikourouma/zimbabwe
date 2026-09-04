# Investor Journey: Strategic Partnerships vs. Inquiries vs. Self-Serve Profile

Deal Room Feedback Batch v2, Phase 9. This is the reference doc for a question that keeps coming up
from both users and support staff: *"which form do I use, and what actually happens after I submit
it?"* There is only **one** lead-capture table behind the scenes (`strategic_inquiries`, surfaced to
staff as **"Inquiries"**), but several very different front doors feed it, and only one of those
front doors can change a user's role. This doc disambiguates all of them.

## TL;DR

| Entry point | Who it's for | Creates an account? | Changes to `qualified`? | Where staff see it |
|---|---|---|---|---|
| **Self-Serve Sign-Up** (`/auth/sign-up`) | Anyone who wants an account | Yes — immediately, live | No | `/admin/users`, `/super-admin/users` |
| **My Profile → KYC** (`/deal-room/profile` etc.) | A signed-in `registered` user | N/A (already has one) | No (prep step only) | Not visible until submitted |
| **Strategic Partnerships & Inquiries** (`/strategic-partnerships`) | Investors, government/DFI, strategic/technical partners with a specific mandate | No (unless the visitor separately signs up) | **Yes** — the *only* path that can promote `registered` → `qualified` | `/admin/inquiries`, `/super-admin/inquiries` |
| **Contact Us** (`/contact`) | General questions, press | No | No | `/admin/inquiries`, `/super-admin/inquiries` |
| **Project-page CTAs** (document/meeting/investment-interest/valuation-teaser requests) | Anyone viewing a specific project | No | No | `/admin/inquiries`, `/super-admin/inquiries` (routed to the Deal Room Team) |

The short version: **signing up gets you an account. Strategic Partnerships gets you qualified.
Everything else is just a message to ZIDA.**

---

## 1. Self-Serve Sign-Up — the only way to get an account

`/auth/sign-up` (see `lib/auth/direct-signup.ts` and the auth routes under `app/api/auth/`) creates
a real Neon Auth credential and a `profiles` row with `role: "registered"` in one step. No review,
no waiting — this is the "cold start," the same way you'd sign up for any SaaS product.

`/register` still exists as a permanent redirect to `/auth/sign-up` (see `app/register/page.tsx`) —
every historical link across the site (nav, homepage CTA, FAQ, project unlock prompts) keeps
working unchanged.

A `registered` user can immediately:
- Browse the full project registry with financing-type filters.
- Save projects to a watchlist.
- Open **My Profile** (below) to start the qualification path.
- Message ZIDA via the General Concierge channel.

They **cannot** yet see capital estimates/IRR/NPV/ROI, enter the Deal Room, or propose a project —
that's all gated behind `qualified`.

## 2. My Profile → KYC — preparing to apply, not applying

`/deal-room/profile` (also mounted at `/admin/profile` and `/super-admin/profile` for staff's own
accounts — see `components/account/profile-view.tsx`) is a `registered` user's self-serve KYC
surface: company name, authorized representative, HQ address, business registration ID, corporate
website, and a business registration certificate upload.

This is **not** an application by itself — it's local profile data (`PATCH /api/account/profile`)
that nothing downstream reviews on its own. What it *does* do is prefill the Strategic Partnerships
wizard so an applicant never re-types their KYC twice:

1. User fills in every KYC field on My Profile → "Request Qualified Investor Review" becomes enabled.
2. Clicking it saves the profile, then calls `POST /api/inquiries/draft` (`engagementType: "investor"`)
   to open a **draft** `strategic_inquiries` row pre-populated with that KYC data.
3. The user is redirected straight into `/strategic-partnerships` to finish the parts My Profile
   doesn't capture (investment interest, ticket size, sector focus) and formally submit.

Drafts (`status: "draft"`) are private to the applicant and never appear in the staff Inquiries
queue — only a submitted (`status: "pending"`) row does.

## 3. Strategic Partnerships & Inquiries wizard — the qualification path

`/strategic-partnerships` (`components/strategic-partnerships/engagement-wizard.tsx`, backed by
`app/api/inquiries/draft/route.ts` for signed-in autosave/resume and `app/api/inquiries/route.ts`
for anonymous one-shot submits) is a three-step, routed form:

1. **Who You Are & Why** — engagement type (`investor` / `government_dfi` / `strategic_partner`),
   contact + KYC details.
2. **Your Interest** — sector focus, ticket size range, or (for partners) nature of engagement.
3. **Mandate & Review** — final confirmation before submit.

Use this form when the visitor is:
- An **investor** wanting to be evaluated for Qualified-Investor access (Deal Room, financials,
  document requests, project proposals).
- A **government/DFI counterpart** with an institutional mandate.
- A **strategic or technical partner** proposing a specific collaboration.

Every submission lands in `strategic_inquiries` with `type: "strategic_partnership"`, routed by
`lib/data/routing-desks.ts` to the Investment Promotion Desk, Government & DFI Relations Desk, or
Strategic Partnerships Desk (or the Deal Room Team, if it's anchored to a specific project).

**This is the only front door that can change a role.** In `app/api/inquiries/[id]/route.ts`,
approving a `strategic_partnership` inquiry with `engagementType: "investor"`:
- Re-checks all five KYC fields (organization, phone, HQ address, business registration ID,
  website) on the inquiry itself, falling back to whatever's already on the matched profile.
- If any are missing, the approve call is rejected with `KYC_INCOMPLETE` — staff must use
  **"Request More Info"** (→ `changes_requested`, with a required reason shown back to the
  applicant) instead of Approve.
- If KYC is complete, it upgrades the matched account's `profiles.role` to `qualified` and copies
  the KYC fields onto the profile — a real, auditable role transition
  (`audit.action = "inquiry.status_changed"`, `metadata.roleUpgradedToQualified: true`), not just a
  cosmetic status flip on the inquiry row.
- A submitter with no matching account (anonymous submission, or an email that doesn't match any
  signed-up user) can still be "approved" as a CRM decision, but there's no account to promote —
  they'd need to sign up first, at which point staff can re-open the same inquiry via "Open
  Dossier" once the account exists.

## 4. Contact Us & project-page CTAs — everything else

These are **not** qualification paths — they're the general-purpose ways to get a message to ZIDA,
and they use the exact same `strategic_inquiries` table with a different `type`:

| `type` | Entry point | Typical use |
|---|---|---|
| `contact` | `/contact` | General questions, press/media |
| `investment_interest` | A project's Data Room actions | "I'm interested in this specific project" |
| `document_request` | A project's Data Room actions | Requesting a gated document/pack |
| `meeting_request` | A project's Data Room actions | Requesting a call/meeting on a specific project |
| `valuation_teaser` | Registry "Request Valuation Teaser" CTA | Concept-stage project whose capital buildout isn't structured yet |
| `registration` | Legacy — the old pre-2026 `/register` application flow | No longer written by any live UI; kept for historical rows only |

None of these change a role on approval — `app/api/inquiries/[id]/route.ts` only runs the
qualification-upgrade branch for `type: "strategic_partnership"` + `engagementType: "investor"`.
Approving one of these is purely a CRM status flip (e.g. "resolved," logged to `reviewNotes`).

When a CTA carries `projectId` (any of the Data Room actions), `getRoutingDesk()` always routes it
to the **Deal Room Team** regardless of `engagementType`, since a project-anchored request needs the
deal team's context, not a cold-start desk.

## 5. The staff-side "Inquiries" console

`/admin/inquiries` and `/super-admin/inquiries` are one unified queue over every non-draft row in
`strategic_inquiries`, filterable by type, status, and engagement type (see
`components/dashboard/inquiry-filters-bar.tsx` and `lib/governance/inquiry-filters.ts`). Every
inquiry — regardless of front door — goes through the same lifecycle:

```
draft (Strategic Partnerships only, private) → pending → approved
                                                        → declined
                                                        → changes_requested → pending (resubmit)
```

`approved`, `declined`, and `changes_requested` all **require a reason** (`REASON_REQUIRED_STATUSES`
in `app/api/inquiries/[id]/route.ts`) — it's stored in `reviewNotes` (shown back to the applicant)
and in the audit log, so every decision is accountable. The "Open Institutional Compliance Dossier"
link on an inquiry resolves to the applicant's matched account (via the soft-linked `userId`, or an
email match for older/anonymous rows) so a reviewer can jump straight to their full User Profile
Drawer — including the **Interactions** tab (Phase 8) to message them directly without leaving the
review flow.

## 6. Decision guide

**For a visitor/user deciding which form to use:**
- Want an account at all? → **Sign up** (`/auth/sign-up`).
- Already signed up, want Deal Room / financials / to propose a project? → **My Profile → Request
  Qualified Investor Review**, which hands you off to **Strategic Partnerships**.
- Government, DFI, or a partner with a specific institutional mandate? → **Strategic Partnerships**
  directly (`engagementType: government_dfi` or `strategic_partner`).
- Interested in one specific project (document, meeting, general interest, valuation teaser)? →
  Use that project's Data Room action — it carries the project context automatically.
- General question, press inquiry, nothing project- or qualification-specific? → **Contact Us**.

**For staff reviewing the Inquiries queue:**
- `type: strategic_partnership` + `engagementType: investor`, KYC complete → **Approve** promotes
  the account to `qualified` automatically.
- Same, but KYC incomplete → **Request More Info** (never force an Approve — the API rejects it).
- Any other type → Approve/Decline is a CRM-only decision; there's no account-role side effect.
- Need to talk to the applicant outside the inquiry's own review-notes field? → Open their profile
  and use the **Interactions** tab (General Concierge thread) — it's the same channel they'd see
  under their own Concierge tab.

## Code map

| Concern | File |
|---|---|
| Shared inquiry table (all types) | `lib/db/schema/inquiries.ts` |
| Inquiry types / statuses / engagement types | `lib/db/schema/enums.ts` (`leadInquiryTypeEnum`, `inquiryStatusEnum`, `engagementTypeEnum`) |
| Anonymous submit + staff list | `app/api/inquiries/route.ts` |
| Approve/Decline/Request-Info + qualification upgrade | `app/api/inquiries/[id]/route.ts` |
| Signed-in draft autosave/resume/submit | `app/api/inquiries/draft/route.ts`, `lib/db/queries/inquiries.ts` |
| Strategic Partnerships wizard UI | `components/strategic-partnerships/engagement-wizard.tsx` |
| Wizard step validation | `lib/governance/inquiry-wizard-validation.ts` |
| Desk routing | `lib/data/routing-desks.ts` |
| My Profile / self-serve KYC | `components/account/profile-view.tsx` |
| Self-serve sign-up | `app/auth/sign-up/`, `lib/auth/direct-signup.ts` |
| Staff Inquiries console | `app/admin/inquiries/page.tsx`, `app/super-admin/inquiries/page.tsx`, `components/dashboard/inquiry-filters-bar.tsx` |
| Type/label helpers | `lib/utils/inquiry-display.ts` |
| General Concierge messaging (Interactions tab) | `components/deal-room/message-thread.tsx`, `app/api/concierge/messages/` |
