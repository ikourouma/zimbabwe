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

You will be asked to accept a non-disclosure undertaking before documents are released to you.

## 3. Your Console

![The Ministry Desk overview. Pipeline health for your ministry only.](docs/screenshots/ministry/overview.png)

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

![The Ministry Pipeline. Other ministries' projects are not present — not hidden behind a filter, but absent.](docs/screenshots/ministry/projects.png)

### Review Queue

![The Review Queue: submissions awaiting your validation, plus pending amendment requests.](docs/screenshots/ministry/review.png)

### Engagements and MOU Registry

![Engagements on your ministry's projects. Read-only.](docs/screenshots/ministry/engagements.png)

![Memoranda involving your ministry's projects. Read-only, with comments.](docs/screenshots/ministry/mou.png)

### Inquiries

![Enquiries relating to your ministry.](docs/screenshots/ministry/inquiries.png)

### Users & Roles and Team

![Users & Roles. Government staff accounts belonging to your ministry.](docs/screenshots/ministry/users.png)

![Team. Ministry roster and invitations.](docs/screenshots/ministry/teams.png)

### Communication Hub, Reports, Profile and Account

![The Communication Hub.](docs/screenshots/ministry/communication.png)

![Ministry-scoped reporting.](docs/screenshots/ministry/reports.png)

![My Profile.](docs/screenshots/ministry/profile.png)

![Account settings.](docs/screenshots/ministry/account.png)

## 4. How Ministry Scoping Works

This section is the one to read carefully, because it explains almost everything else in this guide.

Your account carries a ministry assignment. Every project records a **primary beneficiary ministry** and may record **secondary beneficiary ministries**. Those two facts determine what you see and what you can do.

| Your ministry's relationship to a project | You can see it | You can act on it |
| --- | --- | --- |
| Primary beneficiary | Yes | Yes — full review authority |
| Secondary beneficiary | Yes | **No — read-only** |
| Not a beneficiary | No | No |

The middle row is the one that surprises people. Being named as a secondary beneficiary gives you visibility of a project, so you can see what is happening in an area that affects you, but the review authority stays with the primary ministry. Only one ministry is accountable for a given project.

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
