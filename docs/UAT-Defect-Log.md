# Pilot Verification Defect Log

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform | Walkthrough Guide v1.0*
*Prepared for pilot review | September 2026*

## Executive Snapshot

| Question | Answer |
| --- | --- |
| What is this? | A running record of every defect found while verifying the pilot platform, with evidence, severity, and remediation status. |
| How were these found? | Browser automation against production. None was found by the pre-existing HTTP smoke suite, which by design cannot observe client-side behaviour. |
| What is the most serious open item? | DEF-002. The content delivery network serves a previous build's JavaScript after a deployment, so a corrected defect can remain live for users and stakeholders indefinitely. |
| What was the most serious closed item? | DEF-001. Every role signed in successfully and then came to rest on the public marketing homepage instead of their console. |
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
| High | Blocks a documented user journey, or allows a corrected defect to persist in production |
| Medium | Degrades a journey or weakens an operational safeguard, with a workaround available |
| Low | Cosmetic, documentation-only, or confined to non-production environments |

## 2. Summary

| ID | Title | Severity | Status |
| --- | --- | --- | --- |
| DEF-001 | Sign-in strands every role on the public homepage | High | Closed |
| DEF-002 | Deployment does not invalidate the cached page shell | High | Open |
| DEF-003 | Apex and www both served as canonical | Medium | Closed |
| DEF-004 | Test account cleanup leaves orphaned profile records | Medium | Open |
| DEF-005 | UAT guide documented the wrong landing route | Low | Closed |
| DEF-006 | Qualified pilot account has incomplete verification data | Low | Open |
| DEF-007 | Home page requests a content block that does not exist | Low | Open |
| DEF-008 | Local development server cannot complete sign-in | Low | Open |

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

## 4. Open Defects

### DEF-002 — Deployment does not invalidate the cached page shell

**Severity:** High. **Status:** Open.

Statically prerendered pages are served with a one-year shared-cache lifetime, and deployment does not purge them. The cached page references the previous build's fingerprinted JavaScript, so visitors continue running old code after a release.

**Evidence.** A verification run 33 minutes after the deployment that fixed DEF-001 still loaded the pre-fix script, with the cache reporting a hit and an age older than the build itself. Requesting the same page with a unique query string returned the current build. The test then passed, confirming the fix was correct and that only delivery was stale.

**Why this is the most serious open item.** It undermines every other remediation. A defect can be found, fixed, deployed, and still be live for stakeholders. It also breaks the standard staleness check: the build endpoint is dynamic and correctly reported the new commit while the page shell was still old, so confirming the deployed commit is not sufficient evidence that users are running it.

**Suggested remediation.** Purge the cache on deploy, or shorten the shared-cache lifetime for prerendered pages to something a release cycle can tolerate. Until then, `E2E_BYPASS_CDN=1` forces the suite to exercise deployed code, and stakeholders should hard-refresh before a walkthrough.

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
| Demo popup, announcement bar and consent banner | All three overlay the interface on first visit. Expected for seeded demonstration content, but they must be dismissed before screenshot capture or they appear in every guide. |
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
