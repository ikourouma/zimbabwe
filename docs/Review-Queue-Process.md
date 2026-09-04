# Review Queue process

One queue, two tabs, three consoles.

| Console | URL |
|---|---|
| Admin | `/admin/review` |
| Super Admin | `/super-admin/review` |
| Ministry Desk | `/ministry/review` |

## Tab 1 — New Submissions

Projects in `submitted_for_review`, `under_review`, `changes_requested`, or `approved`.

- Ministry Admin sees only their ministry's projects (`projectMatchesMinistry`).
- Admin / Super Admin see the platform-wide queue.
- Available buttons follow the publish rulebook: ministry/government review through Approved; only Admin/Super Admin publish.

Expand **Full Project Detail** and **Action History** on a card before deciding.

## Tab 2 — Pending Requests

Still-open Action Cards from `GET /api/review-queue/amendments`:

1. **Investor amendments** (`project_amendment_request`, usually `open`) — ZIDA decides.
2. **Government amendments** — `open` = awaiting that ministry's Ministry Admin (or Super Admin override); `escalated` = ZIDA final decision.
3. **Association requests** (`ministry_association_request`) — ZIDA only. Ministry Admin's API response excludes these.

Decisions POST to `/api/messages/[id]/action`. Approve on an amendment applies the field diff. Approve on an association adds the requesting ministry as a secondary beneficiary.

## Notifications

| Event | Who is emailed |
|---|---|
| Investor files an amendment | Active ZIDA Admin / Super Admin |
| Government files, ministry has a Ministry Admin | That ministry's Ministry Admins |
| Government files, no Ministry Admin (fallback) | ZIDA desk |
| Association request filed | ZIDA desk |

Email is fire-and-forget via Resend. A missing or invalid `RESEND_API_KEY` does not fail the file.

## What this queue is not

- Inquiry qualification (that is **Inquiries**)
- Org-team invite validation (that is **Users & Roles → Team invite queue**)
- MOU dual-approval (that is the MOU registry)
