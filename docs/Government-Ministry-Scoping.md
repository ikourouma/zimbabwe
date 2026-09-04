# Government and ministry scoping

## Roles

| Role | Console | Scope |
|---|---|---|
| `government` | Investor Dashboard / Government Reviewer Console (`/deal-room`) | Reviewer. Sees ministry-matched projects. Can file two-stage amendments and association requests. Can be the Assigned Reviewing Officer on many projects. |
| `ministry_admin` | Ministry Desk (`/ministry`) | Console-admin for **one** ministry. Creates/edits that ministry's projects. Reviews submissions and stage-1 government amendments. Cannot publish. Cannot qualify investors. |

`ministry_admin` seats on the same ministry are peers (two-seat test of one access level), not a hierarchy.

## My Ministry

Ministry Desk pipeline, review, engagements, MOU, and inquiries default to "my ministry" using `projectMatchesMinistry`:

- primary beneficiary ministry, or
- secondary beneficiary ministry

A Ministry Admin whose account has no `ministryId` cannot create projects or see a scoped queue.

## Primary-only review authority

Ministry admins **see** projects where their ministry is primary or secondary beneficiary, but **review actions** (approve, request changes, reject, and similar stage transitions) are granted only when their ministry is the **primary** beneficiary. Secondary-beneficiary rows are read-only in the review queue and project drawer — the primary beneficiary ministry owns stewardship through Approved. Publish remains ZIDA admin / super admin only. This rule is enforced server-side by `resolveProjectWorkflowRole` and mirrored in the client UI so action buttons never appear when the server would return 403.

## My Assigned Projects

A `government` reviewer can filter the Deal Room pipeline to projects where they are `assignedReviewingOfficerUserId`. Assignment is set by that project's Ministry Admin or by ZIDA Admin / Super Admin. One officer, many projects.

## Request Association

If the viewer's ministry is **not** already a beneficiary, **Request Association** files a ZIDA-reviewed card instead of silently adding the ministry. Reason is required. Duplicate open requests from the same ministry are rejected (409).

## Inquiries

Ministry Inquiries use the same Kanban / List / Table / Matrix switcher as Admin. Decisions stay hidden: Approve upgrades the applicant to Qualified Investor, which is a ZIDA account-governance action.
