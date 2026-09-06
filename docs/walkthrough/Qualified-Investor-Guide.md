# Walkthrough Guide — Qualified Investor

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform | Walkthrough Guide v1.0*
*Prepared for pilot review | September 2026*

## Executive Snapshot

| Question | Answer |
| --- | --- |
| Who is this document for? | Anyone testing the platform as a **Qualified Investor** — a verified investor with full commercial access. |
| What does this persona represent? | The concept note's Qualified Investor. It is the tier an account reaches after ZIDA approves its application. |
| Where do I start? | `https://zidaproject.com/auth/sign-in` |
| What will I be able to do? | See financial indicators, open gated documents, propose projects, raise formal engagements, co-draft memoranda, message government, and delegate to colleagues. |
| What will I not be able to do? | Publish anything, review or approve another party's work, or see another investor's engagements. |
| How long does this take? | About 45 minutes to work through every process. |
| What do I do if something is wrong or missing? | Record it in section 8. Every entry becomes a tracked enhancement request. |

## Contents

1. Who This Persona Is
2. Signing In
3. Your Dashboard
4. What You Can Do
5. What You Cannot Do, and Why
6. Step-by-Step Processes
7. How Your Work Reaches Government
8. Your Feedback
9. Validation Note

---

## 1. Who This Persona Is

The Qualified Investor is a verified investor, fund, or corporate partner whose identity and standing have been confirmed by ZIDA. This is the tier at which the platform stops being a catalogue and becomes a transaction environment.

The distinction from the registered tier is not cosmetic. A qualified account can see what a project is actually worth, can put a formal proposition in front of government, and can carry that proposition through to a signed memorandum — all inside the platform, with every step recorded.

> **Concept note lineage**
> Section 10 of Concept Note v0.3 defines this persona as: *"Access financial data, download documents, submit proposals, engage with ZIDA officials."* All four are live. The platform implements it as the `qualified` role.

Qualification is granted, not claimed. Section 6 of the Registered Investor guide covers the application; this guide begins from the point where it has been approved.

## 2. Signing In

Go to `https://zidaproject.com/auth/sign-in` and enter your credentials. You will arrive at `https://zidaproject.com/deal-room`.

The console is the same one you used as a registered investor, with five additional sections and considerably more visible on each project.

> **The non-disclosure gate**
> Before the platform releases gated documents to you, you must accept a non-disclosure undertaking — the Sovereign Confidentiality Framework. This applies to every non-ZIDA role, not only investors. It appears once, on first sign-in, and your acceptance is recorded with a timestamp, the agreement version and the title you attest under; it then appears in your Document Vault as a certificate. The walkthrough accounts have this pre-accepted so that every reviewer sees the same console rather than only the first person through it; on a real account it is the first thing you will see.

## 3. Your Dashboard

![The Qualified Investor overview. The engagement funnel replaces the onboarding checklist.](docs/screenshots/qualified/overview.png)

Your navigation contains twelve sections:

| Section | Address | What it is for |
| --- | --- | --- |
| Overview | `/deal-room` | Engagement funnel, activity and portfolio position |
| Pipeline | `/deal-room/pipeline` | The national registry, now with financial indicators |
| Saved Projects | `/deal-room/saved` | Your shortlist |
| My Proposals | `/deal-room/proposals` | Projects you have proposed, and where they sit in review |
| Engagements | `/deal-room/engagements` | Your formal approaches to government |
| MOU Registry | `/deal-room/mou` | Memoranda arising from approved engagements |
| Document Vault | `/deal-room/vault` | Your NDA certificate, accreditation records and MOU snapshots |
| Team | `/deal-room/teams` | Colleagues acting on your organisation's behalf |
| Communication Hub | `/deal-room/communication` | Message threads with ZIDA and ministries |
| My Activity Report | `/deal-room/reports` | Your activity record |
| My Profile | `/deal-room/profile` | Organisation and verification details |
| Account | `/deal-room/settings` | Security settings |

### Pipeline

![The Pipeline at the qualified tier. Financial indicators are now present.](docs/screenshots/qualified/pipeline.png)

The registry itself has not changed — what has changed is what each project discloses. Capital requirements, projected returns and payback periods are now visible, and gated documents are downloadable.

### My Proposals

![My Proposals. Projects you originate and their position in the national review workflow.](docs/screenshots/qualified/proposals.png)

A qualified investor can originate a project rather than only respond to one. Proposals you create are private to you and ZIDA until published — no other investor can see them at any point in review.

### Engagements

![Engagements. Each is a formal, recorded approach to government on a specific project.](docs/screenshots/qualified/engagements.png)

An engagement is the formal instrument by which you approach government about a project. It is not a message or an expression of interest — it is a tracked case with a status, an owner on the government side, and an audit trail.

### MOU Registry

![The MOU Registry. Memoranda become available once an engagement is approved.](docs/screenshots/qualified/mou.png)

### Document Vault

![The Document Vault, now holding your non-disclosure certificate and memorandum snapshots.](docs/screenshots/qualified/vault.png)

### Team

![Team. Colleagues you invite act on your organisation's behalf.](docs/screenshots/qualified/teams.png)

### Communication Hub

![The Communication Hub. Threads are attached to engagements and projects, not free-floating.](docs/screenshots/qualified/communication.png)

### Saved Projects, Activity Report, Profile and Account

![Saved Projects.](docs/screenshots/qualified/saved.png)

![My Activity Report.](docs/screenshots/qualified/reports.png)

![My Profile.](docs/screenshots/qualified/profile.png)

![Account settings.](docs/screenshots/qualified/settings.png)

## 4. What You Can Do

| Capability | Where | Notes |
| --- | --- | --- |
| See capital requirements, projected returns and payback periods | Pipeline, any project | Withheld below this tier |
| Download gated documents | Any project, Document Vault | Requires non-disclosure acceptance; downloads are logged |
| Propose a new project | My Proposals | Enters the national review workflow |
| Edit your proposal before submission | My Proposals | While in draft or changes-requested |
| Submit a proposal for review | My Proposals | Locks it and hands it to government |
| Raise an engagement on any published project | Engagements | Requires a certification step on submission |
| Withdraw an engagement back to draft | Engagements | Available while submitted, under review, or rejected |
| Request a correction on an engagement | Engagements | The route for changes after submission |
| Co-draft memorandum content | MOU Registry | While the memorandum is in drafting |
| Approve a memorandum on the investor side | MOU Registry | One half of a two-sided approval gate |
| Request changes to a memorandum | MOU Registry | Returns it to drafting |
| Exchange messages with government | Communication Hub | Threaded against engagements and projects |
| Invite colleagues to your organisation | Team | They join at qualified tier under your organisation |
| Request an amendment after submission lock | My Proposals | Decided by ZIDA |

## 5. What You Cannot Do, and Why

| Not available | Why | Who holds it |
| --- | --- | --- |
| Publish a project | Publication is a sovereign act; an investor cannot place a project on the national registry | ZIDA Admin, Platform Manager |
| Approve or reject your own proposal | The proposer and the reviewer must be different parties | Government Reviewer, Ministry Official, ZIDA Admin |
| Move your engagement past submitted | Government controls the progress of its own review | Government Reviewer, ZIDA Admin |
| Edit a proposal after submission | The submitted record is what reviewers are assessing; changing it underneath them would break the audit trail | You, via an amendment request |
| Finalize a memorandum or record its execution | Execution is a government act with legal consequence | ZIDA Admin, Platform Manager |
| See other investors' engagements, proposals or memoranda | Commercial confidentiality between competing parties | — |
| See another investor's unpublished proposal | Same | — |
| Change any account's role, including your own | Entitlements are granted by government, never self-assigned | ZIDA Admin, Platform Manager |
| Edit sectors, ministries or strategic pillars | The classification scheme is national infrastructure | Platform Manager |

> **The principle behind these boundaries**
> An investor can originate, propose, negotiate and commit. Government validates, approves and publishes. The platform never lets one party do both halves of a two-party act — which is why you approve your side of a memorandum but cannot finalize it, and submit a proposal but cannot publish it.

## 6. Step-by-Step Processes

### Process A — Assess a project with full commercial detail

1. Open **Pipeline** at `https://zidaproject.com/deal-room/pipeline`.
2. Filter to your sectors and provinces.
3. Open a project.
4. Review the financial indicators — capital requirement, projected return, payback period.
5. Open the documents section and download the feasibility material. If you have not yet accepted the non-disclosure undertaking, you will be asked to do so first.
6. Save the project if it warrants a closer look.

> **What to check**
> Are the financial fields the ones your investment committee needs? If a standard metric is missing, this is exactly the kind of enhancement worth recording in section 8.

### Process B — Propose a project

Use this when you want to bring an opportunity to Zimbabwe rather than select one from the registry.

1. Open **My Proposals** at `https://zidaproject.com/deal-room/proposals`.
2. Create a new proposal.
3. Complete the project detail: description, sector, province, beneficiary ministry, capital requirement, and strategic alignment.
4. Upload supporting documents while the proposal is still in draft.
5. Save. The proposal stays in **draft** and remains private to you and ZIDA.
6. When ready, **submit for review**.

What happens then:

| Stage | Who acts | What it means |
| --- | --- | --- |
| Draft | You | Yours to edit freely; visible only to you and ZIDA |
| Submitted for review | You submit | Locked; awaiting government |
| Under review | Government Reviewer or Ministry Official | Being assessed |
| Changes requested | Reviewer | Returned to you with notes; editable again |
| Approved | Reviewer | Cleared, awaiting publication |
| Published | ZIDA Admin or Platform Manager | Live on the national registry |

Note the last row: approval and publication are separate acts held by different people. A reviewer can approve your proposal but cannot publish it.

### Process C — Request an amendment to a locked proposal

1. Open the proposal in **My Proposals**.
2. Select **Request amendment** and state what needs to change and why.
3. ZIDA decides. If granted, the proposal reopens for editing.

This exists because a submitted proposal is evidence in a review that is already underway. Changing it silently would leave reviewers assessing something that no longer exists.

### Process D — Raise an engagement

1. Open a published project.
2. Select **Raise engagement**, or start from **Engagements** at `https://zidaproject.com/deal-room/engagements`.
3. Complete the engagement detail: your intent, the structure you envisage, indicative capital, and your timeline.
4. Save as **draft**. Drafts are yours to revise.
5. When ready, **submit**. You will be asked to certify the accuracy of what you have declared before submission completes.

The engagement then moves through government hands:

| Status | Who moves it | Meaning |
| --- | --- | --- |
| Draft | You | Being prepared |
| Submitted | You | With government |
| Under review | Government Reviewer or ZIDA Admin | Being assessed |
| Approved | Government Reviewer or ZIDA Admin | Cleared — unlocks the memorandum |
| Rejected | Government Reviewer or ZIDA Admin | Not proceeding |

You retain two controls after submission: you can **withdraw** the engagement back to draft, and you can **request a correction** if something needs fixing. What you cannot do is advance it — that is government's decision.

### Process E — Co-draft and approve a memorandum

A memorandum becomes available only once its engagement is **approved**.

1. Open **MOU Registry** at `https://zidaproject.com/deal-room/mou`.
2. Open the memorandum for your approved engagement. It starts in **drafting**.
3. Edit your side of the content — parties, purpose, scope, indicative capital, key terms — while it remains in drafting.
4. Use the comment thread for points of negotiation rather than editing contested text back and forth.
5. ZIDA submits it for review when both sides are ready.
6. In **in review**, record your approval.
7. If something is wrong, **request changes** instead. That returns it to drafting and clears both approvals.

The memorandum's full path:

| Status | Who acts | Meaning |
| --- | --- | --- |
| Drafting | You and ZIDA | Content being written |
| In review | ZIDA submits | Both parties must approve |
| Both approved | You and ZIDA each approve | Dual gate satisfied |
| Finalized | ZIDA Admin | Content locked |
| Ready for signature | ZIDA Admin | Circulated for execution |
| Executed | ZIDA Admin | Signed; recorded with signatory detail |

Both approvals are required, and either party can send it back. Once it is finalized, only ZIDA can reopen it.

### Process F — Communicate with government

1. Open **Communication Hub** at `https://zidaproject.com/deal-room/communication`.
2. Select the thread attached to your engagement or project.
3. Post your message. Attachments are permitted.

Threads are anchored to a project or engagement rather than being free-standing correspondence, so a conversation stays attached to the thing it is about and survives changes of personnel on either side.

### Process G — Bring a colleague onto your team

1. Open **Team** at `https://zidaproject.com/deal-room/teams`.
2. Invite your colleague by email address.
3. ZIDA approves the invitation.
4. On acceptance they join at qualified tier, acting on your organisation's behalf, and can work on your proposals and engagements.

> **Why ZIDA approves team invitations**
> Team membership grants qualified-tier commercial access to a new person. Letting an organisation mint qualified accounts unilaterally would route around the verification the tier exists to enforce.

## 7. How Your Work Reaches Government

It is worth understanding who sees what you submit, because it explains the pace of response.

A **proposal** is assessed by a Government Reviewer or by the Ministry Official of the beneficiary ministry, and published by a ZIDA Admin. An **engagement** is handled by Government Reviewers and ZIDA Admins. A **memorandum** is negotiated with ZIDA directly, with the relevant ministry able to see it.

Ministry Officials see only their own ministry's projects. If your proposal names the wrong beneficiary ministry, it will reach the wrong desk — which is why that field matters more than its position on the form suggests.

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
