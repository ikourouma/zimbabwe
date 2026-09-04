# Team Member Lifecycle

Team, Ministry &amp; Traceability Batch, Phase 9. Written after Phases 4, 5, and 8 shipped, so this
reflects the actual end-to-end flow running in the platform today — not the original proposal. This
is the reference doc for "what happens after I invite someone?" for both an org admin (`qualified`)
and a ministry admin (`ministry_admin`).

## Locked terminology

- **Team Member** — anyone on an org's/ministry's invited roster (an `org_invites` row).
- **Co-editor** — a Team Member granted access to one specific *proposal* (`project_team_assignments`).
- **Delegate** — a Team Member granted access to one specific *engagement* (`investorEngagements.assignedUserId`).
- **Case Manager** — the ZIDA staff member (`admin`/`super_admin`) responsible for a ministry's
  projects by default, or a specific project via override (`assignedStaffUserId`).

None of these ever *replace* the owner's own authority — every grant is additive. The org admin
(or ministry admin) can always act on their own proposals and engagements, whether or not a
teammate is also assigned.

## TL;DR

| Step | Who does it | Where |
|---|---|---|
| 1. Invite Team Member(s) | Org admin / ministry admin | `/deal-room/teams` or `/ministry/teams` |
| 2. Four-Eyes validation | ZIDA admin/super admin | `/admin/users` or `/super-admin/users` |
| 3. Assign to a proposal (Co-editor) or engagement (Delegate) | Org admin / ministry admin | The proposal's own page, or the engagement's detail drawer |
| 4. Do the work | Team Member | Their own dashboard — the proposal/engagement now appears exactly as if they owned it |
| 5. Unassign / revoke | Org admin / ministry admin | Same picker (unassign), or the Teams page (revoke all access) |

## 1. Inviting a Team Member

From `/deal-room/teams` (qualified investors) or `/ministry/teams` (`ministry_admin`) — same
`TeamRosterView` component (`components/account/team-roster-view.tsx`), same underlying API, only
the page copy differs.

The invite form supports **bulk invites** (item 4 of the original feedback batch): add as many
name/email rows as needed and submit them in one call to `POST /api/org-team/invites`, which
accepts either a single invite object or an array and returns a per-row `{ ok, inviteEmail, error }`
result so partial failures (e.g. a duplicate email) don't block the rest of the batch.

Each row becomes its own `org_invites` row with `status: "pending_validation"`. Nothing is live yet
— the account may not even exist.

> This is a distinct, older mechanic from `/deal-room/teams` used to only appear embedded inside
> **My Profile** (`components/account/my-team-panel.tsx`), one invite at a time. That panel is now a
> compact summary card ("3 active, 1 pending — manage your team") that links out to the dedicated
> Teams page; the full roster and bulk invite form live there instead.

## 2. ZIDA Four-Eyes validation

Every invite — regardless of who sent it or which persona they'll become — sits in the same
platform-wide validation queue ZIDA already uses for every other account-creation path
(`/admin/users`, `/super-admin/users`). A ZIDA admin or super admin reviews the invite and either:

- **Approves** (`approveOrgInvite` in `lib/db/queries/org-team.ts`) — links an existing account by
  email if one already exists, or provisions a brand-new one directly (same
  `createAuthUserDirect` path as "Create User"). The invitee's role mirrors the *inviting owner's*
  own role: a `qualified` owner's invitees become `qualified` teammates on the same
  `organization`; a `ministry_admin` owner's invitees become `ministry_admin` peers on the same
  `ministryId` — not a lesser sub-role either way. `org_invites.status` flips to `active`.
- **Rejects** (`rejectOrgInvite`) — the invite closes out as `revoked`; any pre-existing account (if
  the email already had one) is left completely untouched.

Chain-of-custody is recorded at approval time: the new profile's `createdByUserId` points at the
*inviting owner* (not the validating staffer — that's separately captured by the invite's own
`validatedBy`), with an immutable `createdByContext` snapshot of the owner's name/role/org/ministry
at that moment. This is what powers the "Chain of custody" line in the user detail drawer.

The invitee gets an email the moment their account goes live (`notifyUser`, gated on their
`teamActivity` notification preference) — no need to poll or ask the owner whether it went through.

## 3. Putting an active Team Member to work

An `active` Team Member has an account but, by itself, that grants no extra access anywhere — they
still need to be put to work on something specific:

**Co-editor (proposal).** From a proposal's own page (`/deal-room/proposals/[id]`), the owner uses
the `TeamAssignmentPicker` to add any of their own active Team Members as a co-editor
(`POST /api/projects/[id]/team`). This is deliberately per-proposal, not blanket org-wide access —
the owner opts a teammate into specific proposals of interest one at a time. The assigned teammate
gets a notification and can immediately see and edit that proposal from their own dashboard (see
Section 4).

**Delegate (engagement).** From the engagement's detail drawer (Details tab), the owner uses the
`EngagementDelegatePicker` to assign one Team Member as the engagement's Delegate
(`POST /api/engagements/[id]/assign`). Unlike a co-editor, a Delegate has *full* authority on that
one engagement, equal to the owner's — either party can edit, message ZIDA, or drive the MOU
forward. Staff (`admin`/`super_admin`) can also assign a Delegate on the owner's behalf, but only
while the engagement is still `draft`.

Because owner and Delegate now have equal authority, ZIDA can get replies from either side. A small
**primary-contact** indicator (`primaryContactUserId`, defaults to the owner) makes it explicit who's
currently expected to drive the conversation — visible as a badge in the engagement drawer and the
Messages tab, switchable by either party at any time (advisory only; never an access gate).

## 4. What the Team Member sees

Once assigned, the proposal or engagement shows up in the Team Member's *own* dashboard exactly as
if they were its creator/owner — there's no separate "assigned to me" view to hunt through:

- A co-editor's assigned proposal passes the same project-visibility check
  (`p.teamAssignedUserIds?.includes(user.userId)` in `GET /api/projects`) that the owner's own
  proposals use, so it appears in their Proposals list, is fully editable, and their edits are
  attributed to their own identity, not the owner's.
- A Delegate's assigned engagement is included in `GET /api/engagements` for their own user ID
  (`assignedUserId = actor.userId`, alongside the usual `userId = actor.userId` owner clause), so it
  appears in their Engagements list with full read/write access, including the MOU and Communication
  Hub tabs.

## 5. Unassigning vs. revoking — the safe-handoff guards

Two different actions, two different blast radii:

**Unassigning from one item** — the owner removes a co-editor from one proposal
(`DELETE /api/projects/[id]/team`) or a Delegate from one engagement
(`DELETE /api/engagements/[id]/assign`). Only that one item is affected; the Team Member keeps their
account and any other assignments untouched. If the removed Delegate was also the primary contact,
it automatically falls back to the owner rather than pointing at someone with no authority left on
that engagement.

**Revoking a Team Member's access entirely** — from the Teams page roster, revoking an `active`
invite (`DELETE /api/org-team/invites/[id]`) ends their access altogether. Because this is a much
bigger blast radius, it's guarded:

- If that Team Member currently holds **no** active co-editor or Delegate assignments, revocation is
  immediate.
- If they hold **any**, the server blocks the request (409) and the Teams page instead shows a
  confirmation dialog listing every affected proposal and engagement by name. The owner can either
  cancel and reassign each one individually first (from that item's own page), or confirm
  `fallbackToOwner: true`, which atomically removes every one of that teammate's co-editor grants
  and clears every Delegate assignment (falling `primaryContactUserId` back to the owner too) before
  revoking the invite — never leaving a dangling reference to a teammate who no longer has an
  account-level grant.

The same "how many things would silently change" principle applies to the ministry-side Case
Manager default (Section 6, below): changing a ministry's default Case Manager shows how many
projects currently have no per-project override and would immediately re-route to the new default,
before committing.

## 6. Ministry-side variant

Same pipeline end-to-end, with `ministry_admin` peers instead of `qualified` Team Members:

- Invite from `/ministry/teams` instead of `/deal-room/teams` (same `TeamRosterView` component,
  `entityLabel="ministry"`).
- Same Four-Eyes validation queue; approved invitees join as `ministry_admin` on the *same*
  `ministryId` as the inviting owner — multiple `ministry_admin` accounts per ministry are fully
  supported (no unique constraint on `profiles.ministryId`), so a ministry can have several peers
  sharing the same desk.
- `ministry_admin` gets ministry-locked "full rights" on projects (create/edit/publish, like
  `admin`/`super_admin` but scoped to their own ministry only) rather than the `qualified`
  investor's proposal-drafting flow — so the Co-editor step is less commonly needed on the ministry
  side, but works identically if used.

**Case Manager** is the mirror-image concept on the ZIDA side, not the ministry side: every ministry
has one default assigned ZIDA staff member (`ministries.assignedStaffUserId`, set via
`PATCH /api/ministries/[id]/case-manager`), and any individual project can override it
(`projects.assignedStaffUserId`). This is what determines which ZIDA staffer is the default point of
contact for a given ministry's projects — set and changed from the Case Manager control on any of
that ministry's project detail drawers (`admin`/`super_admin` only).
