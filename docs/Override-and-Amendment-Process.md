# Override and amendment process

Approved and published projects are locked for direct field edits. Further content changes go through an Amendment Request Action Card. The project row is never mutated at file time.

## Investor path (single stage)

1. A `qualified` investor who owns the proposal (`investorSubmitted` + `createdBy`) files **Request Amendment** on an approved/published project.
2. Card type: `project_amendment_request`, status `open`.
3. ZIDA Admin and Super Admin are emailed (`fetchCaseManagerCandidates`).
4. The card appears on **Admin → Review Queue → Pending Requests** and **Super Admin → Review Queue**.
5. Approve applies `proposedChanges` to the live project. Decline is terminal.

## Government path (two stage)

1. A `government` reviewer files on a project that matches their ministry (primary or secondary).
2. If that ministry has an active `ministry_admin`, the card stays `open` and those ministry admins are emailed. They **Approve & Escalate** (status becomes `escalated`) or Decline (terminal).
3. If the ministry has **no** active ministry admin, the card files as `escalated` and ZIDA is emailed immediately.
4. Escalated cards are ZIDA Admin / Super Admin's final decision.
5. Super Admin may **Approve (Override)** an `open` government-filed card without waiting for ministry stage 1.

## Ministry Admin direct edit

`ministry_admin` can edit their own ministry's projects **before** Approved/Published. After lock, they do not file investor-style amendments; government reviewers on that ministry file the two-stage card.

## Super Admin publishing override

- Publish authority: `admin` and `super_admin` only (`lib/governance/project-workflow.ts`).
- `ministry_admin` and `government` are reviewers through Approved. They never publish.
- Super Admin → Publishing Override is the console for exceptional publish/unpublish actions.

## Association requests (related, not an amendment)

A `ministry_admin` or `government` user whose ministry is **not** already a beneficiary files **Request Association**. That is a `ministry_association_request` card, ZIDA-only decision, also listed on Pending Requests. Approve adds the ministry as a secondary beneficiary.
