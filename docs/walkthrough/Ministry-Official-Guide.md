# Walkthrough Guide — Ministry Official

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform | Walkthrough Guide v1.0*
*Prepared for pilot review | September 2026*

## Executive Snapshot

| Question | Answer |
| --- | --- |
| Who is this document for? | Anyone testing the platform as a **Ministry Official** — the ministry desk that owns and validates its own portfolio. |
| What does this persona represent? | The concept note's Ministry Focal Point. The platform implements it as the `ministry_admin` role. |
| Where do I start? | `https://zidaproject.com/auth/sign-in` |
| What will I be able to do? | Create and validate your ministry's projects, assign reviewing officers, see engagements and memoranda on your portfolio, and create government staff accounts for your ministry. |
| What will I not be able to do? | See or act on another ministry's portfolio, publish projects, decide engagements, or move a project to another ministry. |
| How long does this take? | About 40 minutes to work through every process. |
| What do I do if something is wrong or missing? | Record it in section 8. Every entry becomes a tracked enhancement request. |

## Contents

1. Who This Persona Is
2. Signing In
3. Your Console
4. How Ministry Scoping Works
5. What You Can Do
6. What You Cannot Do, and Why
7. Step-by-Step Processes
8. Your Feedback
9. Validation Note

---

## 1. Who This Persona Is

The Ministry Official is the ministry's desk on the platform. Where a Government Reviewer sees the national picture, a Ministry Official sees their own portfolio in depth and is accountable for it.

This is the persona closest to where investment projects actually originate. A ministry knows which of its projects are real, which are aspirational, and which have the feasibility work behind them to survive investor scrutiny. The platform puts that judgement at the ministry desk rather than asking a central team to make it on the ministry's behalf.

> **Concept note lineage**
> Section 10 of Concept Note v0.3 defines this persona as: *"Submit and update projects from their ministry, track investor interest."* Both are live, and the role additionally carries review authority over its own portfolio and can create government staff accounts for the ministry.

## 2. Signing In

Go to `https://zidaproject.com/auth/sign-in` and enter your credentials. You will arrive at `https://zidaproject.com/ministry` — the **Ministry Desk**.

This is a different console from the one investors and national reviewers use. Everything in it is filtered to your ministry, without your having to apply a filter.

Before documents are released to you, the platform asks you to accept a confidentiality undertaking — the Sovereign Confidentiality Framework. It appears once, on first sign-in, and records the date, version and the title you attest under. The walkthrough accounts have this pre-accepted so that every reviewer sees the same console; on a real account it is the first thing you will see.

> **What to check**
> Your account is identified by the email address you sign in with, and that address is what the audit trail records against every project you approve. Is the address you were given the one your ministry would want on that record? More broadly, should a ministry account be **required** to use an official government address rather than any working mailbox? Section 9 of the Overview sets out what that would make possible — including deriving your ministry from your address instead of it being assigned by hand. Record your view in section 8.

## 3. Your Console

![The Ministry Desk overview. Pipeline health for your ministry only.](docs/screenshots/ministry/overview.png)

The desk opens under the ministry's own name — Ministry of Information Communication Technology, Postal and Courier Services — with a subtitle stating plainly that the national pipeline has been scoped to that designation. Four figures follow: nine projects in total, one under review, none currently sitting at approved, and eight published. Beneath them, four cards route into Ministry Pipeline, MOU Registry, Engagements and Users & Roles, each carrying a line that says what the section is for.

The column on the right is the part a permanent secretary would want. Recent Activity names the actor and the exact transition — under review to approved, and approved back to under review on the same project — alongside messages created and an investor engagement logged and then certified and published, and several of those entries are ZIDA acts on this ministry's projects. So a ministry sees what central government has done to its portfolio, not only what its own officers did. That is the difference between being informed after the fact and holding the record.

Your navigation contains twelve sections:

| Section | Address | What it is for |
| --- | --- | --- |
| Overview | `/ministry` | Your ministry's pipeline health and recent activity |
| Ministry Pipeline | `/ministry/projects` | Projects where your ministry is a beneficiary |
| Review Queue | `/ministry/review` | Submissions awaiting your validation |
| Engagements | `/ministry/engagements` | Investor engagements on your projects |
| MOU Registry | `/ministry/mou` | Memoranda involving your projects |
| Inquiries | `/ministry/inquiries` | Enquiries relating to your ministry |
| Communication Hub | `/ministry/communication` | Threads on your projects |
| Users & Roles | `/ministry/users` | Government staff accounts in your ministry |
| Team | `/ministry/teams` | Ministry team roster and invitations |
| Reports | `/ministry/reports` | Ministry-scoped reporting |
| My Profile | `/ministry/profile` | Your profile and ministry assignment |
| Account | `/ministry/account` | Security settings |

### Ministry Pipeline

![The Ministry Pipeline. Your ministry's projects are filtered in by default; the national pipeline stays readable for context, but authority to act does not extend to it.](docs/screenshots/ministry/projects.png)

A *My Ministry Only* chip is lit and reads nine, against an *All* count of thirty-seven. The instruction above the table sets out the arrangement: your ministry's projects show by default, the chip can be switched off to browse the national pipeline for context, and either way you can only create, edit and advance projects where your ministry is the primary beneficiary. Status chips break the set down from draft to archived, and the table carries title, sector, status, capital and last update.

What the capital column shows is why this view is worth an investor's time: not a single headline number but the actual shape of each requirement, so Sunway City Special Economic Zone records US$195 million seeking US$50 million equity and US$145 million debt, and Solgas Energy sets out three phases against USD 95 million. An *Investor Proposals* chip sits at the end of the status row to separate investor-originated submissions from ministry-originated projects in the same table, and here it reads nil. The ministry reads its own nine in the national thirty-seven and can act on neither more nor fewer than the ones it is accountable for.

### Review Queue

![The Review Queue: submissions awaiting your validation, plus pending amendment requests.](docs/screenshots/ministry/review.png)

Two tabs divide the work — *New Submissions* and *Pending Requests*, each holding one — and the line beneath the heading states the escalation rule before you touch anything: approve sends the request on to ZIDA Admin, decline closes it. The single card below, Powertel Fibre Internet (GPON), is already under review and so carries three controls: request changes, approve, reject. It names the owning ministry beneath the title and exposes full project detail and an action history.

Look at the reviewer notes field on the card, labelled as required in order to request changes or reject. An adverse decision cannot be issued without a reason entered against it, which means the originating officer receives grounds rather than a verdict, and the file retains why. Note too that the action history is offered on the card itself rather than in a separate log. The officer deciding today can read what was decided before it reached them, in the same place they enter their own decision.

### Engagements and MOU Registry

![Engagements on your ministry's projects. Read-only.](docs/screenshots/ministry/engagements.png)

Three investor engagements are tracked here, and the subtitle is explicit that creation and status changes stay with the investor and the ZIDA deal team. The stage chips run from draft through submitted and under compliance review to approved or rejected, with one currently submitted and two approved. The table gives investor, project, status, ticket size and last update: Lindiwe Ncube of Highveld Capital Partners submitted against TelOne Fibre to the Home, and Grace Mutindi of Zambezi Growth Partners approved on the Kumusha Power Project at US$5–25 million and on that same fibre project at US$25–100 million.

Two separate approaches to the same fibre project is precisely the demand signal a ministry needs and rarely receives — evidence that a particular asset is drawing repeat interest, visible at the desk that owns it, on the day it happens rather than in a quarterly return. Ticket size travels with the record wherever the investor has stated one, so the ministry can size the interest as well as count it. The read-only posture is written on the page rather than implied by an absent button, which tells the officer where the decision sits.

![Memoranda involving your ministry's projects. Read-only, with comments.](docs/screenshots/ministry/mou.png)

The registry groups memoranda tied to your ministry's projects by their drafting, approval and signature stage, and the chips spell that sequence out in full: no memorandum yet, drafting, in review, both parties approved, finalised, ready for signature, executed. Of the three engagements listed, one is recorded as having no memorandum yet, one — Kumusha Power Project with Zambezi Growth Partners — is in drafting, and one — TelOne Fibre to the Home with the same investor — is approved by both parties. Alongside investor and project, each row carries the engagement status, the memorandum stage and the ticket size, and the whole set exports to CSV.

Naming the seven stages on the face of the page turns a document lifecycle into something a ministry can supervise: the officer can tell at a glance that nothing is stalled awaiting signature and that only one instrument is still in drafting. Recording *No MOU Yet* as a state, rather than leaving the field blank, distinguishes an engagement not yet at that point from data that is simply missing. The CSV export means the ministry can brief from its own extract.

### Inquiries

![Enquiries relating to your ministry.](docs/screenshots/ministry/inquiries.png)

This queue is empty in the demonstration account, and the panel says so — *No inquiries match this filter* — with every counter at nil across pending, changes requested, approved and declined. The heading text carries the more important information: the ministry has read-only visibility of strategic enquiries, and the approve, request-information and decline decisions stay with the ZIDA deal team because approving an enquiry automatically upgrades the applicant to Qualified Investor. A *My Ministry Only* chip, a search field and a CSV export sit above the board.

The page explains the authority it withholds, and gives the reason in one sentence. That matters more than it appears to: a boundary an officer understands is one they will work within, whereas a button that has simply been removed invites a telephone call and a workaround. Accreditation determines what an investor may see across the entire platform, so it cannot be granted ministry by ministry. Zimbabwe issues that status once, centrally, on a single standard.

### Users & Roles and Team

![Users & Roles. Government staff accounts belonging to your ministry.](docs/screenshots/ministry/users.png)

The subtitle narrows this directory precisely: staff accounts you have created for your ministry desk, under the Ministry of Information Communication Technology, Postal and Courier Services. One account is listed — Blessing Chirwa, account reference ZIDA-000111, on a ministry address, role *Government*, status active, created 5 September 2026. Filters run across all, active, suspended, pending and deactivated, search covers name, email and account identifier, and a *Create user* control sits at the top right.

Every account carries an issued reference and a creation date, so a question about who was given access to a ministry's portfolio, and when, has a documented answer rather than a recollection. The role column reading *Government* confirms the distinction drawn later in this guide: accounts made here are reviewing officers attached to this ministry, not peers at the desk's own level. A ministry can therefore staff itself at the pace its work requires, without a central request queue standing between an officer and their team.

![Team. Ministry roster and invitations.](docs/screenshots/ministry/teams.png)

Three counters head the page — active, pending ZIDA review, and total invited — each at zero here, and the roster below reports that no team members have been invited yet. The invitation panel takes a full name, an email address, an optional telephone number, and optional office address and reason fields that apply to the whole batch; *Add another* extends the list before a single *Send invite*. The instruction above states the governing rule: every invitation is reviewed by ZIDA before it goes live, described on the page as a four-eyes control.

That control is the substance of this page. A ministry may nominate colleagues at its own level, but it cannot enlarge its own authority, because each name passes a ZIDA validation step independently even when submitted in a batch. Giving the ministry its own *Pending ZIDA review* counter makes the gate visible from the requesting side rather than leaving invitations to disappear into a central process. The reason field captures the justification at the moment of the request, when it is still accurate.

### Communication Hub, Reports, Profile and Account

![The Communication Hub.](docs/screenshots/ministry/communication.png)

One thread sits in the left-hand list — a general question on the TelOne Data Centres Project — filtered by all, general, active deals and engagements. The open thread shows an amendment request from Blessing Chirwa, one of this ministry's own reviewing officers, proposing changes to the capital requirement and the direct jobs figure, rendered as a card marked awaiting ministry admin, setting out each proposed value and naming this ministry as the requesting one. The card carries the first-stage decision itself: *Approve & Escalate to ZIDA*, or *Decline*. Composer selectors set visibility and audience.

The thread is doing two things at once: carrying the correspondence and carrying the decision, with the requesting officer named. A ministry that decides the first stage in the same place the justification was written never has to reconstruct it, which is what allows it to answer an investor's follow-up question without opening a second file. The audience selector requires a deliberate choice about who can read a message before it is sent, and the response-time commitment shown to the investor is stated rather than assumed. Threads export to CSV and PDF.

![Ministry-scoped reporting.](docs/screenshots/ministry/reports.png)

Reports opens on *My Activity Report* — a personal summary of your engagements and account activity — and it is presented as a printable document rather than a dashboard. The header carries the Republic of Zimbabwe investment platform mark, a reference number, the generating officer named as Tapiwa Zvobgo (Ministry Admin), a snapshot timestamp given to the second, and live platform data declared as the source. A *Print / Save as PDF* control sits above it. The body states name, email, organisation and role, marks the Confidentiality Framework accepted, totals two engagements against US$75 million of tracked indicative capital with one pending review and one approved, and lists those engagements against projects under the ministry's portfolio with their status, indicative ticket, start date and next step.

The framing is what to notice. Every report leaves this page as a document of record: referenced, attributed to a named officer, timed to the second, and footed with a statement that it is confidential, prepared for internal and government stakeholder use, a live snapshot at the moment of generation rather than a bounded reporting period, and no substitute for audited financial statements. A ministry can put that in front of a minister without adding caveats by hand, because the platform has already stated the limits of its own figures.

![My Profile.](docs/screenshots/ministry/profile.png)

Your profile states that it is the same view ZIDA staff see on your Institutional Compliance Dossier, with a link across to credentials and security. The identity card gives the officer's name, the ministry email address the account signs in with, and a *Ministry Admin* badge. Below it, a *Designated Ministry* panel names the Ministry of Information Communication Technology, Postal and Courier Services, and explains that the console shows only the pipeline and team tied to that ministry, with a Platform or ZIDA Admin required to change it.

One field on this page decides everything else in this guide, and it is displayed as a fact about the account rather than an editable preference. Because the designated ministry sets the whole scope of the console, keeping it beyond the officer's own reach is what prevents a ministry from widening its remit by amending its own record. The panel also names who to approach instead, so the constraint comes with a route rather than a dead end.

![Account settings.](docs/screenshots/ministry/account.png)

Account & Security divides into four tabs — profile, security, sessions and notifications — with the profile tab open. The display name is editable. The three rows beneath it are not, and each says why: the email address is tagged read-only, the entity is the Ministry of Information Communication Technology, Postal and Courier Services and tagged as managed by ZIDA, and the identity method is recorded as a local password. An *Access & Entitlements* card at the foot describes the Ministry Admin role as oversight of your designated ministry's project pipeline and ministry staff, scoped to your ministry only.

Those two small tags carry the governance. An email address that cannot be edited means the identity written into the audit trail cannot later be rewritten by the officer it records, and an entity managed by ZIDA means a ministry attachment cannot be self-amended. Printing the entitlement in the same terms the platform enforces means scope is documented rather than assumed, while the sessions and notifications tabs leave day-to-day account hygiene with the officer, where it belongs.

## 4. How Ministry Scoping Works

This section is the one to read carefully, because it explains almost everything else in this guide.

Your account carries a ministry assignment. Every project records a **primary beneficiary ministry** and may record **secondary beneficiary ministries**. Those two facts determine what you see and what you can do.

| Your ministry's relationship to a project | You can see it | You can act on it |
| --- | --- | --- |
| Primary beneficiary | Yes — shown by default | Yes — full review authority |
| Secondary beneficiary | Yes — shown by default | **No — read-only** |
| Not a beneficiary | Yes — on request, by switching off the *My Ministry Only* chip | No |

Two rows deserve comment. Being named as a **secondary beneficiary** gives you visibility of a project, so you can see what is happening in an area that affects you, but the review authority stays with the primary ministry. Only one ministry is accountable for a given project.

The **third row** is a deliberate design decision rather than an oversight. Ministry scoping in this platform governs *authority*, not *sight*. Your pipeline opens filtered to your own ministry, but the chip can be switched off to read the national pipeline, because a ministry planning its own portfolio benefits from knowing what the rest of government is bringing forward — and because a national investment pipeline that each ministry can only see a tenth of is not a national pipeline. What does not extend beyond your ministry is the ability to edit, advance, approve or publish. The platform enforces that on the server, not merely by hiding buttons: an attempt to modify another ministry's project is refused even if the request is made directly against the API.

If Zimbabwe would prefer cross-ministry visibility to be closed rather than open, that is a configuration question worth raising in section 8 — but it should be decided deliberately, not discovered.

There is one further rule: an investor's proposal that is still in **draft** is not visible to you, even when your ministry is the named beneficiary. Investors are entitled to prepare a proposal privately. It becomes visible to you once they submit it.

> **What to check**
> Does the primary and secondary beneficiary model match how cross-cutting projects are actually governed in Zimbabwe? A project benefiting several ministries equally is a real case, and the platform currently requires one of them to be primary. If that is wrong, record it in section 8.

## 5. What You Can Do

| Capability | Where | Notes |
| --- | --- | --- |
| Create a project for your ministry | Ministry Pipeline | Automatically filed to your ministry |
| Edit your ministry's projects | Any project where you are primary beneficiary | Through the review stages |
| Submit a project for review | Ministry Pipeline | |
| Move a submission into review | Review Queue | |
| Request changes from the originator | Review Queue | |
| Approve a project | Review Queue | Clears it for publication by ZIDA |
| Archive a project | Review Queue | |
| Assign a reviewing officer | Any project where you are primary beneficiary | Allocates work within your ministry |
| Upload and remove project documents | Your ministry's projects | |
| Decide the ministry stage of an amendment request | Review Queue | The first of two stages — see Process E |
| File an association request to add a beneficiary ministry | Any project | ZIDA decides |
| See investor engagements on your projects | Engagements | Read-only |
| See memoranda involving your projects | MOU Registry | Read-only, with comments |
| Comment on a memorandum | MOU Registry | |
| See enquiries relating to your ministry | Inquiries | Read-only |
| Create government staff accounts for your ministry | Users & Roles | Locked to your ministry |
| Invite ministry colleagues | Team | They join as Ministry Officials |
| Message investors and colleagues | Communication Hub | Your projects only |
| Read ministry-scoped reports and audit activity | Reports, Overview | Your ministry's records only |

## 6. What You Cannot Do, and Why

| Not available | Why | Who holds it |
| --- | --- | --- |
| See another ministry's projects | Ministry portfolios are separated by design | That ministry, Government Reviewer, ZIDA Admin |
| Act on a project where you are only a secondary beneficiary | One ministry is accountable per project | The primary beneficiary ministry |
| Publish an approved project | Approval and publication are held by different parties | ZIDA Admin, Platform Manager |
| Move a project to another ministry, or change its beneficiaries | This is the very field that decides who may act on the project. Editing it would let a ministry rewrite its own scope check and transfer a project unilaterally | ZIDA Admin, Platform Manager, via an association request |
| Assign a case manager | Central workload allocation | ZIDA Admin, Platform Manager |
| Advance or decide an investor engagement | Engagement decisions are national, not ministerial | Government Reviewer, ZIDA Admin |
| Approve a memorandum | Government's approval is given centrally | Government Reviewer, ZIDA Admin |
| Decide qualified-investor applications | Accreditation is a ZIDA function | ZIDA Admin, Platform Manager |
| Change an existing account's role | You can create accounts, not re-tier them | ZIDA Admin, Platform Manager |
| Edit sectors, ministries or strategic pillars | National classification infrastructure | Platform Manager |

> **Two notes on account creation**
> Accounts you create through **Users & Roles** are Government Reviewer accounts attached to your ministry — your ministry's staff. Invitations you send through **Team** create Ministry Official peers, at your own level. These are different acts with different consequences, so it is worth testing both and confirming the distinction is what you intend.

> **One limitation to confirm**
> Once an account exists, you cannot change its role or deactivate it — there is no edit path at the ministry desk, only creation. If a member of your staff leaves, removing their access is currently a ZIDA Admin action. If ministries need to manage their own staff lifecycle, record it in section 8.

## 7. Step-by-Step Processes

### Process A — Create a project

1. Open **Ministry Pipeline** at `https://zidaproject.com/ministry/projects`.
2. Create a new project.
3. Complete the project detail: title, description, sector, province, capital requirement, readiness level, and financing type.
4. Set the strategic alignment — the national pillar and development goals the project contributes to.
5. Upload supporting documents: feasibility work, technical studies, land documentation.
6. Save as **draft**.

Your ministry is set as primary beneficiary automatically and cannot be changed. This is intentional — a ministry files its own projects, and cannot file a project into another ministry's portfolio.

### Process B — Take a project through review

The same person should not both write and validate a project, so in practice this process is shared between the originating officer and the reviewing officer.

1. From the project, **submit for review**.
2. Open **Review Queue** at `https://zidaproject.com/ministry/review`.
3. Open the submission and move it to **under review**.
4. Validate the substance: are the figures defensible, is the readiness claim accurate, is the documentation complete, is the strategic alignment right?
5. Decide:

| Decision | Effect |
| --- | --- |
| Request changes | Returns to the originator with your notes, editable again |
| Approve | Cleared for publication by ZIDA |
| Archive | Closed. There is no deletion — archived is the terminal state |

6. The project now waits for a ZIDA Admin to publish it.

> **What to check**
> Is a single ministry approval sufficient, or does your ministry require a second internal sign-off before a project leaves the desk? The platform currently has one ministry-level approval. If your governance needs two, record it in section 8.

### Process C — Assign a reviewing officer

1. Open a project where your ministry is primary beneficiary.
2. Assign the **reviewing officer** from your ministry's staff.

This allocates work within your ministry and makes accountability explicit on the record.

### Process D — Add a colleague

To add a **staff member** who will review your ministry's projects:

1. Open **Users & Roles** at `https://zidaproject.com/ministry/users`.
2. Create the account. It is created as a Government Reviewer attached to your ministry.

To add a **peer** at your own level:

1. Open **Team** at `https://zidaproject.com/ministry/teams`.
2. Invite them. They join as a Ministry Official for your ministry.

### Process E — Decide an amendment request

When a project has been submitted, it locks. Reopening it requires an amendment request, and for requests raised by your ministry's staff you are the first of two decision points.

1. Open **Review Queue**.
2. Open the pending amendment request and read the justification.
3. Decide the ministry stage.
4. If you support it, it passes to ZIDA for the second stage. Only after both stages does the project reopen.

Investors' amendment requests take a shorter path — they go directly to ZIDA — because there is no ministry in the middle of an investor's own proposal.

### Process F — File an association request

Use this when a project in the registry clearly benefits your ministry but does not name it.

1. Open the project.
2. File an **association request** naming your ministry and your justification.
3. ZIDA decides.

This is the only route by which a project's beneficiary ministries change, and it always involves a party outside the requesting ministry.

### Process G — Monitor investor interest

1. Open **Engagements** at `https://zidaproject.com/ministry/engagements` to see approaches on your projects.
2. Open **MOU Registry** at `https://zidaproject.com/ministry/mou` to see memoranda involving them. You can comment.
3. Open **Inquiries** at `https://zidaproject.com/ministry/inquiries` for enquiries relating to your ministry.

All three are read-only. You have full sight of what investors are doing with your portfolio, without holding the decision — the decisions are national.

> **What to check**
> Is read-only visibility the right posture here? A ministry might reasonably expect a say in whether an investor engagement on its own project proceeds. The platform currently gives it visibility and a voice through comments and messaging, but not a decision. Record your view in section 8.

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
