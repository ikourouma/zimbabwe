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

This is the agency's command position, and it is designed to be read in about ten seconds. Five figures across the top give you the state of the national portfolio at a glance — how many projects exist in total, how many are live on the public registry, how many are sitting in review, how many are still unsubmitted drafts, and how many enquiries are awaiting triage. All but the total carry a status word rather than just a number, so *Needs action* and *Awaiting triage* tell you where your attention is owed before you have interpreted anything.

Underneath, the distribution chart shows the whole pipeline by stage at once, which is the view that reveals whether the portfolio is healthy or congested: a tall published bar with a thin review column means the agency is keeping pace, and the reverse means it is not. To the right, the activity feed names every officer and every act — who approved a memorandum, who upgraded an investor to qualified, who changed a role — in plain language and in sequence. Nothing here was compiled for a report. It is the platform's own record of institutional work as it happens, which is precisely why it can be trusted as a management instrument.

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

Projects opens on the Master Sovereign Project Registry, and the filter row is itself a census of the national pipeline: 37 projects, 26 published, three submitted, four in review, one with changes requested, one approved, one still in draft, one archived. The table beneath carries sector, status, declared capital and the date each record was last changed — Goromonzi Agro Processing Industrial Park at US$36.9 million, TelOne Fibre to the Home at US$50 million — and the same records can be read as a Kanban board, a list or a matrix.

Nothing on this page is scoped to a ministry, which is what makes it ZIDA's view rather than a departmental one. The counts are not a report anyone compiled; they are the records themselves, filtered, so the number published cannot drift from the number actually on the registry. For an investor asking what Zimbabwe currently has in preparation, the answer is drawn from the same table the agency works in every day, and the capital column makes the declared scale of that pipeline legible without a separate exercise.

### Review Queue

![The Review Queue. New submissions, amendment requests and ministry association requests on one surface.](docs/screenshots/admin/review.png)

Nine new submissions are waiting here, each one a card rather than a row: the project title, the beneficiary ministry, a short description, expandable links to the full project detail and its action history, a reviewer notes box and the actions open at that stage — Start review on a submission nobody has taken up, and Request changes, Approve or Reject once it is under review. Mazowe Valley Irrigation Revitalisation, filed to the Ministry of Lands, Agriculture, Fisheries, Water and Rural Resettlement, describes 4,200 hectares of gravity-fed irrigation. A second tab holds pending amendment and association requests.

The line under the heading is the important one: available actions are driven by the role's governance rules, and buttons only appear for transitions the signed-in officer is authorised to make. Authority is expressed in the interface rather than in a circulated policy, so an officer cannot take a step that is not theirs to take. The reviewer notes field means a request for change travels back to the submitter with reasoning attached, and the action history makes every prior transition reconstructible.

This is where the approved-to-published step happens — the step no reviewer and no ministry can take.

### Inquiries

![Inquiries. General enquiries and qualified-investor applications, with a tab to separate them.](docs/screenshots/admin/inquiries.png)

Seven inquiries have arrived through three channels — the contact form, investor registration and strategic partnership — and a tab at the top isolates the three that are qualified-investor applications. The board is arranged by decision state, with all seven currently in Pending and the Changes Requested, Approved and Declined columns empty. Each card gives the sender's name, corporate email and channel; Lerato Dlamini, Chen Wei and Sandile Nkomo also carry a KYC marker. The queue exports to CSV.

Keeping general correspondence and accreditation applications on one surface, but separable by a single tab, prevents the more consequential of the two from being lost in the volume of the other. An enquiry costs ZIDA a reply; an application changes what a company is entitled to see. The KYC marker signals which applicants have already attached identity material, so the officer knows before opening a card whether the evidence needed for a decision is likely to be there.

Two different things share this queue: general enquiries from the public contact form, and qualified-investor applications. The Qualified Investor Applications tab separates them, and applications are the ones with entitlement consequences.

### Users & Roles

![Users & Roles. The account directory, the role census and team invitations awaiting validation.](docs/screenshots/admin/users.png)

Users & Roles opens on four measures — 34 total accounts, 34 active, multi-factor compliance at 0% and marked not enforced, and no pending invitations. A panel below flags one team invitation awaiting validation: John Doe, invited by a qualified investor and due to become a Qualified Investor himself, with a Review link. The role filters give the whole distribution — nine registered, four qualified, seven government, ten ministry admins, two ZIDA admins, two platform admins — and each row shows an account identifier such as ZIDA-000123.

An organisation cannot enlarge its own access here. When an investor or a ministry invites a colleague, the invitation waits in that validation panel until ZIDA has seen who is inviting whom and what role would follow. The role census means the distribution of entitlement across the platform can be read in a moment rather than reconstructed, and the multi-factor tile states the current position plainly instead of leaving it unexamined — which is how a control comes to be adopted rather than assumed.

### MOU Registry

![The MOU Registry. Drafting, finalization and execution all sit with this role.](docs/screenshots/admin/mou.png)

Every memorandum on the platform is listed against its stage, and the filter row sets out the lifecycle in numbers: of ten engagements, four have no memorandum yet, and one sits at each of drafting, in review, both parties approved, finalized, ready for signature and executed. The table pairs each investor and their fund with the project, the engagement status and the memorandum stage — Nomsa Dube of Kestrel Capital Partners ready for signature on the Masuwe International Medical Center Project, Grace Mutindi of Zambezi Growth Partners drafting on Kumusha Power.

Because stage is a recorded state rather than a note in a file, the position of every negotiation is visible without asking anyone. Drafting, both-party approval, finalisation, readiness for signature and execution each leave a mark, and one memorandum already sits at executed, which means the path from engagement to signed agreement has been travelled rather than merely designed. Ticket size beside engagement status lets ZIDA see the commercial weight of what is closest to conclusion.

### Reports, Communication Hub, Profile and Account

![Government executive reporting.](docs/screenshots/admin/reports.png)

The Government Executive Report is generated on demand and stamped accordingly: named to the officer who produced it, timed to the second, referenced as REP-20260906-E1A6, marked for government use and sourced explicitly to live platform data. The command strip carries a pipeline value of $2.34B across 37 projects, investor capital coverage of 2.8%, average review turnaround of 10.9 days and a funnel conversion rate of 66.7%. Beneath sit a publication rate of 70.3% and an average project capital size of $77.99M, with a print or PDF option.

Two of the four headline indicators carry an action prompt rather than a congratulation — activate relationship desk outreach, review the ministry clearance queue — which tells you the report was built to be used internally before it was built to be shown. That is precisely what makes it usable externally. A briefing willing to name 2.8% capital coverage against $2.21B published is a briefing whose favourable figures can be believed, and it can be produced for a minister in the time it takes to print.

![The Communication Hub.](docs/screenshots/admin/communication.png)

Three threads sit in a single inbox, filtered into general correspondence, active deals and engagements. Opening the TelOne Data Centres Project thread brings the project's own particulars with it — published, USD29.97 million, Harare, Mashonaland Central and Bulawayo — alongside a link through to the record and CSV and PDF exports. Inside the conversation, an amendment request appears as a structured card naming the requesting ministry and the proposed changes — direct jobs of 340 and a capital requirement of US$62 million — marked awaiting ministry admin, with a note that the decision rests with that ministry's admin first.

The visibility selector on the composer is the detail that matters: a reply can be marked visible to the investor or kept as an internal note, so ZIDA's deliberation and its correspondence occupy one record without being mistaken for each other. Workflow events land in the same thread as the discussion around them, which means the reasoning behind an amendment request is not held in a separate system from the decision on it. A stated response expectation of one business day is published to the investor.

![My Profile.](docs/screenshots/admin/profile.png)

My Profile holds the officer's own account and, below it, the company record — described on the page as the same view ZIDA staff see on an Institutional Compliance Dossier. The identity card names Farai Chigumba as a ZIDA Admin. The Company & Representative section asks for entity name, corporate phone, authorised representative and title, job title, corporate website, business registration identifier and headquarters address; here they are complete — Zimbabwe Investment and Development Agency, ZB Life Towers on Jason Moyo Avenue in Harare, the registration identifier ZIDA-ACT-2019-10 and Farai Chigumba as Head of Investment Facilitation — and the page reports the company details up to date. A compliance and documents section follows.

These are the same fields the platform checks before it will grant qualified-investor status, which means an officer deciding an accreditation is looking at the form they complete themselves. The page states the purpose without ambiguity: this record is the company's identity of record, and it prepopulates read-only fields when a project is proposed or an application filed. One corrected entity record therefore propagates into every subsequent filing, rather than being retyped and quietly diverging between them.

![Account settings.](docs/screenshots/admin/account.png)

Account & Security divides into four tabs — profile, security, sessions and notifications. On the profile tab the display name is editable, but the email address is marked read-only and the entity, Zimbabwe Investment and Development Agency, is marked managed by ZIDA. Identity is recorded as a local password. A second card sets out the entitlements attached to the ZIDA Admin role in a single sentence: managing projects, engagements, inquiries, users and the Communication Hub across the platform.

Two small locks do real work here. An officer cannot change the email address their account is identified by, and cannot reassign themselves to a different institution, so the audit trail's attribution of an act to a person and an organisation holds over time. The sessions tab means an active session on a lost or shared device can be examined and ended rather than merely reported. Stating entitlements in plain language also removes the excuse of not knowing what a role permits.

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
| See every qualified-investor application | Inquiries, under the Qualified Investor Applications tab |
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
2. Open the **Qualified Investor Applications** tab to isolate applications from general enquiries.
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
