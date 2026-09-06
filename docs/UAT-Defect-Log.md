# Pilot Verification Defect Log

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform | Walkthrough Guide v1.0*
*Prepared for pilot review | September 2026*

## Executive Snapshot

| Question | Answer |
| --- | --- |
| What is this? | A running record of every defect found while verifying the pilot platform, with evidence, severity, and remediation status. |
| How were these found? | Browser automation against production. None was found by the pre-existing HTTP smoke suite, which by design cannot observe client-side behaviour. |
| What is the most serious open item? | DEF-009. A cached pre-fix page shell can take the sign-in page down for real browsers until the content delivery network is purged. |
| What was the most instructive item? | DEF-010. Three inquiry consoles reported an empty queue while the read behind them was failing, because the interface could not distinguish "nothing is waiting" from "I could not find out". |
| Why does this matter for the walkthrough? | Stakeholders following a written guide report what they see. A defect not caught here becomes an enhancement request against behaviour nobody intended. |

## Contents

1. Severity Definitions
2. Summary
3. Closed Defects
4. Open Defects
5. Observations Pending Triage
6. Verification Coverage
7. Source Notes

---

## 1. Severity Definitions

| Severity | Meaning |
| --- | --- |
| Critical | Production is unusable for real users, right now |
| High | Blocks a documented user journey, or allows a corrected defect to persist in production |
| Medium | Degrades a journey or weakens an operational safeguard, with a workaround available |
| Low | Cosmetic, documentation-only, or confined to non-production environments |

## 2. Summary

| ID | Title | Severity | Status |
| --- | --- | --- | --- |
| DEF-001 | Sign-in strands every role on the public homepage | High | Closed |
| DEF-002 | Deployment does not invalidate the cached page shell | High | Closed |
| DEF-003 | Apex and www both served as canonical | Medium | Closed |
| DEF-004 | Test account cleanup leaves orphaned profile records | Medium | Open |
| DEF-005 | UAT guide documented the wrong landing route | Low | Closed |
| DEF-006 | Qualified pilot account has incomplete verification data | Low | Open |
| DEF-007 | Home page requests a content block that does not exist | Low | Open |
| DEF-008 | Local development server cannot complete sign-in | Low | Open |
| DEF-009 | Sign-in page down for real browsers on a pre-fix cached shell | Critical | Awaiting CDN purge |
| DEF-010 | Inquiry queues silently reported empty while the read was failing | High | Closed |
| DEF-011 | Demo popup covered the pages it was meant to illustrate | Medium | Closed |

## 3. Closed Defects

### DEF-001 — Sign-in strands every role on the public homepage

**Severity:** High. **Status:** Closed in `d3a6af3`, verified.

Every role authenticated successfully and then came to rest on the public marketing homepage rather than their console. The session was valid throughout — the account menu rendered — so nothing appeared broken, but no user reached their workspace by signing in.

Both the sign-in and registration handlers passed a callback destination to the authentication client. That instructed the client to navigate the browser itself, which tore down the page before the role-aware redirect on the following lines could run. The network trace showed the sequence stopping mid-handler: the sign-in request and session read both succeeded, then the browser began loading homepage content, and the profile-provisioning call immediately after the session read never fired at all.

**Why it survived until now.** The smoke suite signs in with a server-side request and reads the returned cookies. It never renders a page, so it cannot observe where a browser would go. This defect was invisible to every automated check that existed.

**Remediation.** The callback destination was removed from both handlers so the role-aware redirect runs. All six roles now reach their correct console. Guarded by `e2e/landing.spec.ts`.

### DEF-003 — Apex and www both served as canonical

**Severity:** Medium. **Status:** Closed in `d3a6af3`.

Both `https://zidaproject.com` and `https://www.zidaproject.com` returned a successful response independently, with no redirect between them. The platform had two live canonical URLs while configuration, transactional email links, and the stakeholder guides all assume the apex.

**Remediation.** A permanent redirect from `www` to the apex was added in `next.config.ts`.

### DEF-005 — UAT guide documented the wrong landing route

**Severity:** Low. **Status:** Closed in `d3a6af3`.

The guide instructed testers that a registered investor lands on the public project registry after signing in. The code sends every non-staff role to the Investor Dashboard, which is tiered rather than qualified-only.

A tester following the guide would have reported a genuine platform defect as expected behaviour, or the reverse. This is the failure mode the persona documents exist to prevent, which is why every route they describe is now asserted by automation before it is written down.

### DEF-002 — Deployment does not invalidate the cached page shell

**Severity:** High. **Status:** Closed in `1cac033`, verified.

Statically prerendered pages are served with a one-year shared-cache lifetime, and deployment does not purge them. The cached page references the previous build's fingerprinted JavaScript, so visitors continue running old code after a release.

**Evidence.** A verification run 33 minutes after the deployment that fixed DEF-001 still loaded the pre-fix script, with the cache reporting a hit and an age older than the build itself. Requesting the same page with a unique query string returned the current build. The test then passed, confirming the fix was correct and that only delivery was stale.

**Why this is the most serious open item.** It undermines every other remediation. A defect can be found, fixed, deployed, and still be live for stakeholders. It also breaks the standard staleness check: the build endpoint is dynamic and correctly reported the new commit while the page shell was still old, so confirming the deployed commit is not sufficient evidence that users are running it.

**Remediation.** Page responses now carry a sixty-second shared-cache lifetime with a five-minute stale-while-revalidate window, replacing the one-year default. The edge still absorbs traffic bursts and still answers instantly while refreshing behind the request, but a deployment reaches users within about a minute instead of never. Console routes were excluded because they already carry a no-store directive, and the framework appends rather than replaces headers.

Verified in production: the sign-in page now returns the capped directive. `E2E_BYPASS_CDN=1` is retained for diagnosis, since it is what distinguishes "the fix is wrong" from "the edge has not caught up yet".

### DEF-010 — Inquiry queues silently reported empty while the read was failing

**Severity:** High. **Status:** Closed in `92642d7`, verified in production.

Every inquiry console — ZIDA Admin, Platform Manager and Ministry Desk — displayed *"No Qualified Investor applications yet."* while three applications were in fact pending. The queue was not empty; it was unreadable, and the interface could not tell the difference.

**Root cause.** `GET /api/inquiries` returned 500. Interpolating a JavaScript array into a database query template expands it into a parameter tuple, so a clause intended as `= ANY(:ids)` was issued as the invalid `= ANY(($1, $2))` and the statement threw. The affected query enriches inquiries with a matched user account and only runs when at least one inquiry has no linked account, which is why it had never fired before: seeding pending applications from unregistered applicants was the first time that condition was met. The same construction was found and corrected in the ministry-scoped audit feed, where it would have failed for any ministry holding a project.

**Why it presented as an empty queue.** The client treated any non-successful response as an empty list. A 500 and a genuinely quiet queue produced identical screens, and the empty state was the more plausible of the two, so nothing prompted investigation.

**How it was found.** The screenshot capture for the approval-decision dialog skipped itself, reporting green, because it found no application to open. The capture run passed. Only opening the resulting image — which showed *"Qualified Investor Applications (0)"* — revealed that the page had been empty rather than the capture faulty.

**Remediation.** Both queries now build an explicit parameter list. Separately, the client distinguishes an authorisation refusal, where an empty list is the correct answer for a non-staff visitor, from a genuine failure, which now renders an error panel with a retry control instead of an empty state.

**The lesson, and it generalises.** A read path that cannot fail visibly will eventually fail invisibly. Any queue an officer relies on to know that work is waiting must be able to say that it does not know, because a queue that reports empty when it is broken is worse than one that reports an error.

### DEF-011 — Demo popup covered the pages it was meant to illustrate

**Severity:** Medium. **Status:** Closed.

Several screenshots in the Public Visitor guide were captured with the seeded *UAT Demo popup* modal open over the page, obscuring the content each image existed to show.

**Two causes, both fixed.** The capture pass dismissed overlays by clicking them immediately after navigation, which is a race it does not reliably win: the consent banner appears on a delay and the marketing popup waits on a network response, so both can arrive after the clicks have given up. The capture now marks both as already seen before any page script runs, so they never mount, and asserts that no modal is open before photographing — the check that would have caught this at capture time rather than at document review.

Separately, the seeded demonstration popup and announcement were switched from active to draft. Both remain on the platform and can be restored from Platform Settings, or with `npm run overlays:on`.

### DEF-012 — Sign-in and registration pages carried developer instructions

**Severity:** Medium. **Status:** Closed.

The footnote beneath the sign-in and registration panels told the reader to use credentials from an internal repository file after running a database seeding command. This is the platform's front door, and it was the text a visiting official would have read first.

Both footnotes now say something a visitor can act on: the registration note explains that an account is created immediately at the registered tier and that financial indicators and documents are released after verification, and the sign-in note points to registration as the route into the project registry.

### DEF-013 — Reviewers were offered controls the server refuses

**Severity:** Medium. **Status:** Closed.

The Government Reviewer console displayed a *Propose a Project* control on My Proposals and a *New Engagement* control on Engagements. Both actions are refused by the server for that role, so the buttons could only ever have produced a permission error.

This was never an access problem — `POST /api/projects` and `POST /api/engagements` both reject the government role outright, and that was confirmed by reading the authorization checks rather than inferred. It was a credibility problem: a reviewer who originated a project would then be reviewing their own submission, which is the separation this role exists to hold, and an interface that appears to offer that invites exactly the question the platform should be foreclosing. Both controls are now shown only to the roles the server admits, and the guide has been rewritten to describe the corrected pages.

### DEF-014 — A placeholder record sat in the national registry

**Severity:** Medium. **Status:** Closed.

A project titled `xyz`, described as `test`, had been left in the database by manual testing on 5 August. It carried a status of *submitted for review*, so it appeared in the Review Queue, the Ministry Pipeline and the Platform Manager registry — and in the walkthrough screenshots of all three, immediately alongside Sunway City Special Economic Zone and Goromonzi Agro Processing.

The record and its two associated messages have been removed. `npm run registry:prune` now reports placeholder records and deletes them only when passed `--apply`; it identifies them by a title and description both too short to be content, and it refuses to touch any record that has since acquired a document or an engagement.

### DEF-015 — Two guides described entitlements the platform does not enforce

**Severity:** Medium. **Status:** Closed.

Writing a description of every screenshot put each image against the text that claimed to explain it, and two claims did not survive the comparison.

The first concerned money. The Registered Investor guide listed *capital estimates* among the things withheld until qualification, and the overview described the registered tier as seeing "no financial data" — but the pipeline screenshot plainly showed a capital figure on every card. Reading the entitlement code settled it in the platform's favour: the headline capital requirement is deliberately released to every tier, because an investor cannot decide whether to seek qualification without knowing the size of what they would be seeking it for. What is withheld, and verifiably stripped by the server before the response is sent rather than merely hidden by the interface, is the return metrics behind that figure — internal rate of return, net present value, payback period, projected revenue and capital structure — together with every gated document. The guides now say that, and the distinction is a better argument for the tier model than the overstatement it replaces.

The second concerned ministries. The Ministry Official guide asserted that other ministries' projects were "not present — not hidden behind a filter, but absent", while its own screenshot showed a *My Ministry Only* chip reading ten against a national count of thirty-nine. The screenshot was right. Ministry scoping governs authority, not sight: the pipeline opens filtered to your own ministry and the filter can be lifted, but no amount of lifting it confers the ability to edit, advance or publish another ministry's work, and that boundary is enforced server-side against direct API calls. The guide now explains the distinction and flags the open configuration question, since a government that would prefer cross-ministry visibility closed should decide that rather than discover it.

Neither was a platform fault. Both would have been read as one by a stakeholder holding the guide beside the screen.

## 4. Open Defects

### DEF-009 — Sign-in page down for real browsers on a pre-fix cached shell

**Severity:** Critical. **Status:** Code fix committed; **the live outage clears only when the CDN cache is purged.**

`https://zidaproject.com/auth/sign-in` renders nothing but *"Application error: a client-side exception has occurred"* in a real browser. No user can sign in. Every other route tested — the home page, the project registry, registration, contact — renders normally.

**What is happening.** The browser loads the page shell, then requests `app/auth/sign-in/page-c442d13d47bb4c40.js` and receives a 404, which throws a `ChunkLoadError` before the form mounts. That chunk belongs to a previous build. The current build's equivalent, `page-446fdc9efdb34a8f.js`, is present and returns normally — so the file is not missing, the shell asking for it is simply out of date.

**Why it was invisible to an ordinary check.** The same URL returns the current, correct shell when requested without compression, and the stale one when requested the way a browser requests it. The CDN keeps a separate entry per content encoding, and only the compressed entry is poisoned:

| Request | Cache status | Age | Cache-Control on the response |
| --- | --- | --- | --- |
| Plain, no `Accept-Encoding` | HIT | 25 seconds | `s-maxage=60, stale-while-revalidate=300` — the current header |
| Browser-like, `gzip, deflate, br, zstd` | HIT | 12,738 seconds | `s-maxage=31536000` — the header from before DEF-002 was fixed |

Three and a half hours of age, carrying a one-year lifetime, on the variant every real visitor receives.

**Root cause: the residue of DEF-002.** That fix capped how long a page shell *may* be cached going forward. It could not evict entries already stored under the previous one-year lifetime, and a header cannot reach backwards into a cache. Those entries stayed valid, one per encoding, and the next deployment replaced the chunks they point at. The fix was correct and it was verified; what was missed is that verification used an uncompressed request and therefore read the healthy variant.

**This is the general lesson from both defects.** Confirming the deployed commit is not evidence that users are running it, and now: confirming one variant of a URL is not evidence about the variant users receive. Any check of production delivery must send the headers a browser sends.

**Remediation, in two parts.**

*Committed.* `/auth/:path*` is excluded from page caching and served `no-store`. Sign-in is cheap to render, and a stale marketing page is cosmetic where a stale sign-in page locks everyone out. This prevents recurrence but does not clear what is already cached.

*Required, and outside the codebase.* The Hostinger CDN cache must be purged. Until it is, the poisoned entry remains servable for up to a year and the outage continues regardless of what is deployed.

**Verification once purged.** Request `/auth/sign-in` with `Accept-Encoding: gzip, deflate, br` and confirm the response carries `no-store` rather than an age in the thousands, then run `npm run e2e`, whose sign-in setup fails outright against this defect.

### DEF-004 — Test account cleanup leaves orphaned profile records

**Severity:** Medium. **Status:** Open, remediation planned.

The cleanup utility removes the authentication record but not the associated profile. The two are linked by convention rather than a database constraint, so each removal leaves a profile that still appears in the administrative user directory, permanently.

Harmless today because cleanup is run rarely. It becomes a real problem the moment automated tests provision and remove accounts on every run, which the planned workflow suite requires. Separately, one seeded pilot account is missing from the list that protects pilot accounts from deletion.

### DEF-006 — Qualified pilot account has incomplete verification data

**Severity:** Low. **Status:** Open.

The qualified investor pilot account holds the qualified role but has no organisation, telephone, registered address, business registration, or website recorded. The approval workflow requires all five before granting that role, so this account is in a state the application flow cannot produce.

It is a seeding artifact: the account was created directly at the target role rather than promoted through review. The risk is presentational — screens that prompt for missing verification data may appear for a persona the guides describe as fully approved.

### DEF-007 — Home page requests a content block that does not exist

**Severity:** Low. **Status:** Open.

Every home page load requests a hero content block and receives a not-found response. The page renders correctly from its built-in default, so there is no visible impact, but it produces a console error on the platform's most-visited page and one an observant stakeholder may notice and report.

### DEF-008 — Local development server cannot complete sign-in

**Severity:** Low. **Status:** Open.

Sign-in against the local development server does not complete; the form submits and returns to its initial state. The likely cause is that the port in use is not among the origins the authentication service trusts. Development-only, with no production impact, but it prevents verifying authentication changes locally and forces verification through deployment — which is what allowed DEF-002 to obscure the DEF-001 fix.

## 5. Observations Pending Triage

| Observation | Note |
| --- | --- |
| Demo popup, announcement bar and consent banner | Raised to DEF-011 after the popup was found in captured screenshots rather than merely predicted to be a risk. |
| Sign-in page requests restricted endpoints | The signed-out sign-in page requests engagement and inquiry data, receiving unauthorised responses, then repeats them as a registered user and receives forbidden responses. Correctly refused in both cases, so this is wasted work rather than an exposure. |

## 6. Verification Coverage

| Assertion | Layer | Result |
| --- | --- | --- |
| All six roles authenticate | Browser | Pass |
| All six roles land on their own console | Browser | Pass, with DEF-002 caveat |
| All six roles reach their console and it finishes loading | Browser | Pass |
| Fifteen forbidden console navigations are turned away | Browser | Pass |
| Authorization spine over HTTP | Smoke suite | Pass |
| Business workflow state | API suite | Not yet built |

The fifteen forbidden-console assertions are the coverage that previously did not exist. The smoke suite could only prove that no console content was served; it could not prove the user was taken somewhere they were entitled to be.

## 7. Source Notes

| Source | Use |
| --- | --- |
| Browser automation runs, 2026-09-05 | Primary evidence for DEF-001, DEF-002, DEF-007 and the observations |
| Network traces captured during failing runs | Request sequences, cache headers, and build fingerprints |
| Direct database read of pilot account state | DEF-006 |
| Platform codebase | Authoritative source for expected roles, routes and transitions |

**Important validation note**

*Severity reflects impact on the pilot walkthrough, not a production risk assessment. Seeded demonstration records are illustrative and pending official validation, and defects arising from seeded data are marked as such rather than treated as platform faults.*
