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
| DEF-012 | Sign-in and registration pages carried developer instructions | Medium | Closed |
| DEF-013 | Reviewers were offered controls the server refuses | Medium | Closed |
| DEF-014 | A placeholder record sat in the national registry | Medium | Closed |
| DEF-015 | Two guides described entitlements the platform does not enforce | Medium | Closed |
| DEF-016 | Developer test records were visible in the consoles that carry the strongest arguments | High | Closed |
| DEF-017 | A completed profile displayed as blank and announced unsaved changes | High | Closed |
| DEF-018 | Pipeline counts did not add up | Medium | Closed |
| DEF-019 | Three consoles described authority they do not hold | Low | Closed |
| DEF-020 | The pipeline could present a months-old bundled snapshot as current | High | Closed |
| DEF-021 | Three public pages advertised three different catalogue sizes | Medium | Closed |
| DEF-022 | No card on the pipeline board showed a complete project name | Low | Closed |
| DEF-023 | The walkthrough disclaimer was written inside the investor's own words | High | Closed |
| DEF-024 | Analyst working notes were printing on investor-facing cards | High | Closed |
| DEF-025 | Five engagements and a sent message, beside "No recent activity yet" | Medium | Closed |
| DEF-026 | A project title cut mid-parenthesis with nothing to mark the cut | Low | Closed |
| DEF-027 | The demonstration investor was headquartered in Virginia | Medium | Closed |
| DEF-028 | The activity report contradicted its own summary at the fold | Low | Closed |
| DEF-029 | A headline figure that did not follow from the caption beneath it | High | Closed |
| DEF-030 | Every activity feed opened on a sentence about nobody | Medium | Closed |
| DEF-031 | The governance trail rendered function names to its auditors | Medium | Closed |
| DEF-032 | The assurance exhibit was exhibiting the test harness | High | Closed |
| DEF-033 | A personal report that answered for the wrong person, and totalled the wrong money | High | Closed |
| DEF-034 | The same investor was shown two different pipeline totals one click apart | Medium | Closed |
| DEF-035 | Two unrelated investors accepted the confidentiality framework at the same second | Low | Closed |
| DEF-036 | The national console showed no activity while a single ministry desk showed seven entries | High | Closed |
| DEF-037 | The assurance exhibit's own filters did not add up to its own total | High | Closed |
| DEF-038 | Stored enumerations printed as they are stored | Low | Closed |
| DEF-039 | A document of record cut off the identity it attributes itself to | Medium | Closed |
| DEF-040 | An oversight report could not tell two investors apart | Medium | Closed |
| DEF-041 | Two labels that each carried two meanings | Medium | Closed |
| DEF-042 | Text rendered as mojibake across the consoles | High | Closed |
| DEF-043 | American spelling on a document of record | Low | Closed |
| DEF-044 | Email addresses breaking mid-token on printed reports | Low | Closed |
| DEF-045 | An implementation detail in the governance trail | Low | Closed |
| DEF-046 | Government captures cut off mid-content | Medium | Closed |
| DEF-047 | American spelling inside the accepted non-disclosure text | Low | Open (needs an agreement version) |

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

### DEF-016 — Developer test records were visible in the consoles that carry the strongest arguments

**Severity:** High. **Status:** Closed.

Reconciling every guide against its recaptured screenshots turned up the same finding from six independent readings: months of automated test runs had left their working records in the demonstration database, and those records had surfaced in exactly the places a stakeholder looks hardest.

The Communication Hub — the screen three guides use to demonstrate the amendment workflow — contained no genuine amendment at all. Every card on the platform had been filed by a test harness, with bodies reading *p8 selftest other ministry* and *phase8 selftest decline path*. The national pipeline carried a project called *Smoke Ministry Project 1785559386915*, sitting at *approved* among real proposals. The MOU Registry's only executed memorandum belonged to a counterparty named *MOU Smoke Investor*, alongside *Draft-Lock Investor* and *Smoke Delegate Test Investor*. Twelve messages read *Smoke test message from qualified @ 2026-07-23T01:44:23.899Z*. And every one of the older pilot accounts appeared under its function rather than a name, so the audit log — the view whose entire claim is that it is an institutional record — attributed decisions to *Pilot Government User* and *Pilot Ministry Admin — Finance*.

Two different remedies were required, because the two problems are not the same kind of thing.

The harness records were deleted: eighteen in total, comprising two projects, five engagements and eleven messages. `npm run demo:purge` reports what it would remove and removes it only when passed `--commit`. It identifies harness output by vocabulary no person would use to name a project — *smoke*, *selftest*, *phase8* — deliberately rather than by the word *test* alone, which would match a legitimate *Testing Laboratory Expansion*. It also removes duplicate approaches by the same investor to the same project, which are double-submits from testing rather than two separate propositions.

The pilot accounts were renamed rather than deleted, because they are woven through months of audit history that is worth keeping. The audit log resolves an actor's name by join, so renaming the account relabelled every entry without touching a single actor identifier, action or timestamp. Where a name had been denormalized onto a message or an engagement — thirty-three such rows — the copy was brought back into line with its source. The seven accounts now read as people, and their organisation reads as an institution rather than *ZIDA Pilot*.

Deleting the harness records took three exhibits with them, so those were rebuilt from the seeder rather than left as gaps. The memorandum registry now runs the full lifecycle on real counterparties — drafting, in review, both parties approved, finalized, ready for signature and executed — with approval and signature stamps dated backwards across several weeks so the sequence reads as a negotiation rather than an instant. A genuine amendment request replaces the harness cards, filed by a ministry's own reviewing officer against that ministry's own project, worded as a person would word it, and left open so a walkthrough has a live decision to take rather than a settled one to read about.

### DEF-017 — A completed profile displayed as blank and announced unsaved changes

**Severity:** High. **Status:** Closed.

The *My Profile* page initialised its form on first render, before the authentication context had resolved. It never re-read the values once they arrived. The consequence was that a fully completed company record rendered as eight empty fields, and because the form's contents no longer matched the values it was comparing itself against, the page announced *Unsaved changes.* beside an active Save button on a page nobody had touched.

The display problem was the visible one, and it appeared in the walkthrough screenshots of three consoles. The more serious problem was latent: pressing that Save button would have written the blanks over the stored record, including the fields that qualification depends on. The form now re-synchronises whenever the server's values change, keyed on their content so an unrelated re-render cannot discard work in progress.

### DEF-018 — Pipeline counts did not add up

**Severity:** Medium. **Status:** Closed.

The status filters above the pipeline read *All 38* while the six stage filters beneath them summed to thirty-seven. The missing record was an archived project: it was counted in the total, but there was no archived filter to select it and no archived column on the board to show it.

Both ends are now closed. Archived has its own filter and its own column, so the filters partition the total exactly and selecting one shows what it names. Dropping archived from the count instead would have been the smaller change, but a government reviewer has only this console — no registry view to fall back on — and it would have made closed records unreachable for the one role that cannot reach them any other way.

### DEF-019 — Three consoles described authority they do not hold

**Severity:** Low. **Status:** Closed.

Three pieces of interface copy claimed more, or less, than the platform does.

The ZIDA Admin project registry offered to *execute administrative overrides*. Overrides are a Platform Admin capability exercised elsewhere; a ZIDA Admin advances proposals through the workflow rather than overriding it. The subtitle now says so.

The activity report told a national ZIDA reviewer that it covered *engagements against projects under your ministry's portfolio*. ZIDA's own reviewing officers carry no ministry, by design — their remit is national. Worse, the report treated the absent ministry as a filter matching nothing, so it was permanently empty. It now covers the national pipeline and says that it does.

The capital requirement on each pipeline card shared a line with the ministry name and was the half that fell off the end of the truncation, giving *Agriculture · US$36…*. It is the wrong half to lose: that figure is the one number released to every tier, and the entire reason an investor can size an opportunity before deciding whether to pursue qualification for it. It now has a line of its own, clamped to two lines because a handful of records carry a validation note in that field rather than a figure.

### DEF-020 — The pipeline could present a months-old bundled snapshot as current

**Severity:** High. **Status:** Closed.

Recapturing the screenshots after the data cleanup produced a pipeline board that disagreed with the database in ways the cleanup could not explain. It counted thirty-two projects against a live thirty-seven. It showed Powertel Fibre Internet as *approved* when the record said *under review*. Five projects with ordinary public visibility were missing altogether. The overview page for the same account, captured moments earlier, had every figure right.

The cause is a fallback that had never been examined for what it implies on this particular screen. The project store initialises itself from a dataset compiled into the client, so the public marketing pages can render an opportunity catalogue instantly rather than waiting on a request. It replaces that dataset once the projects endpoint answers. On the marketing pages this is sound. On the pipeline board it is not, because the board's entire claim is that it states where each proposal currently stands — and until the request resolved it was stating that from a snapshot several months old, with no skeleton, no spinner and no error to mark any of it provisional. Thirty-two is exactly the size of the bundled dataset.

Nothing was ever wrong with the endpoint; the screenshot simply arrived first. But a user on a slow connection sees the same thing, and unlike the screenshot they have no second source to check it against. The board and the three registry consoles now wait for the real answer before drawing anything, which is what turned an invisible race into a visible one during this pass — the counts finally reconciling against the database is how it was caught.

This is the third instance in this log of the same shape of fault, after DEF-010 and DEF-017: a failure or a delay absorbed into an interface that continued to look authoritative. It is worth naming as a pattern rather than a coincidence.

### DEF-021 — Three public pages advertised three different catalogue sizes

**Severity:** Medium. **Status:** Closed.

The National Profile page announced 32 catalogue projects. The Opportunity and Platform pages announced 37. All three credited the same ZIDA 2025 deck, and any visitor who opened two of them in adjacent tabs would have seen the platform contradict itself about the size of the thing it exists to present.

This is the same fallback described in DEF-020, seen from the public side. Two ways of reading the counts exist in the codebase: a reactive one that reads the live registry, and a static wrapper over the dataset compiled into the client. Opportunity and Platform used the reactive one; National Profile used the static one. The gap had been invisible while the two datasets happened to agree, and became visible the moment two junk records were deleted — the live figure moved to 37 and the static one stayed at 32, because it cannot move without a rebuild.

All three now read the live registry. The screenshot capture also waits for the registry to answer before photographing a public page, since the pages deliberately render their bundled figures first for speed and a capture could otherwise photograph either number.

### DEF-022 — No card on the pipeline board showed a complete project name

**Severity:** Low. **Status:** Closed.

Adding the archived column took the board from six lanes to seven, and at two lines of clamped text every card became an abbreviation: *Goromonzi Agro…*, *Mossfield Crop…*, *CICADA Macadamia…*, *Misty Mountains…*. Not one card on the board displayed a full project title, which is the single thing a card exists to communicate. Titles now run to three lines and carry the full text on hover.

### DEF-023 — The walkthrough disclaimer was written inside the investor's own words

**Severity:** High. **Status:** Closed.

Every seeded engagement carried the identical note *"Demonstration engagement for the stakeholder walkthrough — illustrative and pending official validation"*, and the same sentence was appended to the body of the concierge message. In the Communication Hub this read as though the investor had ended her own request for sector guidance by disclaiming it, and in the engagements table it made the Notes column look like a field nobody uses.

The intent was right and the placement was wrong. A statement about the provenance of the data belongs around the content, where the sitewide banner already states it once for every page, not inside a person's correspondence where a reader takes it for something they said. Each engagement now carries a note describing what is actually being pursued, and the message body is the message.

### DEF-024 — Analyst working notes were printing on investor-facing cards

**Severity:** High. **Status:** Closed.

`capitalRequired` is free text transcribed from the ZIDA 2025 deck, and a number of records hold a working note rather than a figure. Printed verbatim, one archived card read *"USD2.940 million as interpreted…"* and a saved-project row read *"US$39.5 million total raise referenced in project description; phase costs listed as US$19.5 million and US$15.0 million"*. Commentary about how much confidence to place in a number was appearing on the face of an opportunity an external investor is screening, and the recent decision to set capital in gold had made it the most prominent thing on the card.

Board cards, table cells, matrix entries and thread headers now show the headline figure derived by the same parser the Cost Structure card and every sector roll-up already use, so a card, a project page and an aggregate cannot disagree. Nothing is invented: where no figure parses the cell shows a dash, and the full source text remains on the project's own page and on hover, where there is room to qualify it.

### DEF-025 — Five engagements and a sent message, beside "No recent activity yet"

**Severity:** Medium. **Status:** Closed.

The Deal Room overview counted five engagements and one message sent while the Recent Activity panel immediately beside it reported nothing at all. The counters read the engagement and message tables; the feed reads the audit trail. Seeded records were written straight to the tables, so no trail existed.

The seed now writes the same audit rows the corresponding API routes write. This is a different matter from the download and preview counters, which remain at zero deliberately: those figures are backed by audit rows asserting that a person opened a document, and seeding one would be a claim about someone's conduct rather than a record of a record.

### DEF-026 — A project title cut mid-parenthesis with nothing to mark the cut

**Severity:** Low. **Status:** Closed.

The engagements table truncated project titles at fifty characters of raw string, so *Goromonzi Agro Processing Industrial Park (Special Economic Zone)* appeared as *…Park (Special* — cut inside a bracket, with no ellipsis to indicate anything was missing, and cut at the same point however wide the column happened to be. Truncation is now the column's job: the cell takes the room it has, marks the cut, and holds the full title on hover.

### DEF-027 — The demonstration investor was headquartered in Virginia

**Severity:** Medium. **Status:** Closed.

Zambezi Growth Partners was registered at a suburban office park in Arlington, Virginia, with telephone numbers on +1 703 and a business registration ID of DE-7742119. A foreign investor is precisely who this platform exists to attract, so nationality was never the issue — the combination was. An Africa-named fund with a United States address and a Delaware-shaped prefix reads as a template somebody forgot to finish, and invites a question about the entity that has nothing to do with what is being demonstrated. The firm is now domiciled in Ebène Cybercity, Mauritius, where Africa-focused funds actually domicile.

The same screen listed each team member as their own authorised representative, which made the field look like a duplicate of their job title. A company has one person empowered to bind it, and all three accounts now name her.

### DEF-028 — The activity report contradicted its own summary at the fold

**Severity:** Low. **Status:** Closed.

Screenshots are captured at viewport size, which is the honest picture of what a reader meets on arrival. On the report pages it was the wrong picture: each opens with a summary block and then the table of rows behind it, so the capture showed a summary announcing five engagements above a table listing two, with a third sliced through the middle at the page edge. Since the report is the printable artefact — it carries its own reference number and a print control — a reader was being shown a document that appeared to disagree with itself. The report pages now capture at a taller viewport; every other page is unchanged.

### DEF-029 — A headline figure that did not follow from the caption beneath it

**Severity:** High. **Status:** Closed.

The Government Executive Report is the document ZIDA would put in front of a minister, and its command strip carried a Funnel Conversion Rate of 66.7 per cent above a caption reading *1 MOU(s) executed of 10 engagement(s)*. One in ten is ten per cent. The figure was not wrong — it correctly reported six approved engagements out of the nine that have entered the workflow — but it had been given the caption of an entirely different measure, so the one sentence explaining the number appeared to refute it. Anyone checking the arithmetic would conclude the report could not be trusted on any of its other figures either, which is the more expensive failure. The caption now describes the number above it. The count of executed memoranda is worth reporting in its own right and keeps its own tile in the funnel section below.

### DEF-030 — Every activity feed opened on a sentence about nobody

**Severity:** Medium. **Status:** Closed.

The ZIDA Admin and Platform Manager landing pages both open on Recent Activity, offered in both guides as the proof that every act on the platform is attributed to a named person. Five consecutive entries read *Grace Mutindi logged a new engagement with Grace Mutindi*. An engagement is nearly always logged by the investor themselves, so naming the investor as the counterparty named the actor twice and told the reader nothing; on the investor's own feed, where the actor renders as *You*, it was worse still. The feed now names the project the engagement was logged against, which is the fact the actor's name does not already supply. Rows written before the change carried only a project id, so the title has been recovered onto them by join from the project each row already points at.

### DEF-031 — The governance trail rendered function names to its auditors

**Severity:** Medium. **Status:** Closed.

The Audit Log's Action column — the first column an auditor reads — showed the internal identifier with its full stop swapped for an arrow: *message → created*, *taxonomy → removeSector*, *inquiry → status\_changed*. These are function names. The log is offered as evidence in a governance register, and it should read as English there; the identifier is still exported verbatim in the CSV, which is where a machine reads it. The same substitution reached the activity feed, where an entry read *updated a taxonomy entry (removeSector)*.

### DEF-032 — The assurance exhibit was exhibiting the test harness

**Severity:** High. **Status:** Closed.

An earlier pass deleted the test harness's projects, engagements and messages but left the record of them, and because the log sorts most recent first, that record was what the governance register opened on. The top two entries were a sector named *Testing* created and deleted a minute apart. Below them sat an accreditation granted to `e2e+approval-1788662344020@zidaproject.com` with the reason *Automated workflow check.*, and a long tail of activity against *Smoke Ministry Project 1785559386915*. The same rows headed Recent Activity on both landing pages.

One hundred and one rows have been removed. Every one of them recorded an act performed by an automated harness upon a record that has itself already been deleted; the selection is anchored to vocabulary no genuine record carries — harness email patterns, the harness's own reason strings, and the single taxonomy term it created — and not to a row's age or to any judgement about whether it is convenient. Ninety-three records remain and every one of them describes something a person actually did. Eighty-seven stale copies of an account name held in surviving rows' metadata were realigned at the same time, which is what had produced *Lindiwe Ncube logged a new engagement with Pilot Qualified Investor* — the same person under both her names in a single sentence.

### DEF-033 — A personal report that answered for the wrong person, and totalled the wrong money

**Severity:** High. **Status:** Closed.

Four faults on one page, each of which a government reader would have raised.

The report showed a government reviewer TOTAL ENGAGEMENTS 10 and listed other investors' approaches under the heading *My Engagements*, while the My Analytics card on that same account's overview read Engagements 0. Both figures were correct — the scope note beneath the heading explained that an oversight reader sees engagements within their remit rather than their own — but the heading contradicted the note directly above the table it introduced. The title, subtitle and section heading now say whose engagements these are.

*Tracked Indicative Capital* read US$204.3 million *across 10 of 10 engagement(s) with a stated figure*, above rows whose Indicative Ticket column individually read *$15M (project ask)* and *$36.9M (project ask)*. Where an investor had stated no ticket the report fell back to the project's own published capital requirement, which is reasonable in a cell and clearly labelled there, but summing it put the state's own capital requirements into a total a government reader takes as investor money. The tile is now *Investor-Stated Ticket Value* and counts only what investors have actually stated.

Every approved row's Next Step read *Proceed to MOU drafting*, including rows the MOU Registry showed as Finalised and Executed, because the step was keyed off the engagement status — which stays at approved for the whole memorandum lifecycle. It now reads the memorandum.

And the ministry scope tested only whether a ministry was a project's *primary* beneficiary, having written that predicate out again locally rather than calling the shared one whose own comment asks callers not to. A ministry named as a secondary sponsor holds the same interest in an approach, and its Engagements console lists exactly those, so the report showed fewer engagements than the console the reader had just come from.

### DEF-034 — The same investor was shown two different pipeline totals one click apart

**Severity:** Medium. **Status:** Closed.

Withholding archived projects from investors was applied on the pipeline board and nowhere else, so the Deal Room overview counter continued to report thirty-seven projects in pipeline while the board that counter links to showed thirty-six. The difference was the single archived project, and an investor comparing the two had no way to account for it. Saved Projects had the same gap from the other direction: it kept an Archived filter chip that could never be populated, and would have surfaced a withdrawn project on a watchlist.

The rule now lives in one place — `canSeeArchivedProjects` — and all three screens call it, which is what should have happened when the board was changed. A rule about who may see what is not a property of a screen.

### DEF-035 — Two unrelated investors accepted the confidentiality framework at the same second

**Severity:** Low. **Status:** Closed.

Every demonstration account recorded acceptance at the instant the seed script ran, so the Document Vault showed the qualified and registered investors agreeing to version 1.0 at 5:18:20 PM on the same day. Both investor guides present that timestamp as the evidentiary record of who was bound and when, which is exactly the claim a shared second undermines — it marks the record as generated rather than captured, on the one screen whose argument depends on it being captured. Acceptance is now staggered deterministically from each account's own address, across the preceding fortnight and within working hours: twenty-seven accounts, twenty-seven distinct times. Determinism matters here because a re-seed must not shuffle dates that the guides quote.

### DEF-036 — The national console showed no activity while a single ministry desk showed seven entries

**Severity:** High. **Status:** Closed.

The Government Reviewer's console read *No recent activity yet* on a page whose own counters, six inches above, reported thirty-seven projects in the pipeline, eight under assessment and ten investor engagements. A ministry desk covering one portfolio showed seven entries over the same period. The panel inverted the hierarchy of oversight on the page a national reviewer lands on.

The panel asked the same question of every role: what have *you* done. That is the right question for an investor, whose work here is transacting, and the wrong one for a reviewer, whose work is assessing what other people have done. It is the same distinction that produced DEF-033. The feed is now scoped by remit, using exactly the scopes the audit-log endpoint already grants each role, so nobody's visibility widened; the Deal Room simply stopped asking the narrow question of readers for whom the narrow answer is empty by definition.

### DEF-037 — The assurance exhibit's own filters did not add up to its own total

**Severity:** High. **Status:** Closed.

The Audit Log's category pills read Projects 45, User & Security 9, Site Settings 14, VDR & Documents 1 and Messages & Hub 19. That is eighty-eight. The All pill read ninety-three, and so did the Export CSV button.

Three entity types written since the classification map was last extended — a case manager assigned to a ministry, an investor's team invitation, a marketing overlay — belonged to no category, and the classifier returned null for them. A null meant the record vanished from every pill while remaining in the total and in the export. Five records on the page the platform offers to auditors were reachable only by clearing the filter, and nothing on the page said so. An auditor working category by category, which is how one works, would never have seen them.

The three are now classified. More to the point, the fallback is no longer silent: an entity type nobody has classified lands in a visible *Other* pill, which appears only when it holds something. The next omission will present itself as a number someone can ask about rather than as a discrepancy someone has to notice.

### DEF-038 — Stored enumerations printed as they are stored

**Severity:** Low. **Status:** Closed.

A ministry activity feed read *changed "Powertel Fibre Internet (GPON)" from approved to under_review* — one side of the same transition formatted and the other not, because only one of the two values happens to contain an underscore. Statuses and roles in the feed now resolve through the labels the rest of the platform displays.

### DEF-039 — A document of record cut off the identity it attributes itself to

**Severity:** Medium. **Status:** Closed.

The Activity Report carries a reference number and a print control, and both guides make the point that naming the officer who generated it is what gives the document standing once it leaves the platform. The Account Summary showed *zida.team+demo@zidaproject….* and *Ministry of Information Commu…*. Long values were being truncated with a hover title to recover them, which works on a screen and not on paper — and paper is what this page is for. Long values now wrap.

### DEF-040 — An oversight report could not tell two investors apart

**Severity:** Medium. **Status:** Closed.

Once the Activity Report was scoped to a reader's remit rather than their own authorship, it began listing other parties' engagements — but it had no investor column, because it had never needed one. A ministry report accordingly listed the TelOne Fibre to the Home deployment twice, once submitted and once approved, and the national report listed Goromonzi Agro Processing twice. These are distinct approaches by distinct firms, but the page gave a reader no way to know that, so the rows read as one record duplicated. The column is now shown wherever the reader is not themselves the investor.

### DEF-041 — Two labels that each carried two meanings

**Severity:** Medium. **Status:** Closed.

A console tile read *In Review 8* while the executive report generated from the same data put Under Review at 4. Both were right: the tile aggregates submitted for review, under review and changes requested, and had been given the name of one of the three. It now reads *Under Assessment*.

Separately, the Communication Hub counted a thread under *Active Deals* while labelling it *General question*, so the filter row read *General 0 / Active Deals 1* directly above a thread the same screen called general. *General* now names one thing — the concierge channel and the tab that filters to it — and a project thread carrying no engagement is a *project enquiry*, which is what it is.

### DEF-042 — Text rendered as mojibake across the consoles

**Severity:** High. **Status:** Closed.

Three independent reviews of the walkthrough captures reported the same thing: em dashes rendering as `â€"` and separators as `Â·`. The Communication Hub was the worst affected — the thread list read *"Project enquiry Â· 2 messages"*, the thread pane *"General enquiry â€" project-less concierge thread"*, and the project header bar *"Â· $29.97M"* — but it also reached the investor dashboard's own subtitle, the transcript export's title, and the *Select an opportunity…* placeholder. A reader has no way to tell mangled text from a broken page.

**Root cause.** Not a rendering or serving fault. Seven source files had their non-ASCII characters double-encoded on disk during earlier editing: Windows PowerShell's `Get-Content` decodes a file with no byte-order mark using the system ANSI code page, and `Set-Content -Encoding UTF8` writes one back with a mark. Round-tripping a UTF-8 file through that pair reads each multi-byte character as a run of Windows-1252 characters and re-encodes each of those as UTF-8, so `—` becomes `â€"` and `·` becomes `Â·`. The result is still valid UTF-8 and still compiles, which is why nothing failed and it survived to the screenshots.

**Fix.** `scripts/repair-mojibake.ts` reverses the corruption exactly, since it is a known composition of two encodings. It works run by run rather than whole-file — several files held correct and corrupted text side by side, having been edited by both routes — and replaces a run only when it round-trips to valid UTF-8, so genuine punctuation is never rewritten. It repaired 48 runs across seven files and stripped the byte-order marks. A repo-wide sweep now reports no mojibake sequences and no C1 control characters in any tracked source file.

### DEF-043 — American spelling on a Republic of Zimbabwe document of record

**Severity:** Low. **Status:** Closed.

Both executive report captures labelled the account summary tile *ORGANIZATION*, against British spelling everywhere else in the platform and in the guides. The same spelling appeared on twenty-three user-facing labels, table headers and CSV export columns across sixteen files, and on a further eleven strings of body prose and search placeholders — the Getting Started checklist's *"Add your organization and phone number"*, the qualification banner, the search boxes above the enquiry, memorandum, engagement and user tables, the role-change error message, the team-invite email and the privacy policy. All now read *Organisation*.

Two exclusions are deliberate. The schema.org `"@type": "Organization"` in the site metadata is a vocabulary term rather than prose. More importantly, the non-disclosure text in `lib/governance/nda.ts` and the acceptance checkbox beside it still read *organization* and *authorized*: that is a versioned agreement which seeded and pilot accounts have already accepted on the record, and silently editing the wording would leave those recorded acceptances pointing at text that no longer exists. **This one is open** — see DEF-047.

### DEF-044 — Email addresses breaking mid-token on printed reports

**Severity:** Low. **Status:** Closed.

DEF-039 stopped long values being truncated, but let them wrap at whatever character met the column edge: the national report showed `zida.team+demo@zidaproject.co` / `m`, and the ministry report `min-` / `ict.admin+demo@zidaproject.co` / `m`. The second is the worse case, because a line ending `min-` reads as a hyphenated word rather than as part of an address. Report tiles now mark the punctuation inside a long value as a preferred break point, so a line ends after an `@` or a dot where a reader already expects a seam. Mid-token breaking remains as the fallback for a value with no punctuation at all.

### DEF-045 — An implementation detail in the governance trail

**Severity:** Low. **Status:** Closed.

The audit log's Entity ID column showed `singleton` against every site-settings change. That is the literal primary key of a single-row table, not an identifier that distinguishes anything, and putting it in front of an auditor invites a question the platform cannot usefully answer. The column now shows an em dash where there is no record to name. The raw value is still exported verbatim in the CSV, where the reader is a machine.

### DEF-046 — Government captures cut off mid-content

**Severity:** Medium. **Status:** Closed.

Two Government Reviewer captures were framed for an investor's version of the same route. The Activity Report stopped part-way through the fourth of ten engagement rows and omitted the confidentiality footer that the guide's commentary discusses; the overview's Recent Activity panel ran past the bottom edge, so a reader could not tell whether it held three entries or thirty. Both were consequences of fixes landing earlier in this pass — the report is now scoped to the reader's whole remit and carries an extra column, and the activity panel only became populated when the feed was made role-aware. The reviewer console now sets its own capture heights instead of inheriting the investor's.

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

### DEF-047 — American spelling inside the accepted non-disclosure text

**Severity:** Low. **Status:** Open, and deliberately so.

The confidentiality framework's own wording still reads *organization*, *authorized* and *unauthorized*, and so does the acceptance checkbox beside it, while the rest of the platform now reads *organisation* and *authorised*. On a Republic of Zimbabwe agreement this is the single place where the inconsistency matters most.

It was left alone rather than swept up with DEF-043 because it is not a label. It is the text of a versioned agreement that seeded and pilot accounts have already accepted, with the acceptance timestamped in the audit trail. Editing it in place would leave those records attesting to wording that no longer exists — a small defect traded for a governance one.

**What closing it requires:** a new version of the agreement, so that acceptances continue to point at the text that was actually accepted, and a decision on whether existing holders must re-accept. That is a decision for ZIDA rather than an implementation detail, which is why it is recorded here rather than fixed. It does not block the demonstration; no screen shows the two spellings side by side.

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
