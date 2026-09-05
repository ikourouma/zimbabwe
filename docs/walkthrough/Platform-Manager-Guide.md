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

This is the platform's classification infrastructure: sectors and subsectors, ministries, strategic pillars, development goals, provinces, and the contact reasons that route public enquiries.

Every project on the platform is filed against these values. Editing one retroactively changes the meaning of records already filed, which is why the capability sits here and nowhere else.

### Audit Log

![The full audit trail: who did what, when, and on whose authority.](docs/screenshots/superadmin/audit.png)

Other roles see an activity feed. This is the searchable, filterable record — every project transition, entitlement change, publication, application decision and override, attributed and timestamped.

### Publishing Override

![Publishing Override. Platform-owner authority to force a status or visibility change outside the normal workflow.](docs/screenshots/superadmin/override.png)

The override forces a project into any status and any visibility level, bypassing the workflow entirely. It exists for situations the workflow cannot resolve — a project stuck in a state nobody can move it out of, or something published that must come down immediately.

Overrides are recorded and can be reverted.

### Site Settings

![Site Settings: tenant and site configuration.](docs/screenshots/superadmin/settings.png)

### Users & Roles

![Users & Roles. This is the only tier that can create an administrator.](docs/screenshots/superadmin/users.png)

### Projects, Review Queue, Inquiries, MOU Registry and Reports

![The full project registry.](docs/screenshots/superadmin/projects.png)

![The platform-wide review queue.](docs/screenshots/superadmin/review.png)

![All enquiries platform-wide, filterable by category and status.](docs/screenshots/superadmin/inquiries.png)

![All memoranda platform-wide.](docs/screenshots/superadmin/mou.png)

![Executive reporting.](docs/screenshots/superadmin/reports.png)

### Communication Hub, Profile and Account

![Staff messaging.](docs/screenshots/superadmin/communication.png)

![My Profile.](docs/screenshots/superadmin/profile.png)

![Account settings.](docs/screenshots/superadmin/account.png)

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
