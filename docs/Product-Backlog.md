# Product Backlog

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform*
*Enhancement ideas, tracked separately from defects | September 2026*

## What this is

A running record of product enhancements — things the platform does correctly today but could do
better — raised during pilot review, stakeholder prep, or ordinary use. This is deliberately
separate from [docs/UAT-Defect-Log.md](UAT-Defect-Log.md): a defect is behaviour nobody intended;
an entry here is a real gap in something that already works as designed. Same ID/status
discipline as the defect log, so either can be searched the same way.

## Status legend

| Status | Meaning |
| --- | --- |
| Open | Raised, not yet scheduled |
| In Progress | Actively being worked |
| Closed | Shipped |
| Deferred | Raised and agreed, but deliberately scheduled for after a specific milestone |

## Backlog

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| PB-001 | Dashboard sidebar showed a generic role badge instead of the signed-in user's specific ministry/organisation | Medium | Closed |

---

### PB-001 — Dashboard sidebar showed a generic role badge instead of the signed-in user's specific ministry/organisation

**Priority:** Medium. **Status:** Closed, same day raised.

Every console's sidebar header showed two fixed lines: the console name (e.g. "Ministry Desk") and
a generic badge from `CONSOLE_META` — "Ministry Official", "Investor Workspace", "Government
Reviewer". The badge never varied by *which* ministry or *which* firm: a min-energy admin and a
min-ict admin saw an identical header, and so did every investor firm regardless of name. Raised
during stakeholder-demo prep, where officials from several different ministries would be in the
room and the platform's own chrome couldn't tell them apart.

**Fix.** `resolveConsoleIdentity()` in
[components/dashboard/dashboard-nav-config.ts](../components/dashboard/dashboard-nav-config.ts)
resolves the specific identity to show in place of the generic badge:

| Role | Header second line |
| --- | --- |
| `ministry_admin` | The taxonomy ministry name for their `ministryId` (authoritative — not the free-text `organization` field, which isn't guaranteed to be set for an account created later through Create User) |
| `government` with a `ministryId` | "Affiliated: `<ministry name>`" — preserves the deliberate distinction that they're a national reviewer, not that ministry's own staff |
| `government` with no `ministryId`, `qualified`, `registered` | Their `organization` |
| `admin`, `super_admin` | Unchanged — "ZIDA Admin" / "Platform Ops". There is exactly one ZIDA and one platform owner, so there's no cross-entity ambiguity to resolve the way there is across 4 ministries or many investor firms. Revisit if that judgment call should change. |
| Nothing on file (e.g. a brand-new `registered` investor) | Falls back to the generic badge so the line is never blank |

[components/dashboard/dashboard-sidebar.tsx](../components/dashboard/dashboard-sidebar.tsx) wires
this from `useAuth()` (`organization`, `ministryId`) and `useTaxonomyStore()` (`ministries`), in
both the console-switcher and plain header states, plus the collapsed icon-rail's single-letter
avatar and tooltip.

## Adding a new item

Append the next `PB-NNN` to the table above with a one-line title, then add its own `###`
subsection below with the same three fields the defect log uses: what was noticed, why it matters,
and — once picked up — what changed.
