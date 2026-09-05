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

You will be asked to accept a non-disclosure undertaking before documents are released to you, as every non-ZIDA console role is.

## 3. Your Console

![The Government Reviewer console overview.](docs/screenshots/government/overview.png)

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

This is your working surface. Two things distinguish it from the investor view. First, **status**: you see draft, submitted, under review, changes requested, approved, published and archived records, not only what is live. Second, **authority**: you can move projects between statuses directly from this view.

There are optional filters for *my ministry only* and *assigned to me*. Both are **off by default** — the national view is the default view, which is the correct default for a national reviewer but is worth confirming against how your team actually works.

### Engagements

![Engagements. Every investor approach nationally, with the controls to progress them.](docs/screenshots/government/engagements.png)

### MOU Registry

![The MOU Registry. Your role here is approval, not drafting.](docs/screenshots/government/mou.png)

### Reports

![Reports, including the National Executive Report available to government roles.](docs/screenshots/government/reports.png)

### Communication Hub, Vault, Saved, Proposals, Profile and Account

![The Communication Hub.](docs/screenshots/government/communication.png)

![The Document Vault.](docs/screenshots/government/vault.png)

![Saved Projects.](docs/screenshots/government/saved.png)

![Proposals visible to you.](docs/screenshots/government/proposals.png)

![My Profile.](docs/screenshots/government/profile.png)

![Account settings.](docs/screenshots/government/settings.png)

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
