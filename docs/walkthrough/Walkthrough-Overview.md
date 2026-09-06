# Platform Walkthrough — Overview and Persona Map

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform | Walkthrough Guide v1.0*
*Prepared for pilot review | September 2026*

## Executive Snapshot

| Question | Answer |
| --- | --- |
| What is this document? | The entry point to a set of seven walkthrough guides, one per persona. |
| Who is it for? | The ZIDA team and Government of Zimbabwe stakeholders reviewing the platform before sign-off. |
| What is it for? | To let each stakeholder sign in as their own persona, follow every process step by step, see what they can and cannot do, and request enhancements. |
| What is the platform address? | `https://zidaproject.com`. Every address in every guide derives from it. |
| What should I do with it? | Read this document first, then the guide for your persona. Record feedback in the tables at the end of each guide. |
| How long does the full set take? | About four hours across all seven personas, or 20 to 55 minutes for any one. |

## Contents

1. How to Use This Set
2. The Seven Guides
3. Concept Note Personas Against the Implemented Platform
4. Three Personas Not Yet Built
5. One Role the Concept Note Does Not Describe
6. The Access Tier Model
7. How the Guides Were Produced
8. What We Need Back From You
9. Institutional Email Identity — An Adjacent Opportunity

---

## 1. How to Use This Set

Each guide is written to be followed at a keyboard, not read at a desk. It gives you the exact address to start from, what you will see when you arrive, and a numbered sequence for every process that persona performs. Screenshots are taken from the live platform, so what is in the guide is what you will see on screen.

Each guide answers the same five questions in the same order:

1. **Who is this persona** — and which concept note persona it corresponds to.
2. **How do I sign in** — the exact address, and where you land afterwards.
3. **What is my dashboard** — every section, with a screenshot and its purpose.
4. **What can I do, and what can I not do** — with the reason for each boundary and who holds the capability instead.
5. **How do I do it** — numbered steps for every process, with the statuses each one moves through.

Every guide ends with feedback tables. **These are the deliverable.** The purpose of this exercise is not to confirm the platform works — it is to find where it does not match how Zimbabwe intends to operate, while changing it is still inexpensive.

> **A note on what "wrong" means here**
> An enhancement request is as valuable as a defect. If a capability sits with the wrong role, if a workflow needs a step it does not have, or if a filter your team relies on is missing, that is exactly what we need to hear. The boundaries described in these guides are design decisions, and design decisions can be revisited.

## 2. The Seven Guides

| Persona | Role | Signs in at | Lands on | Pages covered | Distribute to |
| --- | --- | --- | --- | --- | --- |
| Public Visitor | none | — | `/` | 15 | Open |
| Registered Investor | `registered` | `/auth/sign-in` | `/deal-room` | 7 | Pilot participants |
| Qualified Investor | `qualified` | `/auth/sign-in` | `/deal-room` | 12 | Pilot participants |
| Government Reviewer | `government` | `/auth/sign-in` | `/deal-room` | 11 | Government stakeholders |
| Ministry Official | `ministry_admin` | `/auth/sign-in` | `/ministry` | 12 | Ministry stakeholders |
| ZIDA Admin | `admin` | `/auth/sign-in` | `/admin` | 10 | ZIDA console operators |
| Platform Manager | `super_admin` | `/auth/sign-in` | `/super-admin` | 14 | Afronovation and ZIDA leadership |

Everyone signs in at the same address. Where you land is determined by your account's role — you do not choose a console, and you cannot reach one you are not entitled to.

Reading order, if you intend to review more than your own persona: **Public Visitor**, then **Registered Investor**, then **Qualified Investor**. Those three follow one investor's path from arrival to verified access, and the government-side guides make more sense once you have seen what the investor sees.

## 3. Concept Note Personas Against the Implemented Platform

Concept Note v0.3 defines ten personas in section 10. The platform implements six roles. The table below maps one to the other, so you can see exactly what was built, what was combined, and what was not built.

| Concept note persona | What the note says they need | Implemented as | Console | Status |
| --- | --- | --- | --- | --- |
| Public Visitor | Explore high-level opportunities and register interest | Unauthenticated access | Public site | **Live** |
| Registered Investor | View expanded project details, save projects, submit investment interest, request meetings | `registered` | Investor Dashboard | **Live** |
| Qualified Investor / Strategic Partner | Access deeper information, request investor packs, engage with investment desk workflows | `qualified` | Investor Dashboard | **Live** |
| Diaspora Investor | Discover diaspora-relevant opportunities and join a structured investment pipeline | No distinct role | — | **Deferred** |
| Project Owner | Submit updates, provide supporting documents, respond to inquiries if authorized | No distinct role | — | **Deferred** |
| ZIDA / Investment Authority Admin | Create, classify, review, approve, publish, and manage projects and inquiries | `admin` | ZIDA Admin | **Live** |
| Beneficiary Ministry User | View and validate projects linked to their ministry, suggest updates, contribute documents | `ministry_admin` | Ministry Desk | **Live** |
| Embassy Investment Desk User | Support investor and diaspora engagement, route inquiries, track market-specific leads | No distinct role | — | **Deferred** |
| Afronovation Platform Manager | Operate the platform, support users, maintain quality, manage workflows | Folded into `super_admin` | Platform Manager | **Merged** |
| Afronovation Super Admin | Control country settings, taxonomies, users, roles, entitlements, publishing rules, analytics | `super_admin` | Platform Manager | **Live** |
| *Not described in the concept note* | Platform-wide reviewer: validate and move projects through review, across all ministries | `government` | Investor Dashboard, badged Government Reviewer | **Additional** |

Six of the ten are live. Two were combined into one. Three were not built. One role exists that the note never described.

## 4. Three Personas Not Yet Built

These were in the concept note and are not in the platform. None of them is blocked by anything — they were scoped out to reach a working pilot, and each can be added.

**Diaspora Investor.** The note describes a diaspora-specific pathway with relevant opportunities and a structured pipeline. Today a diaspora investor registers like any other investor and sees the same registry. What is missing is the tailored discovery experience, not the ability to invest.

**Project Owner.** The note describes the entity actually delivering a project — able to post updates, add documents and answer questions about their own project without holding ministry authority. Today this work is done by the ministry on the project owner's behalf. This is the most operationally significant of the three: it is the difference between a ministry official retyping a project sponsor's update and the sponsor entering it directly.

**Embassy Investment Desk User.** The note describes embassy staff supporting investor engagement in their market and tracking market-specific leads. Today an embassy officer would need a Government Reviewer account, which gives them national scope rather than a market-specific view.

> **What we need from you**
> Which of these three matters most, and does any of them need to exist before production rather than after? Our reading is that **Project Owner** carries the most operational weight, because without it every project update passes through a ministry desk. But that is a judgement about how Zimbabwe wants to work, and it is yours to make.

## 5. One Role the Concept Note Does Not Describe

The `government` role — presented as **Government Reviewer** — is not in the concept note. It emerged during implementation because the review workload needed a national-level officer who is neither tied to one ministry nor holding ZIDA's publication authority.

It is a substantial role. It sees every project at every status nationally, edits project content during review, takes projects as far as **approved**, progresses investor engagements, and approves memoranda on government's behalf. What it cannot do is publish.

Because it was never in the note, it has never been formally reviewed by ZIDA. The Government Reviewer guide describes it in full, and section 8 of that guide is where to record whether it is the right role, whether its national scope is correct, and who in Zimbabwe's structure should hold it.

## 6. The Access Tier Model

The concept note also describes access in tiers rather than roles. Both models describe the same system; the tier model is about what an account can *see*, and the role model is about what it can *do*.

| Concept note tier | Roles in that tier | What it can see |
| --- | --- | --- |
| Public Visitor | unauthenticated | Published projects, no return metrics, no documents |
| Registered Visitor | `registered` | Full project detail and headline capital requirement; no return metrics, no documents |
| Qualified Investor / Partner | `qualified` | Return metrics, capital structure and gated documents |
| Institutional User | `government`, `ministry_admin`, `admin` | Government-side visibility, scoped by role |
| Afronovation Super Admin | `super_admin` | Everything, plus the platform's configuration |

One consequence is worth stating plainly: **a Government Reviewer sees the same financial detail a Qualified Investor sees.** They share a content tier. The difference between them is authority, not visibility.

## 7. How the Guides Were Produced

Every screenshot was captured from `https://zidaproject.com` by an automated browser signing in as a real pilot account for each persona, navigating to each page, and photographing what that account is actually served. Nothing is mocked, staged, or drawn.

This matters for two reasons. What you see in a guide is what that role genuinely sees, including any imperfection — we have not tidied anything. And when the interface changes, the capture re-runs and every image in every guide updates from one command, so these documents do not drift out of date the way hand-assembled documentation does.

The capability and limitation tables were verified against the platform's own authorization code rather than written from memory, so where a guide says a role cannot do something, that is what the system enforces.

Each guide is maintained as a text document and built into Word. If you want a change to the wording, the change is made once in the source and every format regenerates.

## 8. What We Need Back From You

Each guide ends with two or three feedback tables. Please complete them as you go rather than afterwards — the specific moment of confusion is far more useful than a general impression recalled later.

| We need | Where to record it |
| --- | --- |
| Anything broken or behaving unexpectedly | The defect table in your guide |
| Capabilities that are missing | The enhancement table in your guide |
| Capabilities sitting with the wrong role | The enhancement table, naming the role you expected |
| Wording that is wrong or sensitive | The wording table in the Public Visitor guide |
| Which deferred persona matters most | This document, section 4 |
| Who should hold the Platform Manager role | The Platform Manager guide, section 8 |
| How officials should be identified by email | This document, section 9 |

Five questions we would particularly like answered, because they are design decisions rather than defects and they are cheapest to change now:

1. Should **publication** require one ZIDA officer or two? It currently requires one.
2. Should a **Ministry Official** have a say in whether an investor engagement on their own project proceeds? They currently have visibility but no decision.
3. Should **ZIDA** be able to unpublish a project directly? That currently requires the Platform Manager.
4. Should **ministries** manage their own staff accounts through the full lifecycle? They can currently create accounts but not change or deactivate them.
5. Should a government account be **required to use an official government address**? Section 9 sets out what that would mean.

## 9. Institutional Email Identity — An Adjacent Opportunity

This section is not a walkthrough step and requires nothing from you during the review. It records an observation the pilot surfaced, because the moment to raise it is while account structure is still being decided.

**What the platform does today.** Every account is an email address. That address is the login, the notification destination, and — in the compliance dossier the Platform Manager sees — a trust signal: the platform already distinguishes an institutional address from a free consumer mailbox and displays that distinction on the user record. What it cannot currently do is verify that an address claiming to represent a ministry actually does.

**Why that matters here.** A Ministry Official approving a project, a Government Reviewer moving one to approved, and a ZIDA Admin publishing it are all exercising delegated public authority, and the audit trail records who did it by account. If those accounts sit on personal or commercial mailboxes, the audit trail is only as durable as a mailbox nobody official controls. When an officer transfers or leaves, the record of their decisions stays; their access does not necessarily follow.

**What a government email system would change.** A modern Government Email Management System replaces legacy and personal inboxes with a secure, centrally administered, cloud-based service — one that organises the volume of correspondence an agency generates, protects citizen and commercial data under government control, and applies statutory record-keeping automatically rather than by individual discipline. Giving every official a `.gov.zw` address makes institutional identity verifiable rather than asserted.

**How it connects to this platform.** Concept Note v0.3 positions this platform as the first delivery under a broader national digital acceleration effort, with subsequent systems sharing infrastructure and standards rather than each being built in isolation. Official email identity is exactly that kind of shared foundation: it is not specific to investment promotion, and every government system built after this one would inherit it. Three things would follow directly:

| Capability | What it enables |
| --- | --- |
| Domain-verified government accounts | The platform can require a `.gov.zw` address for `government` and `ministry_admin` roles, so institutional authority is proven at sign-up rather than granted on trust |
| Ministry inferred from the address | An officer's ministry can be derived from their address rather than assigned by hand, removing the most common account-setup error |
| Lifecycle tied to employment | Deactivating an officer's mailbox on transfer or departure withdraws platform access with it, instead of relying on someone remembering to do both |

**What this is not.** It is not in scope for this pilot, it is not a dependency, and nothing in the guides assumes it. The platform works today with any valid address. This is recorded so that if Zimbabwe is already pursuing official email provision, the platform can be aligned to it deliberately rather than retrofitted later.

> **What we need from you**
> Is a government email programme already under way or planned? If so, we would rather design account provisioning around it now — requiring official addresses for government roles is a small change today and a migration later. If not, is it something the platform should help make the case for?

---

> **Important**
> Seeded demonstration records are illustrative and pending official validation. Financial indicators, project readiness claims, ministry mappings and supporting documents should be validated by ZIDA and the relevant authorities before production publication. The platform treats imported records as draft or pending validation until approved through the governance workflow.
