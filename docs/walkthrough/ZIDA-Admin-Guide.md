# Walkthrough Guide — ZIDA Admin

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform | Walkthrough Guide v1.0*
*Prepared for pilot review | September 2026*

## Executive Snapshot

| Question | Answer |
| --- | --- |
| Who is this document for? | Anyone testing the platform as a **ZIDA Admin** — the agency's operational centre. |
| What does this persona represent? | The concept note's ZIDA Administrator. The platform implements it as the `admin` role. |
| Where do I start? | `https://zidaproject.com/auth/sign-in` |
| What will I be able to do? | Publish projects to the national registry, decide qualified-investor applications, run memoranda through to execution, manage accounts, and decide amendment and association requests. |
| What will I not be able to do? | Unpublish a project, edit the national classification scheme, override the workflow, or create another administrator. |
| How long does this take? | About 50 minutes to work through every process. |
| What do I do if something is wrong or missing? | Record it in section 8. Every entry becomes a tracked enhancement request. |

## Contents

1. Who This Persona Is
2. Signing In
3. Your Console
4. What You Can Do
5. What You Cannot Do, and Why
6. Step-by-Step Processes
7. The Decisions Only You Can Make
8. Your Feedback
9. Validation Note

---

## 1. Who This Persona Is

The ZIDA Admin is the agency's operational centre. Almost every workflow on the platform passes through this role at least once, and several conclude here.

Three things sit exclusively with this persona and the Platform Manager above it: **publication** — placing a project on the national registry; **accreditation** — deciding who becomes a Qualified Investor; and **execution** — carrying a memorandum through to signature. Each is a point where the platform's output becomes externally visible or legally consequential.

> **Concept note lineage**
> Section 10 of Concept Note v0.3 defines this persona as: *"Full platform management, user approval, content publishing, analytics."* All four are live. Analytics in depth sits with the Platform Manager; this role has reporting and an activity feed.

## 2. Signing In

Go to `https://zidaproject.com/auth/sign-in` and enter your credentials. You will arrive at `https://zidaproject.com/admin`.

You can also switch into the Investor Dashboard at `https://zidaproject.com/deal-room` to see what investors see. This is genuinely useful before publishing — it shows you the project as an investor will encounter it.

ZIDA staff are not subject to the non-disclosure gate that applies to investor, ministry and reviewer accounts.

## 3. Your Console

![The ZIDA Admin overview: project status distribution, pending enquiries and the governance activity feed.](docs/screenshots/admin/overview.png)

Your navigation contains ten sections:

| Section | Address | What it is for |
| --- | --- | --- |
| Overview | `/admin` | Status distribution, pending enquiries, activity feed |
| Projects | `/admin/projects` | The full registry across every ministry and sector |
| Review Queue | `/admin/review` | Projects awaiting review, revision or publication |
| Inquiries | `/admin/inquiries` | Enquiries and qualified-investor applications |
| MOU Registry | `/admin/mou` | Every memorandum on the platform |
| Users & Roles | `/admin/users` | The account directory and role assignment |
| Reports | `/admin/reports` | Government executive reporting |
| Communication Hub | `/admin/communication` | Staff and stakeholder messaging |
| My Profile | `/admin/profile` | Your profile |
| Account | `/admin/account` | Security settings |

### Projects

![Projects. The full registry, unscoped by ministry.](docs/screenshots/admin/projects.png)

### Review Queue

![The Review Queue. Publication authority sits here.](docs/screenshots/admin/review.png)

This is where the approved-to-published step happens — the step no reviewer and no ministry can take.

### Inquiries

![Inquiries. General enquiries and qualified-investor applications, with a category filter to separate them.](docs/screenshots/admin/inquiries.png)

Two different things share this queue: general enquiries from the public contact form, and qualified-investor applications. The category filter separates them, and applications are the ones with entitlement consequences.

### Users & Roles

![Users & Roles. The account directory, role assignment and accreditation review.](docs/screenshots/admin/users.png)

### MOU Registry

![The MOU Registry. Drafting, finalization and execution all sit with this role.](docs/screenshots/admin/mou.png)

### Reports, Communication Hub, Profile and Account

![Government executive reporting.](docs/screenshots/admin/reports.png)

![The Communication Hub.](docs/screenshots/admin/communication.png)

![My Profile.](docs/screenshots/admin/profile.png)

![Account settings.](docs/screenshots/admin/account.png)

## 4. What You Can Do

### Projects

| Capability | Notes |
| --- | --- |
| See every project at every status | Unscoped by ministry |
| Create a project | Filed to any ministry |
| Edit project content | At any review stage |
| Move a submission into review, request changes, approve, archive | Full reviewer authority |
| **Publish an approved project** | The act that places it on the national registry |
| Assign a case manager | Including a default case manager per ministry |
| Assign a reviewing officer | |
| Upload and remove project documents | |
| Decide amendment requests | The ZIDA stage — final for investors, second stage for ministries |
| Decide association requests | The only route by which beneficiary ministries change |

### Investor accreditation

| Capability | Notes |
| --- | --- |
| See every qualified-investor application | Inquiries, filtered to the investor category |
| Approve an application | Upgrades the account to Qualified Investor |
| Decline an application | The applicant is emailed with your reason |
| Request changes | Returns it to the applicant, editable again |
| Review a user's accreditation dossier | |

### Engagements

| Capability | Notes |
| --- | --- |
| See every engagement | |
| Create an engagement on an investor's behalf | Can start at any status |
| Submit an investor's draft | Staff assistance path |
| Advance through review to approved or rejected | |
| Set the follow-through status | Post-approval tracking, not available to reviewers |
| Request a correction | |
| Act on a deletion request for an approved engagement | |

### Memoranda

| Capability | Notes |
| --- | --- |
| Draft and edit content | Alongside the investor, while in drafting |
| Submit for review | Opens the two-sided approval gate |
| Approve on the government side | |
| Request changes | Returns to drafting, clears both approvals |
| **Finalize** | Locks the content |
| **Mark ready for signature** | |
| **Record execution** | Requires signatory detail |
| Reopen a finalized memorandum | Returns it to drafting |

### Accounts

| Capability | Notes |
| --- | --- |
| See the full account directory | |
| Create accounts | Registered, Qualified, Government Reviewer, Ministry Official |
| Invite by email | Below your own tier |
| Change an account's role | Below administrator tier |
| Approve organisation team invitations | Both investor and ministry teams |

## 5. What You Cannot Do, and Why

| Not available | Why | Who holds it |
| --- | --- | --- |
| Unpublish or reverse a published project | Removing something from the national registry is a heavier act than putting it there. It is held one level up so that publication cannot be quietly undone | Platform Manager |
| Override the workflow to force a status | An escape hatch from governance belongs to the platform owner, used rarely and recorded | Platform Manager |
| Edit sectors, ministries, strategic pillars or development goals | Every project is classified against this scheme; changing it retroactively changes the meaning of records already filed | Platform Manager |
| Approve a new subsector proposed by an investor | Part of the same classification scheme | Platform Manager |
| Create or promote another administrator | An administrator cannot expand the set of administrators; that is how privilege escalation happens | Platform Manager |
| Open the dedicated Audit Log with filters and search | You see the activity feed on your Overview; the full searchable log is one level up | Platform Manager |
| Change site settings | Tenant configuration | Platform Manager |
| Delete a project | There is no deletion anywhere on the platform. Archived is the terminal state | Nobody |

> **The pattern**
> You hold everything operational. What sits above you is everything that changes the rules rather than operating within them: the classification scheme, the administrator set, the workflow itself, and the ability to reverse a publication.

> **One boundary to confirm**
> You can publish but not unpublish. If a project is published in error — wrong figures, premature disclosure — correcting it requires the Platform Manager. If ZIDA needs to be able to withdraw a publication directly, record it in section 8. It is a deliberate choice, not an oversight, but it is a choice worth confirming with the people who would live with it.

## 6. Step-by-Step Processes

### Process A — Publish a project

1. Open **Review Queue** at `https://zidaproject.com/admin/review`.
2. Filter to **approved**. These have cleared review and are waiting on you.
3. Open the project and check it as an investor will see it: are the financial indicators right, is the documentation complete, is the beneficiary ministry correct, is the strategic alignment sound?
4. Switch to `https://zidaproject.com/deal-room/pipeline` and view it as an investor would, if you want certainty before it goes live.
5. Return to the Review Queue and **publish**.

The project is now on the national registry and visible to investors.

> **What to check**
> Is a single publication decision appropriate, or should publication require two ZIDA officers? The platform currently allows one. Given publication is the point at which the registry becomes externally visible, this is worth an explicit decision — record it in section 8.

### Process B — Decide a qualified-investor application

This is the entitlement decision. Approving it grants commercial access to financial data and documents.

1. Open **Inquiries** at `https://zidaproject.com/admin/inquiries`.
2. Set the category filter to **investor** to isolate applications from general enquiries.
3. Filter status to **pending**.
4. Open an application and review the applicant: organisation, business registration identifier, headquarters, website, and their stated investment interest.
5. Cross-check in **Users & Roles** if you need the fuller accreditation dossier.
6. Decide:

| Decision | Effect | Applicant receives |
| --- | --- | --- |
| Approve | Account upgraded to Qualified Investor immediately | Approval email; new sections appear on next sign-in |
| Request changes | Application returns to the applicant, editable | Email with your note |
| Decline | Account stays at registered tier | Email with your reason |

7. All three send an email automatically. Every decision is recorded in the audit trail against your name.

> **A guard you may encounter**
> Approval will be refused if the applicant's profile is incomplete — organisation, phone, headquarters address, business registration identifier and corporate website must all be present. The same check applies if you promote someone to qualified directly from **Users & Roles**. There is no path to qualified status that skips it, deliberately: an unverifiable entity cannot be granted commercial access by an administrative shortcut.

### Process C — Carry a memorandum to execution

The memorandum exists only once its engagement is approved.

1. Open **MOU Registry** at `https://zidaproject.com/admin/mou`.
2. In **drafting**, write ZIDA's side of the content alongside the investor. Use the comment thread for negotiation.
3. **Submit for review** when both sides are ready. This opens the two-sided approval gate.
4. Record ZIDA's approval. The investor records theirs. When both are in, the memorandum reaches **both approved**.
5. **Finalize.** The content locks and a snapshot is taken.
6. **Mark ready for signature** and circulate it. The Word export carries the finalized content.
7. **Record execution**, entering the signatory names, roles, dates and the method or location of signing.

If a revision is needed at any point, **request changes** returns it to drafting and clears both approvals, so both parties re-approve the revised text rather than having an earlier approval carry over onto something they have not read. After finalization, **reopen** does the same.

### Process D — Manage accounts

1. Open **Users & Roles** at `https://zidaproject.com/admin/users`.
2. To add someone, create the account directly or send an email invitation. You can create Registered, Qualified, Government Reviewer and Ministry Official accounts.
3. To change someone's entitlement, open the account and set the role. You can assign any role below administrator tier.
4. To approve a team invitation raised by an investor organisation or a ministry, action it from the queue.

Every role change is recorded in the audit trail with the previous and new role, so entitlement history is reconstructible.

> **What to check**
> You cannot create or promote an administrator — that is Platform Manager authority. Confirm that ZIDA is content for new administrator accounts to require the platform owner, and record your view in section 8.

### Process E — Decide amendment and association requests

**Amendment requests** reopen a locked project. From **Review Queue**, read the justification and decide. Investor requests come straight to you. Ministry-raised requests reach you only after the ministry has supported them.

**Association requests** add a beneficiary ministry to a project. This is the only route by which a project's ministry mapping changes — no ministry can move a project itself. Read the justification and decide.

### Process F — Monitor the platform

1. **Overview** at `https://zidaproject.com/admin` shows status distribution, pending enquiries and the governance activity feed.
2. The notification bell surfaces new applications and status changes as they happen.
3. **Reports** at `https://zidaproject.com/admin/reports` carries executive reporting.

## 7. The Decisions Only You Can Make

Five things stop with this role and the Platform Manager. If nobody in this seat acts, nothing moves:

| Decision | Consequence if unattended |
| --- | --- |
| Publishing an approved project | Approved projects never reach investors |
| Deciding a qualified-investor application | Verified investors never gain commercial access |
| Finalizing and executing a memorandum | Negotiated agreements never conclude |
| Deciding amendment requests | Locked projects can never be corrected |
| Deciding association requests | Ministry mappings can never be corrected |

Each is a queue with a named owner. The Overview and the notification bell exist so that none of them accumulates unseen.

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
