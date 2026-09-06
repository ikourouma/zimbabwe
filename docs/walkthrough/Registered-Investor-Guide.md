# Walkthrough Guide — Registered Investor

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform | Walkthrough Guide v1.0*
*Prepared for pilot review | September 2026*

## Executive Snapshot

| Question | Answer |
| --- | --- |
| Who is this document for? | Anyone testing the platform as a **Registered Investor** — an investor who has created an account but has not yet been verified. |
| What does this persona represent? | The concept note's Registered Investor. It is the entry tier for every self-registered account. |
| Where do I start? | `https://zidaproject.com/auth/sign-in` |
| What will I be able to do? | Browse the full project registry, save projects, complete a company profile, and apply for qualified-investor status. |
| What will I not be able to do? | See financial indicators, raise engagements, exchange messages, or open gated documents. Those unlock on qualification. |
| How long does this take? | About 25 minutes to work through every process. |
| What do I do if something is wrong or missing? | Record it in section 8. Every entry becomes a tracked enhancement request. |

## Contents

1. Who This Persona Is
2. Signing In
3. Your Dashboard
4. What You Can Do
5. What You Cannot Do, and Why
6. Step-by-Step Processes
7. What Happens Next
8. Your Feedback
9. Validation Note

---

## 1. Who This Persona Is

The Registered Investor is an investor, fund, or corporate partner who has created an account on the platform but whose credentials have not yet been verified by the investment authority.

This tier exists to solve a specific problem. An investment authority cannot publish capital estimates, projected returns, and feasibility documents to anonymous visitors, but it also cannot demand full corporate disclosure from someone who is still deciding whether Zimbabwe is of interest. Registration is the middle step: enough of an account to work seriously with the registry, without access to commercially sensitive material.

> **Concept note lineage**
> Section 10 of Concept Note v0.3 defines this persona as: *"View expanded project details, save projects, submit investment interest, and request meetings."* The platform implements it as the `registered` role. The first three are live. Requesting meetings is part of the engagement workflow, which is deliberately reserved for the qualified tier — see section 5.

## 2. Signing In

Go to `https://zidaproject.com/auth/sign-in` and enter the credentials issued to you.

![The sign-in page. Every persona begins here; where you land afterwards depends on your role.](docs/screenshots/public/sign-in.png)

One page carries every persona into the platform. On the left, the Republic of Zimbabwe mark sits above a Secure Access Gateway label and a short statement of what a sign-in resolves: role-based entitlements across registered, qualified, government and admin tiers, the governed Deal Room for approved investors and ministries, and the institutional consoles for ZIDA review and taxonomy control. The right-hand form asks only for an email address and a password, with Create an account beneath it.

The significance lies in what the page does not do. There is no separate portal for investors and another for government, and no unlisted address that confers privileges on whoever finds it. Entitlement is resolved at the point of authentication, and everything that follows — what an investor may read, what an officer may approve — descends from the account that signed in. That single point of resolution is where any audit of the registry would begin.

You will arrive at `https://zidaproject.com/deal-room`, the Investor Dashboard.

This is worth pausing on, because it is easy to misread. The Investor Dashboard is **tiered, not qualified-only**. A registered investor gets a genuine workspace immediately, with a reduced set of sections. You are not being held in a waiting area — you are in the same console a qualified investor uses, with fewer doors open.

If you do not yet have an account, `https://zidaproject.com/auth/sign-up` creates one, and every self-registered account starts at this tier.

> **The confidentiality undertaking**
> On a newly created account, the first thing you see is the Sovereign Confidentiality Framework — a one-time acceptance recording the date, the agreement version and the title you attest under. It gates the Investor Dashboard for every non-ZIDA role. The walkthrough accounts have it pre-accepted so that every reviewer sees the same console rather than only the first person through it; if you sign up a fresh account instead, you will meet it immediately.

## 3. Your Dashboard

The Overview is your landing page. It tells you where you stand and what to do next.

![The Registered Investor overview, showing the onboarding checklist and the route to qualification.](docs/screenshots/registered/overview.png)

The landing page is organised around a single question: what stands between this account and accreditation. Getting Started lists two open items — complete your profile, and complete your investment profile — each with its own link. The panel beneath names the details qualification requires: organisation, phone, HQ address, business registration identifier and corporate website. Alongside, Platform Snapshot reports 26 published projects, $2.21 billion in capital and four investors, while My Analytics still reads zero across saved projects, engagements and documents.

Two things are being done at once, and both are deliberate. The registry's scale is shown before verification, so an investor can judge whether the pipeline justifies disclosing corporate details; and the requirements for accreditation are stated in full on the first screen, so nothing is discovered halfway through a form. The zeros in My Analytics are not an empty product — they are this account's own record, kept from the moment it was created.

Three things are worth noticing. The **Getting Started** checklist tracks the two steps between you and qualified status. The **Become a Qualified Investor** panel states exactly which company details are required, so nothing is discovered halfway through a form. The **Platform Snapshot** and **My Analytics** panels show the registry's scale alongside your own activity.

Your navigation contains seven sections:

| Section | Address | What it is for |
| --- | --- | --- |
| Overview | `/deal-room` | Your status, next steps, and recent activity |
| Pipeline | `/deal-room/pipeline` | The full national project registry, with filtering |
| Saved Projects | `/deal-room/saved` | Projects you have bookmarked |
| Document Vault | `/deal-room/vault` | Your own documents and access records |
| My Activity Report | `/deal-room/reports` | A record of what you have viewed and saved |
| My Profile | `/deal-room/profile` | Your company and representative details |
| Account | `/deal-room/settings` | Security and account settings |

### Pipeline

The Pipeline is the working view of the national registry. You can filter by sector, strategic pillar, province, beneficiary ministry, readiness level and financing type, and switch between board, list, table and matrix layouts.

![The Pipeline. The same registry a qualified investor sees, with financial columns withheld.](docs/screenshots/registered/pipeline.png)

The Pipeline opens in Kanban layout, with List, Table and Matrix beside it, a search field that accepts a title, a location or a project owner, and a Filters control holding the screening dimensions. Six stage columns run from Draft through Submitted for Review, Under Review, Changes Requested and Approved to Published. The first five read zero; Published holds all 26 records. The cards name real opportunities — Goromonzi Agro Processing, Mossfield Crop Production, CICADA Macadamia, Misty Mountains Coffee Production, TelOne Fibre to the Home — each tagged with its sector and a Published status.

That column structure is the governance record made visible. Publication is the final stage of a review sequence rather than a listing decision, so every project an investor can reach has already passed ministry submission and reviewer assessment; the earlier columns stand empty because nothing unapproved is exposed to this tier. The stage vocabulary is the same one government staff work in, which means an investor and a ZIDA officer discussing a project are describing the same record at the same stage rather than approximating each other.

### Saved Projects

Anything you bookmark from the Pipeline collects here, so a shortlist survives between sessions.

![Saved Projects — your working shortlist.](docs/screenshots/registered/saved.png)

Saved Projects appears here in its empty state, which is what a new account meets. A bookmark mark sits above the line "No saved projects yet", followed by an instruction to browse the pipeline and select Save on any project, and a single Browse Pipeline button to get there. The heading describes the section as a personal watchlist, and the subtitle notes that a project can be saved either from its detail page or from its card.

An empty screen is worth showing rather than staging. It demonstrates that this walkthrough runs on a live account whose history begins when the reviewer's does, not on pre-populated illustration. In use, the watchlist is where an institution's screening work accumulates: a shortlist assembled across several visits stays intact and private to the account that built it, which is the point at which browsing a registry becomes a repeatable internal process.

### Document Vault

The vault holds documents that belong to you rather than to a project: your non-disclosure acceptance record, your business registration upload, and a log of documents you have downloaded.

![The Document Vault. At this tier it holds your own records rather than project material.](docs/screenshots/registered/vault.png)

Four cards make up the vault, and at this tier three of them are still waiting. The NDA certificate card carries the confidentiality acceptance to the second — 5 September 2026 at 10:36:21 pm, against agreement version 1.0. Company & accreditation shows business registration as not uploaded and offers two upload actions, one for a commitment letter and one for a guarantee letter. MOU snapshots and Recent document downloads each report that no records exist yet.

Recording a version number alongside a timestamp is a small detail with legal weight: it establishes not merely that an undertaking was accepted, but which text was accepted. The download log will do the same work in reverse, attaching every future release of sensitive project material to a named identity at a known moment. This is what allows an investment authority to circulate feasibility work at all — the vault is the reason confidentiality can be evidenced rather than assumed.

### My Activity Report

A record of your own activity on the platform — useful when reporting internally on why a particular opportunity is worth pursuing.

![My Activity Report.](docs/screenshots/registered/reports.png)

The activity report renders as a document rather than a screen, headed Republic of Zimbabwe · Investment Platform and carrying the reference REP-20260905-7944. A provenance line states who generated it, the exact snapshot time and that the source is live platform data. Account Summary sets out name, email, organisation — Sable Ridge Ventures — and role, with the confidentiality framework marked Accepted. Engagement Summary reads zero across total, pending review and approved, and a Print / Save as PDF control sits at the top.

The footer is the part to read twice: it states that this is a live snapshot taken at the moment of generation rather than a bounded reporting period, and that it is not a substitute for audited financial statements. A platform that qualifies its own output that carefully is one whose figures can be quoted with confidence. For an investment committee, a referenced and timestamped extract of what an institution has actually done on the registry is considerably easier to submit than a screenshot.

### My Profile

Where you enter the company details that qualification depends on.

![My Profile. The five fields listed here are the ones qualification requires.](docs/screenshots/registered/profile.png)

My Profile describes itself as the account's full compliance record and, in the same line, as the view ZIDA staff see on the Institutional Compliance Dossier. The Company & Representative panel holds eight fields: company or entity name, corporate phone, authorised representative, representative title, job title, corporate website, business registration identifier and HQ address. Two are populated — Sable Ridge Ventures and Investment Manager — and the remainder carry guidance text, including a note that the address prefills a proposal's project location.

One record, read by both sides, is the discipline that matters here. The investor maintains their corporate identity once, and that same entry is what a ZIDA officer assesses when the application reaches review, so there is no parallel file to reconcile and no divergence to account for. Because these fields also prepopulate proposals and applications as read-only entries, the entity named on any submission to government is necessarily the entity the platform holds on record.

### Account

Security and sign-in settings.

![Account settings.](docs/screenshots/registered/settings.png)

Account & Security divides into four tabs — Profile, Security, Sessions and Notifications — with Profile open. Display name is editable, the email address is marked Read-only, and the entity, Sable Ridge Ventures, is labelled Managed by ZIDA. Identity is shown as a local password. Below that, an Access & Entitlements card states in plain words what this tier permits: browse the project registry, expand summaries, save a watchlist and submit strategic enquiries, with a Request elevated permissions link beneath.

Two labels do a great deal of work on this page. Marking the entity as managed by ZIDA means an account cannot quietly reassign itself to a different organisation, which is what makes the identity attached to a submission dependable. Stating the tier's entitlements in the account holder's own settings means the access boundary is declared rather than discovered, and the route to widening it is a request that someone at the agency has to grant on the record.

## 4. What You Can Do

| Capability | Where |
| --- | --- |
| Browse every published project | Pipeline |
| Filter by sector, pillar, province, ministry, readiness and financing type | Pipeline |
| Open a project's full non-financial detail | Pipeline, then any project |
| See strategic pillar, development goal and beneficiary ministry alignment | Any project |
| Save projects to a shortlist | Pipeline and project pages |
| Complete your company and representative profile | My Profile |
| Apply for qualified-investor status | Overview, then Start application |
| Track your application after submission | Overview |
| Review your own activity | My Activity Report |
| Manage your account security | Account |

## 5. What You Cannot Do, and Why

This section matters as much as the previous one. These are deliberate entitlement boundaries, not gaps — but if any of them is wrong for how Zimbabwe intends to operate, this is the moment to say so.

| Not available | Why | Who holds it |
| --- | --- | --- |
| Capital estimates, projected returns, payback periods | Commercially sensitive; released only to verified investors | Qualified Investor |
| Gated documents such as feasibility summaries and investor packs | Same reason, and download activity is recorded against a verified identity | Qualified Investor |
| Raising an engagement on a project | An engagement is a formal approach to government and presumes a verified counterparty | Qualified Investor |
| Messaging the investment authority in-platform | Message threads are attached to engagements | Qualified Investor |
| Proposing your own project | Investor proposals enter the national review workflow and require a verified originator | Qualified Investor |
| Inviting colleagues to a shared team | Delegated access presumes a verified organisation | Qualified Investor |
| Any review, approval or publishing action | Reserved to government and platform staff | Ministry Official, Government Reviewer, ZIDA Admin |

The pattern is consistent: **you can look, and you can prepare, but you cannot formally approach government until your identity is verified.** Sections that are unavailable are hidden from your navigation rather than shown and disabled, so what you see is what you have.

## 6. Step-by-Step Processes

### Process A — Find projects that fit your mandate

1. Open **Pipeline** from the left navigation, at `https://zidaproject.com/deal-room/pipeline`.
2. Apply a **sector** filter for the sectors you invest in.
3. Add a **province** filter if your mandate is geographically constrained.
4. Add a **readiness** filter. Concept-stage and shovel-ready projects need very different conversations, and this is the fastest way to separate them.
5. Switch layout using the view controls. The table view compares many projects at once; the board view groups them by stage.
6. Open any project to read its full description, strategic alignment, development goals and beneficiary ministry.

> **What to check**
> Are the filters that matter to your institution present? If you would normally screen on a dimension that is not offered here, record it in section 8 — filter dimensions are straightforward to add.

### Process B — Build a shortlist

1. On any project card or project page, select **Save**.
2. Open **Saved Projects** at `https://zidaproject.com/deal-room/saved`.
3. Confirm the project is listed. The shortlist persists between sessions and is private to your account.

### Process C — Complete your company profile

This is a precondition for qualification, so it comes before the application rather than during it.

1. Open **My Profile** at `https://zidaproject.com/deal-room/profile`.
2. Complete all five required fields: organisation name, telephone number, headquarters address, business registration identifier, and corporate website.
3. Upload your business registration document if you have it.
4. Save.
5. Return to **Overview**. The first checklist item should now be complete.

> **Why these five fields**
> They are the minimum an investment authority needs to identify a legal entity and confirm it exists. The platform enforces them: an account cannot be promoted to qualified status while any of them is blank, whether the promotion comes through the application workflow or directly from an administrator.

### Process D — Apply for qualified-investor status

1. From **Overview**, select **Start application** under "Complete your investment profile".
2. Work through the application. Your profile details are carried across automatically, so you are only adding your investment interest — sectors, ticket size, and the nature of your mandate.
3. Review the summary.
4. Submit.

> **What happens on submission**
> Your application is locked and enters the review queue. ZIDA staff receive an email alert and it appears in their console. You cannot submit a second application while one is pending — the platform refuses it rather than creating a duplicate.

### Process E — Track your application

1. Open **Overview**.
2. The checklist now reflects your application's status rather than inviting you to apply.

The possible outcomes are:

| Status | What it means | What you do |
| --- | --- | --- |
| Pending | With ZIDA for review | Wait. You will be emailed on a decision. |
| Changes requested | Reviewers need more information | Reopen the application, read the reviewer's note, revise and resubmit |
| Approved | You are now a Qualified Investor | Sign in again to see the additional sections |
| Declined | Not approved | The reviewer's reason is included in your notification |

Every outcome sends an email to the address on your account.

## 7. What Happens Next

On approval your role changes to Qualified Investor and your navigation gains five sections: My Proposals, Engagements, MOU Registry, Communication Hub and Team. Financial indicators become visible on project pages, and gated documents become downloadable.

You will be asked to accept a non-disclosure undertaking before that material is released. That acceptance is recorded with a timestamp and appears in your Document Vault.

The Qualified Investor walkthrough guide covers everything that follows.

## 8. Your Feedback

Please record anything that did not work, did not match your expectations, or is missing. Be specific about where you were — the page address is the most useful detail you can give us.

| # | Page or process | What you expected | What happened | Priority |
| --- | --- | --- | --- | --- |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

Enhancement requests are as valuable as defects. If a capability would change how your institution uses the platform, record it here even if nothing is broken:

| # | Capability requested | Why it matters | Who benefits |
| --- | --- | --- | --- |
| 1 | | | |
| 2 | | | |
| 3 | | | |

## 9. Validation Note

> **Important**
> Seeded demonstration records are illustrative and pending official validation. Financial indicators, project readiness claims, ministry mappings and supporting documents should be validated by ZIDA and the relevant authorities before production publication. The platform treats imported records as draft or pending validation until approved through the governance workflow.
