# Role and console map

## Post-login landing

| Role | Lands on |
|---|---|
| `super_admin` | `/super-admin` |
| `admin` | `/admin` |
| `ministry_admin` | `/ministry` |
| `qualified`, `government`, `registered` | `/deal-room` |

Wrong-console URLs redirect to that landing. APIs still 403 via `requireRole()`. A signed-in user who hits a leftover AccessGate sees **Access denied** and **Go to your console**, never "Sign in required."

## Consoles a role may open

| Role | Consoles |
|---|---|
| `super_admin` | Super Admin, Admin, Deal Room |
| `admin` | Admin, Deal Room |
| `ministry_admin` | Ministry Desk |
| `government` | Deal Room (labeled Government Reviewer Console) |
| `qualified` | Deal Room |
| `registered` | Deal Room (browse tier: Overview, Pipeline, Saved, Reports, Profile, Account, Vault). Engagements / MOU / Communication Hub / My Proposals stay qualified-only. |

## Who creates whom

| Action | Who | What it does |
|---|---|---|
| **Create user** | Admin, Super Admin, Ministry Admin (ministry-locked `government` only) | Mints a real account + temporary password for out-of-band hand-off |
| **Invite user** | Admin, Super Admin | Sends a Resend email with a sign-up link and writes an audit row. Does **not** create the account |
| **Team invite** | Qualified investor (own org) or Ministry Admin (own ministry desk) | Org-team invite → ZIDA validation queue → role mirrors the owner |

Admin / Super Admin do **not** have a Team nav item. They use Users & Roles.

## NDA

Qualified (and Deal Room / Ministry) first visit is gated by the clickwrap NDA (`NdaGate`). Acceptance is stored on `profiles` (`ndaAcceptedAt`, version, IP, title) and appears in the Document Vault.

## Suspended accounts

`/api/me` exposes `accountStatus`. A non-`active` account sees a banner in the dashboard shell. `requireRole()` rejects mutations with `ACCOUNT_INACTIVE`.
