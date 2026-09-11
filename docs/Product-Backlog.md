# Product Backlog

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform*
*Enhancement ideas, tracked separately from defects | September 2026*

## What this is

A running record of product enhancements — things the platform does correctly today but could do
better — raised during pilot review, stakeholder prep, or ordinary use. This is deliberately
separate from [docs/UAT-Defect-Log.md](UAT-Defect-Log.md): a defect is behaviour nobody intended;
an entry here is a real gap in something that already works as designed. Same ID/status
discipline as the defect log, so either can be searched the same way.

## Status legend

| Status | Meaning |
| --- | --- |
| Open | Raised, not yet scheduled |
| In Progress | Actively being worked |
| Closed | Shipped |
| Deferred | Raised and agreed, but deliberately scheduled for after a specific milestone |

## Backlog

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| PB-001 | Dashboard sidebar showed a generic role badge instead of the signed-in user's specific ministry/organisation | Medium | Closed |
| PB-002 | Investor notification bell missing or non-functional — no scoped feed for qualified/registered investors | High | Open |
| PB-003 | ZIDA Admin cannot create or edit ministries and taxonomies (reserved to Platform Admin under change control) | Medium | Deferred |
| PB-004 | Twelve-stage MOU instrument — clause-level negotiation successor to current six-stage record | Medium | Open |
| PB-005 | Align three UI strings still saying "Super Admin" to established "Platform Admin" convention | Low | Open |
| PB-006 | NDA version bump does not re-prompt users who accepted an earlier version | Medium | Open |
| PB-007 | Approving investor inquiry with no matching platform account silently skips role upgrade | Medium | Open |
| PB-008 | Stale docs and UI hide NDA status from registered users who must accept it | Low | Open |
| PB-009 | Notification bell unread state is localStorage-only — does not follow user across devices | Low | Open |
| PB-010 | Shared client-side providers fetch role-restricted endpoints on every page, unconditionally | Medium | Open |

---

### PB-001 — Dashboard sidebar showed a generic role badge instead of the signed-in user's specific ministry/organisation

**Priority:** Medium. **Status:** Closed, same day raised.

Every console's sidebar header showed two fixed lines: the console name (e.g. "Ministry Desk") and
a generic badge from `CONSOLE_META` — "Ministry Official", "Investor Workspace", "Government
Reviewer". The badge never varied by *which* ministry or *which* firm: a min-energy admin and a
min-ict admin saw an identical header, and so did every investor firm regardless of name. Raised
during stakeholder-demo prep, where officials from several different ministries would be in the
room and the platform's own chrome couldn't tell them apart.

**Fix.** `resolveConsoleIdentity()` in
[components/dashboard/dashboard-nav-config.ts](../components/dashboard/dashboard-nav-config.ts)
resolves the specific identity to show in place of the generic badge:

| Role | Header second line |
| --- | --- |
| `ministry_admin` | The taxonomy ministry name for their `ministryId` (authoritative — not the free-text `organization` field, which isn't guaranteed to be set for an account created later through Create User) |
| `government` with a `ministryId` | "Affiliated: `<ministry name>`" — preserves the deliberate distinction that they're a national reviewer, not that ministry's own staff |
| `government` with no `ministryId`, `qualified`, `registered` | Their `organization` |
| `admin`, `super_admin` | Unchanged — "ZIDA Admin" / "Platform Ops". There is exactly one ZIDA and one platform owner, so there's no cross-entity ambiguity to resolve the way there is across 4 ministries or many investor firms. Revisit if that judgment call should change. |
| Nothing on file (e.g. a brand-new `registered` investor) | Falls back to the generic badge so the line is never blank |

[components/dashboard/dashboard-sidebar.tsx](../components/dashboard/dashboard-sidebar.tsx) wires
this from `useAuth()` (`organization`, `ministryId`) and `useTaxonomyStore()` (`ministries`), in
both the console-switcher and plain header states, plus the collapsed icon-rail's single-letter
avatar and tooltip.

### PB-002 — Investor notification bell missing or non-functional

**Priority:** High. **Status:** Open.

Raised during end-to-end scenario document prep. The source comment in
[components/dashboard/notification-bell.tsx](../components/dashboard/notification-bell.tsx)
states the intent to "render a quiet, inert bell rather than nothing, so the topbar layout stays
consistent across roles," but the implementation returns `null` for `role === "qualified"`.
Registered investors see a bell that silently 403s against `/api/audit-logs` (empty feed: "No
recent activity yet." permanently). Staff personas have a live bell.

**Why it matters.** Stakeholders expect every console to surface actionable updates in one place.
Investors today rely on the Getting Started card (application status only) and Communication Hub
(once qualified) — workable for the demo but inconsistent with staff UX and insufficient for
engagement/MOU/amendment decisions performed *about* them by ZIDA.

**Proposed fix.** New scoped query (not opening aggregate `/api/audit-logs`): union of the
investor's own actions plus events staff perform about them — application decisions, engagement
status changes, org-invite validation, amendment outcomes, MOU stage advances. Investor-voice copy
map (do not reuse staff `describeShort()` verbatim). Keep aggregate feed closed to investors.
Roughly 200–300 lines plus e2e for both `registered` and `qualified` tiers.

---

### PB-003 — ZIDA Admin cannot create or edit ministries and taxonomies

**Priority:** Medium. **Status:** Deferred (post-demo; deliberate control today).

`PATCH /api/taxonomies` requires `super_admin`. ZIDA Admin can assign `ministry_admin` accounts
to existing ministries but cannot add or rename ministries. End-to-end scenario document frames
this as **national reference data under change control** — Afronovation maintains configuration so
ZIDA focuses on daily operations under the managed-service agreement.

**Why it matters.** Eventually ZIDA may want self-service taxonomy maintenance. Until then,
document the change-request path and turnaround SLA in the support agreement.

**Proposed fix (future release).** Grant read/write taxonomy subset to `admin` with audit trail,
or a governed "request taxonomy change" workflow that queues to Platform Admin.

---

### PB-004 — Twelve-stage MOU instrument

**Priority:** Medium. **Status:** Open.

Current product path: six MOU statuses (`drafting` through `executed`) with dual-party approval,
field comments, frozen `contentSnapshot`, DOCX/JSON export, off-platform signature metadata. See
[MOU-Process-Guide.md](MOU-Process-Guide.md) and [End-to-End-Scenario-Walkthrough.md](End-to-End-Scenario-Walkthrough.md)
Act VI.

**Why it matters.** Executive stakeholders need confidence that today's MOU records are the
foundation, not a throwaway pilot. The twelve-stage instrument extends clause-level negotiation
on the same per-engagement record so MOUs created during adoption migrate forward.

**Proposed fix.** Implement staged clause workflow; preserve existing `contentSnapshot` and
approval history on upgrade migration.

---

### PB-005 — Align "Super Admin" UI strings to "Platform Admin"

**Priority:** Low. **Status:** Open.

[components/dashboard/role-change-modal.tsx](../components/dashboard/role-change-modal.tsx)
establishes "Platform Admin" as the executive-facing label. Three strings still say "Super Admin":
amendment stage-one refusal in [app/api/messages/[id]/action/route.ts](../app/api/messages/[id]/action/route.ts),
users-console caption in [components/dashboard/users-workspace.tsx](../components/dashboard/users-workspace.tsx),
case-manager label in [components/dashboard/project-detail-drawer.tsx](../components/dashboard/project-detail-drawer.tsx).

**Why it matters.** End-to-end documentation uses Platform Admin in narrative voice; screen
transcripts currently quote the legacy string in S7.5 only.

**Proposed fix.** Three-string copy alignment; no logic change.

---

### PB-006 — NDA version bump does not re-prompt

**Priority:** Medium. **Status:** Open.

`NdaGate` checks `ndaAcceptedAt` only; it does not compare `ndaVersion` to `NDA_VERSION` in
[lib/governance/nda.ts](../lib/governance/nda.ts). Bumping the version constant will not force
re-acceptance.

**Why it matters.** Compliance may require re-attestation when NDA terms change.

**Proposed fix.** Gate on `ndaVersion !== NDA_VERSION` for roles that require NDA; preserve
acceptance history in audit log.

---

### PB-007 — Inquiry approval with no matching account is a silent no-op

**Priority:** Medium. **Status:** Open.

[app/api/inquiries/[id]/route.ts](../app/api/inquiries/[id]/route.ts) sets inquiry to approved
but leaves `roleUpgraded` false when no user matches the applicant email — no operator warning in
UI.

**Why it matters.** ZIDA staff may believe they accredited someone who has no platform login.

**Proposed fix.** Surface explicit warning in approval response and drawer when `matchedUserId`
is null; block approve or require account creation first (product decision).

---

### PB-008 — Stale docs and UI hide NDA status from registered users

**Priority:** Low. **Status:** Open.

[docs/Investor Journey - Strategic Partnerships vs Inquiries vs Self-Serve Profile.md](Investor%20Journey%20-%20Strategic%20Partnerships%20vs%20Inquiries%20vs%20Self-Serve%20Profile.md)
still claims registered users cannot enter the Deal Room (they can). `ComplianceCard` in profile
hides NDA status for `registered` even though they must accept via `NdaGate` on first visit.

**Why it matters.** Scenario documentation and profile UI should match runtime behaviour.

**Proposed fix.** Update journey doc; show NDA acceptance status for registered on profile/vault.

---

### PB-009 — Notification bell unread state is localStorage-only

**Priority:** Low. **Status:** Open.

[components/dashboard/notification-bell.tsx](../components/dashboard/notification-bell.tsx)
tracks `zimbabwe.dashboard.notifications.lastSeen` in browser localStorage. Unread counts reset
on a new device or browser profile.

**Why it matters.** Executives switching between laptop and tablet see duplicate "unread" noise or
miss items they marked read elsewhere.

**Proposed fix.** Deferred in source comments — DB-backed read tracking per user when notification
feed matures (especially after PB-002).

---

### PB-010 — Shared client-side providers fetch role-restricted endpoints on every page, unconditionally

**Priority:** Medium. **Status:** Open.

Raised while investigating the sign-in-page observation in
[docs/UAT-Defect-Log.md](UAT-Defect-Log.md) §5, then confirmed platform-wide by a September 2026
UI/UX audit crawl of all 90 page/persona combinations (full findings in
[docs/UI-UX-Audit.md](UI-UX-Audit.md)). `SiteSettingsProvider`, `TaxonomyStoreProvider`,
`ProjectStoreProvider`, `LeadCaptureProvider` and `DealRoomStoreProvider` each fetch their backing
endpoint on mount regardless of the signed-in role's actual entitlement, rather than only mounting
— or only fetching — where the console being viewed can use the data. The server correctly refuses
every call the caller isn't entitled to (401/403 on `/api/engagements`, `/api/inquiries`,
`/api/audit-logs`, `/api/users`); this is wasted requests and console noise on effectively every
authenticated page, not a data exposure. It is the same underlying pattern PB-002 already
describes for the notification bell specifically — PB-002 is the single-endpoint, product-facing
symptom; this entry is the shared root cause across all five providers.

**Why it matters.** 182 findings across only 8 unique patterns on a single crawl, zero of them a
real crash — noise at this volume makes a genuine new error harder to notice in either browser
console or log aggregation, and every unnecessary 401/403 round-trip is bandwidth and latency a
user on a slow connection pays for on a page that never needed the data at all.

**Why this is logged rather than fixed.** `LeadCaptureProvider` sits in front of
`engagement-wizard.tsx` — the investor application entry point — and its current implementation
has a `finally`-block interaction with `isLoading` that a prior review round flagged as a hang risk
if touched incorrectly. Per standing instruction, no work starts on this surface before the demo;
a mistake here that isn't caught in time would block the platform's own front door.

**Proposed fix.** Per provider: either gate the fetch on the signed-in role actually being
entitled to the endpoint (mirrors the check the API already enforces, so the client stops asking
questions it already knows the answer to), or lazily mount/fetch only when a route beneath the
provider actually renders data from it, rather than unconditionally at the shared layout level.
`LeadCaptureProvider` specifically should be reviewed for the `finally`/`isLoading` risk *before*
any fetch-gating change, in a dedicated pass with full regression coverage of the application
wizard, once there is time to do so safely.

---

## Adding a new item

Append the next `PB-NNN` to the table above with a one-line title, then add its own `###`
subsection below with the same three fields the defect log uses: what was noticed, why it matters,
and — once picked up — what changed.
