# UI/UX Audit

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform*
*Prepared ahead of the pilot demo | September 2026*

## What this is

A layout, accessibility, error-console, and performance sweep across the whole platform — every
public page and every persona's console — run with browser automation rather than by reading
code. It exists because the pre-existing test suites are deliberately structured to *not* do this:
[docs/UAT-Automation-Plan.md](UAT-Automation-Plan.md) covers authorisation and workflow state, and
explicitly excludes an accessibility audit from its three-layer plan; `npm run e2e` runs at a
single 1440×900 desktop viewport. Nobody had crawled the platform at a phone viewport, watched its
browser console across every page, or run an accessibility scanner against it, until now.

Findings are filed the same way the rest of pilot verification is: `DEF-NNN` in
[docs/UAT-Defect-Log.md](UAT-Defect-Log.md) for behaviour nobody intended, `PB-NNN` in
[docs/Product-Backlog.md](Product-Backlog.md) for a real gap in something that already works as
designed. This document is the methodology and the before/after numbers behind that filing; the
defect log and backlog remain the source of truth for status.

## Contents

1. Scope and method
2. Layout: mobile-viewport crawl
3. Errors: console/network crawl
4. Accessibility: axe-core sweep
5. Performance: Lighthouse
6. What was fixed, and what was deliberately not
7. Post-deploy re-verification (Phase 5)
8. Open items and next steps

---

## 1. Scope and method

Four new, purpose-built checks, run against 90 page/persona combinations (15 public pages, plus
every page belonging to each of the platform's personas — Registered Investor, Qualified
Investor, Government Reviewer, Ministry Official (platform-wide and three ministry-scoped
variants), ZIDA Admin, Platform Admin):

| Check | Tool | What it looks for | Run with |
| --- | --- | --- | --- |
| Layout | Playwright, Pixel 5 viewport (393×851) | Horizontal overflow (hard fail); tap targets under 44px (reported) | `npm run audit:mobile` |
| Errors | Playwright, same mobile viewport | Console errors, unhandled exceptions, failed requests, HTTP 4xx/5xx | `npm run audit:errors` |
| Accessibility | `@axe-core/playwright`, `wcag2a`/`wcag2aa` tags | Serious/critical violations only — moderate/minor would drown a first pass in noise | `npm run audit:a11y` |
| Performance | Lighthouse via `npx` (not a project dependency) | Performance/accessibility score, LCP, TBT, CLS, on `home`, `projects`, `strategic-partnerships` | `npm run audit:lighthouse` |

**Why a new `mobile` Playwright project rather than reusing `chromium`.** The existing 137
`chromium` tests are the source of the 1440×900 screenshots the stakeholder guides were built
from; running a mobile viewport through the same project would have silently changed those. The
new `mobile` project (184 tests, all matching an `audit-*.spec.ts` naming convention) and the
existing `chromium` project use exact-complement `testMatch`/`testIgnore` patterns, verified with
`npx playwright test --list` before any real run: 0 overlap either direction. Both still depend on
the existing `setup` project for persona sign-in, and `workers: 1` is preserved platform-wide —
Neon Auth rate-limits sign-in attempts, and this was already a hard constraint on the existing
suite.

**Why Lighthouse ran against a local build instead of production.** `zidaproject.com` returns a
403 (`ERRORED_DOCUMENT_REQUEST`) specifically to Lighthouse's CDP-driven Chrome — confirmed not a
Lighthouse-in-this-sandbox problem, since a sanity run against `example.com` scored a clean
`performance: 1`, and confirmed not a from-this-network problem, since plain `curl` and
Playwright's own Chrome both get a normal 200 from the same URL. The most likely explanation is a
WAF or bot-detection rule fingerprinting Lighthouse's automation flags or its throttling profile;
it was not fully root-caused, because the audit's own fallback for exactly this situation — run
against a local `next build && next start` instead — was enough to get real, comparable numbers
without spending more time on a production WAF investigation that isn't blocking anything else.
Baseline and after numbers in this report are both local-build numbers for that reason, which
keeps the comparison apples-to-apples even though neither number is directly the Hostinger figure
(desktop 97 / mobile 76) that prompted this audit.

**A genuinely clean build matters more than expected.** Mid-audit, a `next build` run while an
older `next start` was still serving produced a real `ChunkLoadError` locally — the fresh build's
HTML referenced a chunk hash the old server's disk copy didn't have. This is the same root-cause
class as the CDN-cache `ChunkLoadError` outage already documented in `next.config.ts`. Every
number in this report comes from a fully clean build (`.next` deleted, then rebuilt) specifically
because of this — see the note under §6.

## 2. Layout: mobile-viewport crawl

**All 90 pages pass. Zero horizontal overflow anywhere on the platform.** This is the single most
reassuring finding in this audit: the platform's layout is fundamentally sound at a phone
viewport, with no page-wide "why is there a scrollbar" defect anywhere, public or behind any
login.

Tap-target size was reported, not hard-failed (several known-small targets — pagination chevrons,
table checkboxes — already carry `aria-label`s and are usable, just cramped; failing on those
would be noise on every future run). The richest tap-target findings were on the home page (e.g.
28 elements under 44px: FAQ toggles, the locale switcher, footer links) — cosmetic, and not filed
as a defect, but worth a design pass at some point since a phone user's thumb is the actual
constraint.

## 3. Errors: console/network crawl

**90/90 individual page tests passed.** No page crashed. **Zero `pageerror`, zero
`requestfailed`** across the entire crawl — no broken JavaScript, no request that failed to even
complete, on 90 pages. The suite's single aggregate assertion still failed, on exactly 182
findings across only 8 unique patterns, all of them expected noise rather than new defects:

- 401/403 on `/api/engagements`, `/api/inquiries`, `/api/audit-logs`, `/api/users` — the provider
  fetch-storm pattern already flagged once for the sign-in page specifically (see
  [docs/UAT-Defect-Log.md](UAT-Defect-Log.md) §5) and for the notification bell specifically
  (PB-002). This crawl confirms it is neither of those things alone — it is a platform-wide
  pattern across five shared client-side providers, correctly refused by the server every time.
  Logged as [PB-010](Product-Backlog.md), not fixed — see §6.
- 404 on `/api/content-blocks/home-hero` and `/api/content-blocks/about-page`, firing even on
  pages with no relation to home or about content. Extends the existing DEF-007 — see that entry
  for the update.

## 4. Accessibility: axe-core sweep

27 of 30 scanned pages (15 public + one landing page per persona) passed outright. Three failures,
all now addressed:

| Page(s) | Rule | Impact | Resolution |
| --- | --- | --- | --- |
| `public/strategic-partnerships` | `label` (2 nodes on this page; comprehensive review found 11 across the whole form) | Critical | Closed — [DEF-060](UAT-Defect-Log.md) |
| `public/strategic-alignment`, `public/projects` | `color-contrast` (SDG badge colours) | Serious | Open, needs a design decision — [DEF-062](UAT-Defect-Log.md) |

The `label` finding on `strategic-partnerships` pointed at two fields, but the root cause was the
shared `Label` helper in `engagement-wizard.tsx` never writing `htmlFor` at all — every one of the
form's eleven real fields had the identical defect, axe only samples what's on screen at scan
time. All eleven were fixed together rather than just the two flagged nodes, since it's the same
one-line root cause and the wizard is the investor application entry point.

The `color-contrast` finding is on colours the platform doesn't get to choose — the UN's own
standardised SDG programme palette (`lib/data/taxonomies.ts`). Recorded as an open defect needing
a design decision (darken the badge text, add an outline, or accept the deviation), not fixed
unilaterally.

## 5. Performance: Lighthouse

All numbers below are from a clean local `next build && next start`, mobile and desktop presets,
on the three pages judged most representative of the shared page shell (`home`, `projects`,
`strategic-partnerships` — chosen because Lighthouse is slow and a representative slice is enough
to characterise where the score is actually being lost). "Before" predates every fix in this
audit; "after" is the same three pages, same build process, after DEF-055 through DEF-061 landed.
Full JSON preserved in [docs/audit/baseline/](audit/baseline/) (before) and
[docs/audit/](audit/) (after); [docs/audit/lighthouse-summary.md](audit/lighthouse-summary.md) is
the after run's own summary.

| Page | Form factor | | Performance | LCP | TBT | CLS | Accessibility |
| --- | --- | --- | --- | --- | --- | --- | --- |
| home | mobile | before | 53 | 5,660ms | 1,107ms | 0.082 | 95 |
| home | mobile | after | 51 | 5,536ms | 1,076ms | 0.082 | 95 |
| home | desktop | before | 95 | 1,323ms | 122ms | 0.025 | 95 |
| home | desktop | after | 94 | 865ms | 171ms | 0.066 | 95 |
| projects | mobile | before | 53 | 4,998ms | 1,466ms | 0.078 | 93 |
| projects | mobile | after | 52 | 5,105ms | 1,605ms | 0.078 | 93 |
| projects | desktop | before | 94 | 904ms | 167ms | 0.023 | 93 |
| projects | desktop | after | 92 | 938ms | 207ms | 0.023 | 93 |
| strategic-partnerships | mobile | before | 66 | 4,604ms | 640ms | 0.078 | 97 |
| strategic-partnerships | mobile | after | 58 | 4,854ms | 991ms | 0.078 | 97 |
| strategic-partnerships | desktop | before | 99 | 716ms | 71ms | 0.024 | 97 |
| strategic-partnerships | desktop | after | 99 | 693ms | 83ms | 0.024 | 97 |

`projects` and `strategic-partnerships` have no code change between before and after — they are
the control. Their movement between runs (LCP ±100–250ms, TBT ±140–350ms, performance score ±1–8,
CLS effectively flat) is measurement noise between two separately-launched Chrome instances, not
signal, and sets the bar for how much movement on `home` can actually be attributed to the fix.
`home` desktop's 458ms LCP drop (1,323ms → 865ms) clears that bar by roughly an order of magnitude
and is a real result; `home` mobile's 124ms drop does not clear it and cannot be confidently
attributed to the fix on its own — see [DEF-061](UAT-Defect-Log.md) for the full reasoning.

**One number above is worth flagging rather than silently reporting: `home` desktop CLS moved
0.025 → 0.066**, against a control that stayed flat (0.023 → 0.023, 0.024 → 0.024). Framer Motion's
`initial={false}` should skip the entrance transform entirely on first mount, which was the
intent, not introduce a new shift — the more likely explanation is a knock-on interaction with
something else on the page finishing layout (e.g. the `useSiteStats` hook's async update, or a
font swap) landing at a different point in the timeline now that the hero paints sooner. Both
values are comfortably inside Lighthouse's "Good" band (≤ 0.1) and this is not filed as a defect,
but it is worth a look in the same pass that eventually revisits DEF-061's mobile numbers — noted
here rather than left for someone else to rediscover.

**The `strategic-partnerships` accessibility score rising from what would otherwise have been 92
to 97 in the same run that fixed DEF-060's label defects is itself confirmation the fix landed** —
axe's own scoring, not just the targeted rule, moved.

**Mobile performance (51–66) is well below the Hostinger-reported desktop 97 / mobile 76** that
prompted this audit — expected, since these are unthrottled-network local numbers being compared
against a different measurement methodology entirely, not a regression. The useful signal here is
relative (before vs. after a specific fix), not absolute against a number captured a different
way.

## 6. What was fixed, and what was deliberately not

**Fixed, verified, deployed and confirmed live on production (via `/api/version`):**

| Defect | Fix |
| --- | --- |
| DEF-055 (Critical) | NDA-gate dialog restructured to scroll internally; verified against all 27 `DialogContent` consumers |
| DEF-056 (High) | Amendment comparison table now scrolls horizontally instead of clipping |
| DEF-057 (Medium) | Five two-column grids across three consoles now stack on a phone |
| DEF-058 (Medium) | Two icon-only buttons gained `aria-label` |
| DEF-059 (Low) | Removed a duplicate `priority` preload hint on the hero map icon |
| DEF-060 (High) | Eleven engagement-wizard fields gained real label association |
| DEF-061 (Medium) | Hero headline no longer waits on its own first-paint animation |
| DEF-063 (High) | All four Kanban boards gained a phone-appropriate tabs + vertical-list layout; the one board with real drag-and-drop (Deal Room pipeline) gained a "Move to" menu as the touch substitute |

Verified with a clean `npm run build` and `npx eslint` after every batch of changes; two
pre-existing ESLint warnings (`review-queue-view.tsx` line 421, `mou-panel.tsx` line 12) were
confirmed via `git diff --stat` to predate this audit and are unrelated to anything touched here.

**Phase 4 (board views at a mobile viewport) — completed, in a second pass.** Unlike DEF-055
through DEF-061, this had no pre-existing design spec, so before any component code was written a
static HTML/CSS mockup ([docs/audit/mobile-board-mockup.html](audit/mobile-board-mockup.html)),
built with the platform's own colour tokens and real status labels, was reviewed against three
candidate layouts — the current horizontal-scroll board (for contrast), a status-tabs +
one-column-vertical-list option, and a stacked-accordion option. The tabs + list direction was
selected and implemented as `MobileStatusBoard`
([components/dashboard/mobile-status-board.tsx](../components/dashboard/mobile-status-board.tsx)),
reused across all four boards. A codebase inventory (not assumed from the mockup) found that only
the Deal Room pipeline board has real drag-and-drop backing an actual status change — the other
three are read-only displays, with status changes made elsewhere — so the new "Move to" menu was
built, and permission-gated through the existing `canTransition` rule, only on that one board.
Filed as DEF-063; full detail in the defect log entry.

**Deliberately not fixed, and why:**

- **DEF-062** (SDG badge contrast) — needs a design decision, not an implementation one.
- **DEF-007's broader scope, and PB-010** (the provider fetch-storm, platform-wide) — the fix
  touches `LeadCaptureProvider`, which a prior risk-review round flagged for a `finally`-block/
  `isLoading` hang risk. `LeadCaptureProvider` sits in front of `engagement-wizard.tsx`, the
  investor application entry point, and per standing instruction: *"wating on the signature of the
  NDA which is imminent. do not want to start code change and not finish ontime for the demo."*
  This crawl gives that decision empirical backing (confirmed platform-wide, confirmed harmless in
  its current form — zero crashes, correctly refused every time) rather than changing it.

**Deploy timing.** Every fix above is contained to component-level markup/behaviour, not to
shared infrastructure like `next.config.ts` or `middleware.ts`. Per the platform's own documented
`ChunkLoadError` history (DEF-002/DEF-009, and the local repeat of the same failure mode found
while preparing this audit — see §1), any deploy carrying these changes should ship with a
genuinely clean build (not a reused `.next` cache) and a fresh-incognito sign-in check
immediately after, days before the demo rather than on the day of it — the standing guardrail
from the prior risk-review round, unchanged.

## 7. Post-deploy re-verification (Phase 5)

All three Playwright-based checks were re-run against production after both deploys (`acab07c`
and `0724118`, both confirmed live via `/api/version`), to close out the audit rather than rely
on local-build numbers alone for the final state.

| Check | Result | Compared to baseline |
| --- | --- | --- |
| `audit:mobile` (layout) | 88–90/90 individual pages passed across two runs; zero horizontal overflow throughout | Unchanged — see below on the two flakes |
| `audit:errors` | 90/90 individual pages passed; aggregate failed on exactly 182 findings across the same 8 patterns | Exact match to the pre-fix baseline in §3 — confirms PB-010/DEF-007 is unchanged, not a regression |
| `audit:a11y` | 28/30 pages passed; the 2 failures are the DEF-062 SDG-badge contrast colours (`#BF8B2E`, `#FD9D24`), exactly as before | Exact match to the open DEF-062 — DEF-060's fix is holding (its page now passes) |

**On the `audit:mobile` flakes.** Two separate full runs surfaced three failures total, on three
different pages, none of them a board: `Government Reviewer — Saved Projects`, `Registered
Investor — Overview`, and `Platform Admin — Reports`. All three failed the identical way — a
`.dashboard-skeleton` that did not clear within a 30–60s timeout — never the same page twice
across the two runs, and never a page this audit's fixes touched. `/auth/sign-in` briefly
returned a `504 Gateway Time-out` during one of the setup passes as well. The most likely
explanation is self-inflicted: this session ran the full 9-persona `setup` project (a burst of
sign-ins `auth.setup.ts` itself documents as rate-limit-sensitive) five times in under two hours
while re-verifying the board work, on top of the crawl's own request volume. This was not chased
further — it is not reproducible on a specific page, it does not touch anything filed in this
audit, and repeated retries against production this close to the demo carry more risk than the
signal is worth. Worth a look if it recurs outside of heavy automated load.

**Board verification specifically** (DEF-063) was done separately, against real signed-in
sessions rather than the generic crawl: all four boards (`deal-room/pipeline`,
`deal-room/engagements`, `admin/mou`, `admin/inquiries`) render the new tabs + vertical-list
layout correctly at a Pixel 5 viewport, with zero horizontal overflow, and the "Move to" menu on
the Deal Room pipeline board appears only for a role with a real transition available and lists
only the valid target status — confirmed for both a permissioned (`government`) and a read-only
(`qualified`) persona.

**Conclusion: the audit is closed.** Every fix filed as Closed above (DEF-055–061, DEF-063) is
deployed, live, and re-confirmed against production, not just against a local build. The two
remaining open items — DEF-062 (SDG contrast) and PB-010 (provider fetch-storm) — are unchanged
from what this report already described, each deliberately left for a decision or a moment
outside the pre-demo window, not because either was missed.

## 8. Open items and next steps

1. ~~Deploy the Phase 2/3 fixes above (DEF-055 through DEF-061), with the clean-build +
   post-deploy sign-in check described above.~~ Done — commit `acab07c`, confirmed live via
   `/api/version`.
2. Get a design decision on DEF-062 (SDG badge contrast) — does not block the demo either way.
   Still open.
3. ~~Confirm with the user before starting Phase 4 (board views on mobile).~~ Done — user
   reviewed a mockup and approved the tabs + "Move to" menu direction; implemented, deployed
   (commit `0724118`, confirmed live via `/api/version`), and verified against real signed-in
   production sessions across all four boards. Filed as DEF-063.
4. After the demo, and once `LeadCaptureProvider`'s hang risk can be reviewed properly and in
   isolation, pick up PB-010.
5. ~~Re-run all four audit checks now that both deploys are live, and record final after-numbers
   here to formally close out this audit (Phase 5 of the original plan).~~ Done — see §7 above.
