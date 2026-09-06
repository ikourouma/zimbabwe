# Walkthrough Guide — Platform Manager

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform | Walkthrough Guide v1.0*
*Prepared for pilot review | September 2026*

## Executive Snapshot

| Question | Answer |
| --- | --- |
| Who is this document for? | Anyone testing the platform as a **Platform Manager** — the platform owner's account, held by Afronovation during the pilot. |
| What does this persona represent? | The platform-owner tier. The platform implements it as the `super_admin` role. |
| Where do I start? | `https://zidaproject.com/auth/sign-in` |
| What will I be able to do? | Everything a ZIDA Admin can, plus unpublish, override the workflow, edit the national classification scheme, create administrators, read the full audit log, and change site settings. |
| What will I not be able to do? | Nothing is withheld. This is the highest tier, which is why section 5 is about restraint rather than restriction. |
| How long does this take? | About 55 minutes to work through every process. |
| What do I do if something is wrong or missing? | Record it in section 8. |

## Contents

1. Who This Persona Is
2. A Note on This Role's Status
3. Signing In
4. Your Console
5. What Only You Can Do
6. Step-by-Step Processes
7. Custody and Handover
8. Your Feedback
9. Validation Note

---

## 1. Who This Persona Is

The Platform Manager is the platform owner's account. It holds the capabilities that change the rules rather than operating within them.

The distinction from a ZIDA Admin is worth stating precisely. A ZIDA Admin runs the platform: publishing projects, accrediting investors, executing memoranda. A Platform Manager maintains the platform: the classification scheme every project is filed against, the set of people who hold administrative authority, the ability to reverse a publication, and an override that can bypass the governance workflow entirely.

These are separated because they are different kinds of act. Publishing a project is a decision. Changing what "published" means, or who is allowed to publish, is a change to the system in which decisions are made.

## 2. A Note on This Role's Status

> **Please read this section before proceeding**
> This role is **not described in Concept Note v0.3**. The note documents ten personas, and this is not among them. It exists because the platform needs an owner tier — someone must be able to create the first ZIDA administrator, define the sectors and ministries, and correct a mistake that the normal workflow cannot — but it was not part of what ZIDA was originally shown.
>
> It is currently held by Afronovation as the implementation partner. Two questions follow from that, and they are governance questions rather than technical ones:
>
> **Who should hold this role in production?** Afronovation, ZIDA, or both? An implementation partner holding the highest tier is normal during a pilot and unusual after handover.
>
> **What should be logged and reported?** Every action at this tier is already recorded in the audit trail. The open question is whether use of the override in particular should additionally be reported to ZIDA on a routine basis, rather than merely being discoverable.
>
> Please record your position in section 8. This is the single most important piece of feedback in this document.

## 3. Signing In

Go to `https://zidaproject.com/auth/sign-in` and enter your credentials. You will arrive at `https://zidaproject.com/super-admin`.

You can switch into the ZIDA Admin console at `https://zidaproject.com/admin` and the Investor Dashboard at `https://zidaproject.com/deal-room`, which is how you verify that a change has the effect you intended at the tier it affects.

## 4. Your Console

![Platform-wide analytics across sectors, enquiries and governance activity.](docs/screenshots/superadmin/overview.png)

Analytics opens on five counters: forty projects in total, twenty-six published and marked *Live deals*, nine in review carrying *Needs action*, two drafts *not yet submitted*, and seven pending enquiries. Beneath them, Projects by Sector ranks the portfolio from Agriculture down through ICT, Manufacturing, Energy, Infrastructure, Mining, Health and Tourism and Financial Services, while Inquiries by Status resolves to a single pending band of seven. Recent Governance Activity names Farai Chigumba approving a memorandum draft with Grace Mutindi and upgrading an investor from registered to qualified.

What matters here is what the platform owner does not get, which is a separate and more flattering set of numbers. These are the same live figures ZIDA staff work from, so the owner tier can confirm the agency's position without maintaining a parallel account of it. The difference sits in the left navigation, where Taxonomies, Site Settings, Audit Log and Publishing Override appear below the operational sections — and every act taken through them is attributed by name in the same activity feed shown here.

Your navigation contains fourteen sections. Four of them exist at no other tier.

| Section | Address | Exclusive to this tier |
| --- | --- | --- |
| Analytics | `/super-admin` | |
| Projects | `/super-admin/projects` | |
| Review Queue | `/super-admin/review` | |
| Users & Roles | `/super-admin/users` | Creating administrators |
| Inquiries | `/super-admin/inquiries` | |
| MOU Registry | `/super-admin/mou` | |
| Reports | `/super-admin/reports` | |
| **Taxonomies** | `/super-admin/taxonomies` | **Yes** |
| Communication Hub | `/super-admin/communication` | |
| **Site Settings** | `/super-admin/settings` | **Yes** |
| **Audit Log** | `/super-admin/audit` | **Yes** |
| **Publishing Override** | `/super-admin/override` | **Yes** |
| My Profile | `/super-admin/profile` | |
| Account | `/super-admin/account` | |

### Taxonomies

![Taxonomies: sectors, ministries, strategic pillars and development goals — the scheme every project is classified against.](docs/screenshots/superadmin/taxonomies.png)

Seven tabs carry the whole national scheme and its size: sectors (8), subsectors (27), ministries (12), provinces (10), strategic pillars (11), UN SDGs (17) and contact reasons (11). The sectors table is open, listing Agriculture, Health, ICT, Infrastructure, Manufacturing, Mining, Renewable Energy and Tourism and Financial Services, each with the description shown on its public sector page, a status of active, and a linked-project count — Agriculture nine projects, six of them live. The page states its own rule beneath the title: Platform Admin edits are authoritative, standard Admins see these read-only.

The linked-project column is what makes this page governable rather than merely editable. Before renaming or archiving a term, the officer can see how many national records depend on it and how many of those are publicly visible, so the consequence of a change is on screen at the moment of the change. Holding these values read-only for every other tier keeps the classification scheme a national asset rather than an operational convenience, and the export produces the scheme in a form ministries and statistical offices can reconcile against their own.

This is the platform's classification infrastructure: sectors and subsectors, ministries, strategic pillars, development goals, provinces, and the contact reasons that route public enquiries.

Every project on the platform is filed against these values. Editing one retroactively changes the meaning of records already filed, which is why the capability sits here and nowhere else.

### Audit Log

![The full audit trail: who did what, when, and on whose authority.](docs/screenshots/superadmin/audit.png)

One hundred and eighty-seven records are held here, sorted most recent first and divided into projects (113), user and security (10), site settings (14), documents (1) and messages (19). Each row gives the timestamp, the actor, the role they acted under, the action, the entity and its identifier, and a details column carrying the substance: a memorandum approved with both parties recorded, an enquiry status change noting the role upgrade to qualified, a role change from registered to qualified with the target address, and a site settings update naming the banner mode set.

The details column is the part that carries assurance weight, because it preserves the before and after rather than only the fact that something happened. Note also whose entries these are: alongside the ZIDA Admin's decisions sit the Platform Admin's own site-settings changes, logged on identical terms. The tier that can alter the rules is recorded in the same ledger as the tier that operates within them, and the export puts that ledger in an auditor's hands without needing the platform to interpret it first.

Other roles see an activity feed. This is the searchable, filterable record — every project transition, entitlement change, publication, application decision and override, attributed and timestamped.

### Publishing Override

![Publishing Override. Platform-owner authority to force a status or visibility change outside the normal workflow.](docs/screenshots/superadmin/override.png)

Two badges sit above the title — sovereign control circuit, audit immutable — and the page is built as a numbered sequence rather than a single control. Step one selects the target project and sets the forced status and visibility level. Step two is headed mandatory audit and compliance justification, and holds three required fields: an override reason code, a directive or ticket reference in the form ZIDA-DIR-2026-089, and a free-text justification note. A pre-flight impact assessment panel to the right stays inert until a project is chosen, and the register beneath reads: no overrides recorded yet.

The design deliberately makes this slow. A directive reference ties the act to an instruction issued outside the platform, so an override cannot rest on one officer's discretion alone; the justification note is what the audit trail will carry, and it is written before the button is available rather than reconstructed afterwards. The empty register is itself the more telling detail. Across the whole pilot the escape hatch has not been used once, and had it been, it would sit there permanently with the name of whoever applied it.

The override forces a project into any status and any visibility level, bypassing the workflow entirely. It exists for situations the workflow cannot resolve — a project stuck in a state nobody can move it out of, or something published that must come down immediately.

Overrides are recorded and can be reverted.

### Site Settings

![Site Settings: tenant and site configuration.](docs/screenshots/superadmin/settings.png)

The first card states the tenancy in four fields: tenant Zimbabwe / ZIDA, platform owner Afronovation, default visibility public at high level and registered for detail, and governance mode set to review required before publish. Below it, banner display mode offers a choice between stacking all active announcements and rotating through them one at a time. Public navigation visibility then lists the marketing pages — Opportunity, Platform, Strategic Pillars, Sectors and Projects — each with its address and a toggle, all currently visible.

Two things here are worth a government reader's attention. The governance rule that publication requires review is written as configuration on a page anyone with this tier can read, rather than being an assumption buried in the code, which makes custody legible to whoever inherits the platform. The second is the candour of the note above the toggles: hiding a page removes it from the navigation but leaves it reachable by direct address, so this is presentation and not access control. Stating that plainly is what prevents it being mistaken for a security measure.

### Users & Roles

![Users & Roles. This is the only tier that can create an administrator.](docs/screenshots/superadmin/users.png)

Thirty-four accounts sit across every role tier, all active, with no invitations pending and multi-factor compliance reported at nought per cent and not enforced. A panel headed team invites awaiting validation holds one request: a colleague nominated by a Pilot Qualified Investor, shown with the inviter, the address and the role they would be granted, awaiting review before any of it takes effect. The filter chips count the tiers — nine registered, four qualified investors, seven government, ten ministry admins, two ZIDA Admins and two Platform Admins — above a table of names, account identifiers, organisations, roles and join dates.

Those chip counts are the governance picture in a single line: two accounts hold ZIDA Admin and two hold this tier, out of thirty-four. Concentration is visible and countable, which is the condition for deciding whether it is right. Invitations raised elsewhere on the platform arrive here for validation rather than taking effect, so no other tier can enlarge the accredited population on its own. That the multi-factor figure is shown at nought rather than omitted is deliberate; it is a control ZIDA should settle before production, and the page does not let it pass unnoticed.

### Projects, Review Queue, Inquiries, MOU Registry and Reports

![The full project registry.](docs/screenshots/superadmin/projects.png)

Every governance status is filterable from one row of chips, and the counts reconcile: forty in total, made up of two drafts, four submitted, four in review, one with changes requested, two approved, twenty-six published and one archived, with two investor proposals identified separately. The table view shows title, sector, status, capital and last update — Goromonzi Agro Processing Industrial Park at US$36.9 million, TelOne Fibre to the Home at US$50 million, CICADA Macadamia and Avocado carrying a phased figure — and can be swapped for kanban, list or matrix.

No other console shows archived records, unsubmitted drafts and investor-originated proposals in the same list as the published registry. That completeness is what allows the owner tier to answer a question about the national pipeline without asking anyone to compile it. The capital column is equally instructive: one project records a narrative breakdown across phases and another shows no figure at all, because the registry displays what has been submitted rather than a tidied estimate. That is what pending validation looks like in practice, and it is the honest position for a pilot.

![The platform-wide review queue.](docs/screenshots/superadmin/review.png)

Eleven new submissions are stacked as cards, with a second tab for pending amendment and ministry association requests. Each card names the project and the ministry it is filed against — the xyz test record under Information Communication Technology, Postal and Courier Services; Mazowe Valley Irrigation Revitalisation under Lands, Agriculture, Fisheries, Water and Rural Resettlement, described as 4,200 hectares of gravity-fed irrigation — and offers expanders for full project detail and action history, a reviewer notes box, and a row of actions: request changes, approve, publish and reject, with send back to draft and start review greyed until applicable.

Look at that action row again, because it is the clearest picture of this tier in the whole console. Approve and publish sit side by side on one card. At every other tier they are held by different people, and the separation between clearing a project and placing it on the national registry is the core of the governance model. The page states the mechanism in its own subtitle: buttons render from the signed-in role's entitlements rather than from a fixed layout, so what an officer can see is exactly what they are authorised to do.

![All enquiries platform-wide, filterable by category and status.](docs/screenshots/superadmin/inquiries.png)

The page opens on executive escalations rather than the general queue, and it is empty: no enquiries have yet been submitted under the platform or executive escalation category, so every status filter reads nought and the message confirms that none has been addressed to the Platform Admin. The subtitle draws the distinction explicitly — these are addressed directly to the platform owner and held separate from the shared ZIDA admin queue. The platform-wide list of seven sits behind the adjacent all enquiries tab, with the usual kanban, list, table and matrix views and a CSV export.

An escalation channel that exists and stands empty is a better result than a busy one. It means the ordinary triage path has absorbed everything the public has raised during the pilot, while a route remains open for anything that must reach the platform owner directly. Keeping the two apart also stops the owner tier drifting into daily operations: enquiries answered by ZIDA remain ZIDA's to answer, and the record shows plainly which of the two received each approach.

![All memoranda platform-wide.](docs/screenshots/superadmin/mou.png)

Ten records are grouped by stage: six with no memorandum yet, one in drafting, one in review, one ready for signature and one executed, with none currently at both parties approved or finalised. The table pairs each investor and their organisation with the project, so Nomsa Dube of Kestrel Capital Partners appears against Masuwe International Medical Center and Grace Mutindi of Zambezi Growth Partners against Kumusha Power Project. Two columns run alongside each other — engagement status and memorandum stage — with ticket sizes where an investor has stated one, from US$5–25 million down to a dash.

Reading those two columns together is the point of this view. Every row where the memorandum stage is blank has an engagement still submitted or under compliance review, and the single executed memorandum sits against an approved engagement. The gate holds in both directions, and it holds visibly, without anyone having to trust that it does. For an investor assessing Zimbabwe, that means an executed memorandum has a traceable lineage back through approval to the original approach, and for ZIDA it means the commercial pipeline can be reported on by stage rather than by anecdote.

![Executive reporting.](docs/screenshots/superadmin/reports.png)

The Government Executive Report is generated on demand and stamped: named to Amara Sesay as Platform Admin, timed to the second, referenced REP-20260905-FC01, sourced to live platform data and marked for government use. Its command strip carries four measures — total pipeline value of US$2.34 billion across forty projects, investor capital coverage of 0.3 per cent representing US$6 million committed against US$2.21 billion published, average review turnaround of ten days across thirty-four submissions, and a funnel conversion rate of 44.4 per cent. Below sit the counts and an economic impact block giving average project size of US$77.99 million and a publication rate of 65 per cent.

Provenance is what makes this printable and defensible. A briefing tabled at a ministry can be checked back against the platform by reference, timestamp and generating officer, so the figures in the room and the figures in the system are the same figures. Just as important is what the strip refuses to smooth: capital coverage of 0.3 per cent is displayed as prominently as the pipeline total, with the action it implies attached to it. A report that surfaces its own weak measure is the only kind worth reading the strong ones from.

### Communication Hub, Profile and Account

![Staff messaging.](docs/screenshots/superadmin/communication.png)

Ten threads sit in a single inbox, sorted into general enquiries, active deals and engagements. The open thread concerns Goromonzi Agro Processing Industrial Park, with a context strip showing it published, valued at US$36.9 million and located in Mashonaland East, and a stated response expectation of one business day. Inside the thread, a Government user records an amendment request routed to the Ministry of Finance, Economic Development and Investment Promotion for first review; the request appears as a structured card marked declined, with the reply from the Finance ministry admin beneath it. The composer carries a visibility selector currently set to visible to investor.

Correspondence and formal acts are not held in separate systems here, which is the difference that matters in a dispute. The amendment request, its routing, its decision and the conversation around it occupy one sequence, so the reasoning behind an outcome survives alongside the outcome itself. The visibility selector makes the audience of every message explicit rather than assumed, and the CSV and PDF exports let a thread be filed with a ministry's own records in a form that leaves the platform intact.

![My Profile.](docs/screenshots/superadmin/profile.png)

Amara Sesay's account is shown with its address and Platform Admin badge, above a note that this is the same view ZIDA staff see on the holder's institutional compliance dossier. The company and representative block gathers entity name, corporate phone, authorised representative, representative title, job title, corporate website, business registration identifier and head office address, described as the identity of record that prepopulates read-only fields when a project is proposed or an application filed. The fields are unfilled on this walkthrough account, and a compliance and documents section follows below.

The tier that can create administrators is itself an identified account with a named holder, an organisation and a compliance record readable by ZIDA staff. That symmetry is quiet but worth noting: the platform owner completes the same dossier as an investor and is visible on the same terms. Holding the entity details once and prepopulating them into every proposal and application also means identity is asserted in one place and reused, rather than retyped per submission where it can drift between records.

![Account settings.](docs/screenshots/superadmin/account.png)

Account and Security divides into four tabs — profile, security, sessions and notifications — with the profile tab open. The display name is editable; the e-mail address is marked read-only, the entity, Afronovation, Inc., is marked managed by ZIDA, and the identity method is recorded as a local password. A separate access and entitlements card states this tier's scope in one line: full platform administration, site settings, role assignment and the governance audit trail.

The read-only address and the ZIDA-managed entity are the substantive controls on this page. The identity that the audit trail attributes every action to cannot be edited by the person acting, so the highest tier cannot quietly become someone else, and the organisation it belongs to is set by the agency rather than by the holder. Stating the entitlement scope plainly on the account also serves the handover question raised in section 7: whoever inherits this role can read exactly what they are inheriting, including that the sign-in method is currently a password and worth a decision before production.

## 5. What Only You Can Do

Everything in the ZIDA Admin guide applies to you as well. This section covers only what does not exist at any lower tier.

| Capability | Where | Why it sits here |
| --- | --- | --- |
| Unpublish a project | Review Queue, any project | Withdrawing something from the national registry is heavier than placing it there |
| Reverse any workflow transition | Any project | Including moves the workflow does not normally permit |
| Force a status or visibility with the override | Publishing Override | The escape hatch from governance |
| Revert an override | Publishing Override | So an override is itself reversible |
| Create or archive a sector, subsector, ministry, pillar, goal, province or contact reason | Taxonomies | Retroactively changes the meaning of filed records |
| Approve an investor-proposed subsector | Taxonomies | Investors can propose a classification; only you can adopt it |
| Create an administrator or another platform manager | Users & Roles | An administrator cannot expand the administrator set |
| Change any account's role, at any tier | Users & Roles | Including demoting an administrator |
| Read the full, filterable audit log | Audit Log | |
| Change site and tenant settings | Site Settings | |

> **On the override**
> It bypasses the governance model rather than operating inside it. Every other control on this platform exists to ensure that no significant act rests on one person's authority — approval is separated from publication, memoranda need two approvals, ministries cannot move their own projects. The override sets all of that aside.
>
> That is defensible for genuine deadlocks and emergencies. It is not defensible as a shortcut around a queue. The practical test: if you are reaching for the override because a workflow step is slow or inconvenient, the right fix is the workflow.

## 6. Step-by-Step Processes

### Process A — Maintain the classification scheme

1. Open **Taxonomies** at `https://zidaproject.com/super-admin/taxonomies`.
2. Select the taxonomy: sectors, subsectors, ministries, strategic pillars, development goals, provinces, or contact reasons.
3. Add, edit or archive entries.

Two cautions. Editing an entry changes how every project already filed against it is described. Archiving one affects projects that reference it. Prefer adding a new entry over redefining an existing one, and archive rather than delete where the choice exists.

### Process B — Adopt an investor-proposed subsector

When an investor selects "Other" for a subsector, the platform records their suggestion as pending validation rather than discarding it.

1. Open **Taxonomies** and go to subsectors.
2. Review the pending entries.
3. Approve the ones that represent a genuine gap in the scheme.

This is how the classification scheme learns from the market without letting the market edit it directly.

### Process C — Create an administrator

1. Open **Users & Roles** at `https://zidaproject.com/super-admin/users`.
2. Create the account, or change an existing account's role.
3. You can assign any role, including ZIDA Admin and Platform Manager.

This is the capability that makes this tier the root of the entitlement tree. It is also the one most worth restricting by policy: consider whether creating a Platform Manager should require agreement between Afronovation and ZIDA rather than being a unilateral act.

### Process D — Unpublish a project

1. Open the project from **Projects** or **Review Queue**.
2. Move it out of published — to archived, or back to approved for correction.

Use this when a published project is wrong: incorrect figures, premature disclosure, or a ministry mapping error that misleads investors. A ZIDA Admin cannot do this, so it will reach you as a request.

### Process E — Use the Publishing Override

1. Open **Publishing Override** at `https://zidaproject.com/super-admin/override`.
2. Select the project.
3. Set the status and visibility level you require.
4. Record why. This is the field that matters most — the override is legitimate only if its reason is defensible after the fact.
5. Apply.

To reverse it, return to the same page and revert.

Before using it, ask whether the normal path genuinely cannot work. In most cases it can, and using it anyway removes the second party that the workflow would otherwise have required.

### Process F — Read the audit trail

1. Open **Audit Log** at `https://zidaproject.com/super-admin/audit`.
2. Filter by actor, action type, entity or date range.

Useful things to confirm during the pilot: that every project publication names the officer who published it; that every entitlement change records the previous and new role; that every application decision is attributed; and that any override you performed appears with its stated reason.

> **What to check**
> Is the audit log's granularity sufficient for ZIDA's assurance requirements? If your auditors expect a category of event that is not recorded here, record it in section 8 — audit coverage is far easier to extend now than after a year of records exists in the old shape.

### Process G — Verify a change at the tier it affects

1. Make the change in `/super-admin`.
2. Switch to `https://zidaproject.com/admin` to see it as ZIDA staff will.
3. Switch to `https://zidaproject.com/deal-room` to see it as an investor will.

Console switching is not a convenience; it is how you confirm that a change to the classification scheme or an entitlement has the effect you expected at the tier where it matters.

## 7. Custody and Handover

Three questions should be settled before this platform leaves pilot, and none of them is technical:

**Who holds this role in production?** If ZIDA takes custody, at least one ZIDA officer needs a Platform Manager account and the training to use it. If Afronovation retains it, that should be a written arrangement with a defined scope, not an accident of who built the system.

**What governs use of the override?** It is recorded, but recording is not the same as reporting. Consider whether ZIDA should receive notice of every override rather than having to look for them.

**How are administrators created?** Currently a single Platform Manager can create one unilaterally. Whether that should require agreement between two parties is a policy decision the platform can enforce if you want it enforced.

## 8. Your Feedback

The first table is the important one for this persona.

| # | Governance question | Your position |
| --- | --- | --- |
| 1 | Who should hold Platform Manager in production? | |
| 2 | Should override use be reported to ZIDA routinely? | |
| 3 | Should creating an administrator require two parties? | |
| 4 | Is the audit log's coverage sufficient for your auditors? | |

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
