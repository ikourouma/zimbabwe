# Walkthrough Guide — Government Reviewer

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform | Walkthrough Guide v1.0*
*Prepared for pilot review | September 2026*

## Executive Snapshot

| Question | Answer |
| --- | --- |
| Who is this document for? | Anyone testing the platform as a **Government Reviewer** — a national-level official who assesses projects and investor engagements. |
| What does this persona represent? | The concept note's Government Official. The platform implements it as the `government` role. |
| Where do I start? | `https://zidaproject.com/auth/sign-in` |
| What will I be able to do? | See every project at every status nationally, move projects through review to approval, progress investor engagements, and approve memoranda on the government side. |
| What will I not be able to do? | Publish a project, create projects or engagements, decide investor applications, or manage accounts. |
| How long does this take? | About 40 minutes to work through every process. |
| What do I do if something is wrong or missing? | Record it in section 8. Every entry becomes a tracked enhancement request. |

## Contents

1. Who This Persona Is
2. Signing In
3. Your Console
4. What You Can Do
5. What You Cannot Do, and Why
6. Step-by-Step Processes
7. Where You Sit in the Chain
8. Your Feedback
9. Validation Note

---

## 1. Who This Persona Is

The Government Reviewer is a national-level official responsible for assessing what enters the investment registry and how investor approaches are handled. Unlike a Ministry Official, whose remit stops at their own ministry's portfolio, a Government Reviewer sees the national picture.

This is the role that carries the substantive review burden. It has real authority — it can move a project all the way to **approved** — but it deliberately stops short of publication.

> **Concept note lineage**
> Section 10 of Concept Note v0.3 defines this persona as: *"Review and validate project submissions, monitor investor engagement, generate reports."* All three are live.

> **An important clarification**
> This is not a read-only oversight account. A Government Reviewer edits project content, advances review status, progresses engagements, and approves memoranda on ZIDA's behalf. If your expectation was a view-only role, that is worth discussing — the platform has given this persona working authority, not observer status.

## 2. Signing In

Go to `https://zidaproject.com/auth/sign-in` and enter your credentials. You will arrive at `https://zidaproject.com/deal-room`.

The address is the same one investors use, but the console is badged **Government Reviewer Console** and behaves differently: you see every project at every status, and you can act on other parties' records rather than only your own.

Before documents are released to you, the platform asks you to accept a confidentiality undertaking — the Sovereign Confidentiality Framework — as it does of every non-ZIDA console role. It appears once, on first sign-in, and records the date, version and the title you attest under. The walkthrough accounts have this pre-accepted so that every reviewer sees the same console; on a real account it is the first thing you will see.

> **What to check**
> Your account is identified by the email address you sign in with, and that address is what the audit trail records against every project you move to approved. This role carries national scope, so that record matters more here than anywhere else on the platform. Should a Government Reviewer account be **required** to use an official government address rather than any working mailbox — and should losing that address withdraw platform access with it? Section 9 of the Overview sets out what that would make possible. Record your view in section 8.

## 3. Your Console

![The Government Reviewer console overview.](docs/screenshots/government/overview.png)

The console opens on Deal Room Overview, and the left rail is badged Government Reviewer Console rather than as an investor workspace. Four figures carry the national position: forty projects in pipeline, twenty-six published, nine in review and ten engagements. Below them the Engagement Funnel plots investor approaches by stage — submitted, under compliance review, approved, rejected. The Platform Snapshot records twenty-six published projects, US$2.21 billion of capital and four investors, with published projects broken out by sector.

Nine projects in review is the reviewer's own workload, and it sits beside the twenty-six already published, so the ratio of what is being assessed to what has reached the registry is legible immediately. The sector breakdown answers the question a minister asks first: where the pipeline is concentrated. My Analytics is kept separate and personal — saved projects, documents previewed, messages sent — so an officer's footprint is measured on its own terms rather than folded into the national aggregate.

Your navigation contains eleven sections:

| Section | Address | What it is for |
| --- | --- | --- |
| Overview | `/deal-room` | Review load and recent activity |
| Pipeline | `/deal-room/pipeline` | Every project nationally, at every status |
| Saved Projects | `/deal-room/saved` | Projects you are tracking |
| My Proposals | `/deal-room/proposals` | Proposal records visible to you |
| Engagements | `/deal-room/engagements` | Every investor engagement nationally |
| MOU Registry | `/deal-room/mou` | Memoranda awaiting government approval |
| Document Vault | `/deal-room/vault` | Your non-disclosure certificate and records |
| Communication Hub | `/deal-room/communication` | Threads on projects and engagements |
| Reports | `/deal-room/reports` | Includes the National Executive Report |
| My Profile | `/deal-room/profile` | Your profile and ministry assignment |
| Account | `/deal-room/settings` | Security settings |

### Pipeline

![The Pipeline. Unlike an investor's view, this shows drafts, submissions and archived records as well as published projects.](docs/screenshots/government/pipeline.png)

Here the national portfolio is laid out as a board, one column per stage: draft, submitted for review, under review, changes requested, approved and published. Counts appear on each column and again as filter chips above them — thirty-two records in all, twenty-six of them published, with a single item each in draft, under review and changes requested. Cards name sector and indicative capital, from Powertel Fibre Internet (GPON) at US$26.9 million to Solgas Energy's 10MW solar project. The same records can be read as a list, a table or a matrix.

Congestion cannot hide on a view like this. An empty submitted-for-review column and two projects sitting at approved tell a reviewer, and anyone looking over their shoulder, exactly where the pipeline has stalled and where it has not. The approved column is the more consequential of the two: those projects have cleared substantive assessment and are waiting on ZIDA to publish them. That gap between approved and published is not a delay in the workflow — it is the workflow, made visible.

This is your working surface. Two things distinguish it from the investor view. First, **status**: you see draft, submitted, under review, changes requested, approved, published and archived records, not only what is live. Second, **authority**: you can move projects between statuses directly from this view.

There are optional filters for *my ministry only* and *assigned to me*. Both are **off by default** — the national view is the default view, which is the correct default for a national reviewer but is worth confirming against how your team actually works.

### Engagements

![Engagements. Every investor approach nationally, with the controls to progress them.](docs/screenshots/government/engagements.png)

Ten investor engagements are listed nationally, each row naming the investor, the organisation behind them, the project approached and the current status. Nomsa Dube of Kestrel Capital Partners stands at approved against the Masuwe International Medical Center Project, with a term sheet under legal review and a site visit completed; James Okafor of Sahara Frontier Infrastructure Fund is under compliance review on Goromonzi Agro Processing, awaiting an updated feasibility study. The status cell on each row is a control, and the chips above count three submitted, two under compliance review and four approved.

What this establishes is that an approach to the Zimbabwean state is a recorded case rather than a conversation. Every engagement carries a named counterparty, a specific project, a stage and a dated note explaining why it stands where it does. A reviewer can therefore answer, without asking anyone, which investors are waiting on government and which are waiting on their own submissions — and so can an auditor reading the same rows a year later.

### MOU Registry

![The MOU Registry. Your role here is approval, not drafting.](docs/screenshots/government/mou.png)

Ten memoranda are grouped by stage, and the stages are kept deliberately distinct: no MOU yet, drafting, in review, both parties approved, finalized, ready for signature and executed. Six records sit at no MOU yet, one is drafting, one in review, one ready for signature and one executed. Each row sets the engagement's status against the memorandum's stage, alongside ticket sizes where the investor has stated them — USD 10–15M, $5M–$25M, $1M–$5M. The register exports to CSV.

Putting engagement status beside memorandum stage in the same row is what makes the dependency checkable rather than merely stated: nothing reaches drafting while its engagement is still submitted. Separating both-parties-approved from finalized and from executed matters as much again, because it means agreement, settlement of text and signature are three events with three records. A reviewer supplies one of those approvals, and the register shows the remainder of the chain proceeding without them.

### Reports

![Reports, including the National Executive Report available to government roles.](docs/screenshots/government/reports.png)

Two tabs sit under Reports — My Activity Summary, open here, and National Executive Briefing. The activity report renders as a formal document rather than a dashboard: headed Republic of Zimbabwe · Investment Platform, carrying its own reference number, generated by Tafadzwa Mutasa (Government), with a snapshot timestamp to the second and its source recorded as live platform data. The account summary states name, email, organisation and role, marks the Confidentiality Framework accepted, and totals engagements, pending review and approved. A print or save-as-PDF control sits above it.

A report that names its author, its moment and its source can be circulated outside the platform without losing its standing, which is the difference between an export and a briefing. Nothing here was transcribed into a slide deck, so there is no gap between what the platform holds and what leadership reads. The confidentiality attestation appearing on the same page as the figures is a small detail with a specific effect: the terms under which an officer holds this information travel with the information.

### Communication Hub, Vault, Saved, Proposals, Profile and Account

![The Communication Hub.](docs/screenshots/government/communication.png)

One inbox holds ten threads, filtered as general enquiries, active deals and engagements. Threads on the left are titled by project and show message counts and the last contributor. The open thread concerns Goromonzi Agro Processing Industrial Park (Special Economic Zone), with the project's own strip above it — published, US$36.9 million total cost, Mashonaland East. Within the thread, a project amendment request is recorded as a card: the requesting ministry, the proposed change to location, its routing for first review, and its decline by that ministry's administrator.

Correspondence and governance action occupy the same thread here, so the reasoning behind a decision is stored next to the decision rather than in somebody's mailbox. The composer's visible-to-investor setting keeps internal deliberation and investor-facing reply in one record without confusing the two. Threads export to CSV or PDF, and the stated response expectation of one business day sits on the page, which means an investor's sense of how the state communicates rests on something measurable.

![The Document Vault.](docs/screenshots/government/vault.png)

Four cards make up the vault. The first records the non-disclosure certificate as accepted on 5 September 2026 at 10:36:22 PM, against agreement version 1.0. The second, Company & accreditation, shows business registration not uploaded and offers slots for a commitment letter and a guarantee letter. The remaining two, MOU snapshots and recent document downloads, are empty on this account, reading no MOUs yet and no downloads recorded yet.

Recording the confidentiality undertaking with a version number as well as a timestamp answers a question that otherwise depends on memory: not merely whether an officer accepted terms, but which terms. The download log beside it does the same for documents, so the question of who saw a sponsor's financial model has an answer held on the officer's own record. The accreditation slots belong to the investor side of the platform, and on a government account they are expected to remain empty.

![Saved Projects.](docs/screenshots/government/saved.png)

Saved Projects is a personal watchlist, described on the page as somewhere to track opportunities saved from a project's detail page or card. On this account it is empty, showing a single prompt to browse the pipeline and save projects to build the list, with a Browse Pipeline button beneath it.

The distinction worth noting is that saving carries no authority. A reviewer following a project has not been assigned it, has not claimed it and has altered nothing about its status, which is why the pipeline keeps a separate assigned-to-me filter. Across a national portfolio of forty records, an officer needs a way to keep sight of a handful of files without that interest being read as ownership of them. This page is that, and nothing beyond it.

![Proposals visible to you.](docs/screenshots/government/proposals.png)

My Proposals is described as projects you have originated and submitted into ZIDA's national investment pipeline, and it is empty on this account. What is present, once in the corner of the page and again at its centre, is a Propose a Project control, together with an invitation to submit a bankable project idea directly into ZIDA's review pipeline.

This one is worth pausing on, because section 5 records project creation as sitting with ministries, ZIDA and qualified investors rather than with a reviewer. The control appears here regardless, and an officer who originated a project through it would then be in a position to review their own submission — the separation this role is built around. Whether the page should be absent for this persona, or present in a read-only form, is the kind of question section 8 exists to capture.

![My Profile.](docs/screenshots/government/profile.png)

My Profile holds the institutional record rather than personal preferences, and the page says so: this is the same view ZIDA staff see on your Institutional Compliance Dossier. Tafadzwa Mutasa is badged Government User. Beneath sits Company & Representative, carrying the entity of record — Zimbabwe Investment and Development Agency, its corporate phone and website, business registration ID ZIDA-ACT-2019-10, and an address at ZB Life Towers, 77 Jason Moyo Avenue, Harare — with the authorised representative titled Investment Promotion Officer. A compliance and documents section follows.

Holding one identity of record, seen identically by the officer and by ZIDA, removes the usual source of dispute about who filed what on whose behalf: the fields that prepopulate a submission are the fields both parties can read. One point to check against section 5, which notes that amendment and association requests require a ministry assignment — the entity here is the agency itself, and no ministry assignment appears on the page. If national reviewers are expected to file those requests, that needs confirming.

![Account settings.](docs/screenshots/government/settings.png)

Account & Security divides into four tabs — Profile, Security, Sessions and Notifications — with Profile open. Display name is editable. Email is marked read-only, and the entity, Zimbabwe Investment and Development Agency, is marked managed by ZIDA. Identity is recorded as a local password. Below the card, Access & Entitlements sets out the account's remit in plain language: government portfolio oversight, sovereign engagement tooling and inter-ministerial coordination.

That two of these fields cannot be edited by the person they describe is the point of the page. An officer cannot quietly change the address the audit trail records against every project they approve, nor reassign themselves to a different institution, because the entity is held by ZIDA rather than by the user. Section 2 asks whether that address should be required to be an official government one; because the field is already administered centrally, answering that question is a policy decision rather than a rebuild.

## 4. What You Can Do

| Capability | Where | Notes |
| --- | --- | --- |
| See every project at every status, nationally | Pipeline | Not limited to one ministry |
| Edit project content during review | Any project | While in draft through changes-requested |
| Move a submission into review | Pipeline, any project | Submitted for review → under review |
| Request changes from the originator | Any project under review | Returns it with your notes |
| Approve a project | Any project under review | Clears it for publication by ZIDA |
| Archive a project | Any project under review | Terminal state; there is no deletion |
| See every investor engagement nationally | Engagements | Including drafts |
| Advance an engagement through review | Engagements | Submitted → under review → approved or rejected |
| Submit an investor's draft engagement on their behalf | Engagements | Staff assistance path |
| Request a correction on an engagement | Engagements | |
| Approve a memorandum on the government side | MOU Registry | One half of the two-sided gate |
| Request changes to a memorandum | MOU Registry | Returns it to drafting |
| File an amendment request on a project | Any project | Scoped to your ministry |
| File an association request to add a beneficiary ministry | Any project | Requires a ministry assignment on your profile |
| Message investors and colleagues | Communication Hub | |
| Open the National Executive Report | Reports | Not available to investors |
| See qualified-investor application counts | Overview | Counts only — see section 5 |

## 5. What You Cannot Do, and Why

| Not available | Why | Who holds it |
| --- | --- | --- |
| Publish an approved project | Publication is separated from approval so that no single official can both clear a project and place it on the national registry | ZIDA Admin, Platform Manager |
| Unpublish or reverse a published project | Same separation, in the other direction | Platform Manager |
| Create a project | Origination sits with ministries, ZIDA and investors — a reviewer creating what they then review would collapse the separation | Ministry Official, ZIDA Admin, Qualified Investor |
| Create an engagement | An engagement is an investor's approach; government does not raise one on its own behalf | Qualified Investor |
| Draft or finalize memorandum content | You approve government's position; drafting and execution sit with ZIDA | Qualified Investor and ZIDA Admin |
| Decide qualified-investor applications | Accreditation is a ZIDA function | ZIDA Admin, Platform Manager |
| Open the inquiries queue | You see application counts, not the queue itself | ZIDA Admin, Platform Manager |
| Create accounts or change roles | Entitlement management is an administrative function | Ministry Official (own ministry), ZIDA Admin, Platform Manager |
| Edit sectors, ministries or strategic pillars | The classification scheme is national infrastructure | Platform Manager |
| Assign a case manager | Workload allocation is an administrative function | ZIDA Admin, Platform Manager |

> **The separation that defines this role**
> A Government Reviewer can take a project to **approved** but not to **published**. That single boundary is the core of the governance model: substantive assessment and the act of publication are held by different people, so nothing reaches the national registry on one person's authority alone.

> **One thing to confirm**
> Amendment and association requests require a ministry assignment on your profile. A Government Reviewer account with no ministry can review nationally but cannot file those requests. If national reviewers in your structure are not attached to a ministry, tell us in section 8 — the requirement can be relaxed.

## 6. Step-by-Step Processes

### Process A — Work the review queue

1. Open **Pipeline** at `https://zidaproject.com/deal-room/pipeline`.
2. Filter to **submitted for review** to see what is waiting.
3. Open a submission and read it in full, including its documents.
4. Move it to **under review**. This signals to the originator that assessment has begun.
5. Reach one of three decisions:

| Decision | Effect | What the originator sees |
| --- | --- | --- |
| Request changes | Returns to the originator, editable again | Your notes, and the ability to revise and resubmit |
| Approve | Cleared for publication | Approved status; awaiting ZIDA |
| Archive | Closed | Archived status |

6. Record your reasoning. Every transition is stamped with who acted and when, and appears in the audit trail.

> **What to check**
> Is the three-way decision sufficient for how your review committee works? If your process needs an intermediate state — conditional approval, or referral to another body — record it in section 8.

### Process B — Assess an investor engagement

1. Open **Engagements** at `https://zidaproject.com/deal-room/engagements`.
2. Filter to **submitted**.
3. Open the engagement and read the investor's stated intent, structure, indicative capital and timeline.
4. Move it to **under review**.
5. Use the **Communication Hub** thread if you need more from the investor, or **request a correction** if something specific must be fixed.
6. Decide: **approve** or **reject**.

Approval matters more than it appears: it is what unlocks the memorandum. No memorandum exists until its engagement is approved.

### Process C — Approve a memorandum on the government side

1. Open **MOU Registry** at `https://zidaproject.com/deal-room/mou`.
2. Open a memorandum that is **in review**.
3. Read the content and the comment thread.
4. Record your approval on the government side, or **request changes**.

A memorandum needs approval from both the investor and government before it can be finalized. Requesting changes returns it to drafting and clears both approvals, so both parties re-approve after a revision — nobody's approval silently carries over onto text they have not seen.

You approve; ZIDA finalizes, circulates for signature, and records execution.

### Process D — Add a beneficiary ministry to a project

Use this when a project's benefit clearly spans more than the ministry it was filed against.

1. Open the project.
2. File an **association request** naming the ministry to be added and your justification.
3. ZIDA decides.

You cannot reassign a project's ministry directly, and neither can a Ministry Official. Both must request it, and ZIDA decides — so a project cannot be moved between ministries on one party's authority.

### Process E — Read the National Executive Report

1. Open **Reports** at `https://zidaproject.com/deal-room/reports`.
2. Select the **National Executive Report** tab.

This is the national-level view of pipeline health, sector distribution and engagement volume, and it is not available to investor accounts.

## 7. Where You Sit in the Chain

| Stage | Who acts |
| --- | --- |
| A project is created | Ministry Official, ZIDA Admin, or a Qualified Investor as a proposal |
| It is submitted for review | The originator |
| It is assessed | **You**, or the beneficiary Ministry Official |
| It is approved | **You**, or the beneficiary Ministry Official |
| It is published | ZIDA Admin or Platform Manager |
| An investor raises an engagement | Qualified Investor |
| The engagement is progressed and decided | **You** or a ZIDA Admin |
| A memorandum is drafted | Qualified Investor and ZIDA Admin |
| It is approved on both sides | Qualified Investor and **you** |
| It is finalized and executed | ZIDA Admin |

You appear at four points, and at none of them are you the only party involved. That is deliberate.

## 8. Your Feedback

| # | Page or process | What you expected | What happened | Priority |
| --- | --- | --- | --- | --- |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

| # | Capability requested | Why it matters | Who benefits |
| --- | --- | --- | --- |
| 1 | | | |
| 2 | | | |
| 3 | | | |

## 9. Validation Note

> **Important**
> Seeded demonstration records are illustrative and pending official validation. Financial indicators, project readiness claims, ministry mappings and supporting documents should be validated by ZIDA and the relevant authorities before production publication. The platform treats imported records as draft or pending validation until approved through the governance workflow.
