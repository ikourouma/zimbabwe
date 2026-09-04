# ZIDA Digital Investment Platform
## Unified Project Registration — Master Field & Role Specification for Dev Review (v4, Final)

**Status:** Consolidated. This supersedes all prior drafts. Open items are called out explicitly in Section H — everything else below is confirmed and ready to build against.

---

## A. Roles — Final, System-Confirmed

| Role Key | Label | Description | Creates Projects? |
|---|---|---|---|
| `registered` | Registered | Newly self-registered investor, pre-KYC | ❌ No — gated behind qualification |
| `qualified` | Qualified Investor | Vetted investor, full Deal Room access, has a "My Team" | ✅ Yes — full 5-step investor path |
| `government` | Government Reviewer | Platform-wide reviewer, affiliated with Ministry of Industry & Commerce | ❌ No — reviews only |
| `ministry_admin1` | Ministry Admin (Finance, primary) | Ministry of Finance desk | ✅ Yes — ministry path, own ministry only |
| `ministry_admin2` | Ministry Admin (Finance, secondary) | Backup seat, same ministry, same permissions as ministry_admin1 | ✅ Yes — identical scope to ministry_admin1 |
| `admin` | ZIDA Admin | ZIDA console admin | ✅ Yes — either path, ZIDA-console scope |
| `super_admin` | Platform Owner | Afronovation, full platform authority | ✅ Yes — either path, unrestricted |

**This resolves the open question from the prior draft:** a second admin tier below the platform owner does exist (`admin`), separate from `super_admin`. Update all earlier references to "Platform Admin" → `super_admin`, and treat `admin` as the ZIDA-console-scoped tier originally proposed.

**Two items to clarify with product/dev before finalizing permissions (not blocking, but flagged):**
- `government` is described as "platform-wide reviewer" *and* "affiliated with Ministry of Industry & Commerce" — confirm whether that affiliation limits scope in any way, or is purely descriptive/organizational, with actual access being genuinely platform-wide (i.e., this is our earlier "ZIDA Rep" concept).
- `qualified` investors have a "My Team" — confirm whether team members get their own distinct permissions, or act under the qualified investor's account with identical rights. This affects whether "the submitter" in the locking/Amendment Request logic means the individual or the team/account.

---

## B. Two Entry Points, One Schema

The platform has two ways a project gets created, both writing to the same underlying project record:

1. **Investor Path** — `qualified` only, via the 5-step "Propose a Project" wizard (`/deal-room/proposals/new`)
2. **Government/Admin Path** — `ministry_admin1`, `ministry_admin2`, `admin`, `super_admin`, via project creation in their respective consoles

Both paths are differentiated by **Project Origin** (Section C below), which is what everything else in this spec — visibility, financial field tiers, document gating — reads from.

---

## C. Section 0 — Project Origin & Status (System Fields, Both Paths)

| Field | Set By | Changed By | Notes |
|---|---|---|---|
| Project Type (Government-Sponsored / Investor-Originated) | Auto-set on creation, based on initiating role | `admin`, `super_admin` only, via Amendment Request adjudication | Not user-selectable at creation |
| Publication Status (Draft → Submitted → Under Assessment → Published) | System, advances through the review workflow | `admin`, `super_admin` | Analytics dashboard already tracks these counts — confirm with dev whether this field already exists in the data layer before building it fresh |

---

## D. Investor Path — Step by Step

*Applies to `qualified` only. `registered` cannot access this flow.*

| Step | Fields | Build Status | Notes for Dev |
|---|---|---|---|
| **1. Basics & Identity** | Project Title, Sector, Subsector, Primary Beneficiary Ministry, Secondary Beneficiary Ministry (multi-select), Project Owner/Sponsor (from profile), Authorized Representative (from profile), Location (implementation site, prefilled from company address), Readiness Level | ✅ Built | Project Owner/Authorized Rep correctly pulled from profile, not re-entered — preserve this pattern |
| **2. Financials & Impact** | **E1 (built):** Capital Required, Financing Type, Development Impact, Direct/Indirect Jobs Projected. **E2 (not built):** Financial Indicators (IRR, NPV, ROI, Payback Period), Projected Revenue, Investment Source breakdown, Capital Structure, Shareholder Contribution. **E3 (new, not built):** Years of Sector Experience, Prior Projects Completed, Company Annual Turnover (last 3 years, structured field — currently only exists as a document upload), Source of Financing Confirmation, Financing/Co-Investment Partners | ⚠️ Partially built | E2 and E3 are real build work — this step currently under-captures financial depth and company capability |
| **3. Narrative & Taxonomy** | Opportunity Summary, Full Description, Scope (one item per line), Strategic Pillars (multi-select), SDG Alignment (1–17) | ✅ Built | Confirmed no overlap with Step 1's Sector/Subsector |
| **4. Supporting Documents** | Document upload with per-document Visibility Level (e.g., Qualified Investor tier), sticky "Visibility for next upload" default | ✅ Built | Confirmed staged visibility working: docs stay Admin Only until ZIDA reviews/approves |
| **5. Review & Submit** | Read-only summary of all fields, certification checkbox, Submit for Review | ✅ Built | Confirmed: submitting locks the proposal; further changes require an Amendment Request (Section G) |

---

## E. Government/Admin Path — Step by Step

*Applies to `ministry_admin1`, `ministry_admin2`, `admin`, `super_admin`.*

**⚠️ Build status unverified — no screenshots of this flow exist yet. The structure below is the design target; confirm against whatever currently exists before treating it as a build spec.**

| Step | Fields | Notes |
|---|---|---|
| **1. Basics & Identity (ministry-first)** | Same as investor Step 1, except **Location & Ministry section is front-loaded and required first** — ministry fields precede project naming, per the earlier "ministry creates project" instruction | Ministry Admin sees only their own ministry pre-filled/locked; Admin/Super Admin can select any ministry |
| **2. Financials** | **E1 only** — Capital Required, Financing Type, Development Impact, Jobs Projected. **E2 and E3 are not shown** — no capital-structure or company-capability detail, since there's no external company involved | Confirms the earlier access rule: government-created projects don't carry investor-grade financial detail |
| **3. Narrative & Taxonomy** | Same fields as investor path | Shared, no variation needed |
| **4. Supporting Documents** | Same upload mechanism, but **hidden by default** at project creation for `admin`/`super_admin`-created projects (per earlier instruction); visible immediately for `ministry_admin1/2`-created projects since it's their own project | Confirm this default-hidden behavior is actually implemented — it depends on the entitlement layer, which is not yet built (see Section G) |
| **5. Review & Submit** | Same lock-on-submit behavior | Same Amendment Request path applies |

---

## F. Cross-Cutting Access Matrix

| Section | `qualified` (own project) | `government` | `ministry_admin1/2` (own ministry) | `ministry_admin1/2` (other ministry) | `admin` | `super_admin` |
|---|---|---|---|---|---|---|
| Basics & Identity | Edit | View | Edit (own) | View, once Published | Edit/Reclassify | Edit/Reclassify |
| Financials E1 | Edit | View | Edit (own) | View, once Published | Edit | Edit |
| Financials E2/E3 | Edit | View | View only, once Published | View, once Published | View | View |
| Narrative & Taxonomy | Edit | View | Edit (own) | View, once Published | Edit | Edit |
| Documents | Edit, tiered visibility | View (assessment phase) | View (own) | View, once Published | View/manage tiers | View/manage tiers |
| Project Origin/Status | View only | View only | View only | View only | Edit | Edit |

**Note:** `ministry_admin1` and `ministry_admin2` have identical permissions — this is intentionally a two-seat test of the same access level, not two different permission tiers.

---

## G. Confirmed Governance Mechanics

- **Amendment Request / Publishing Override:** confirmed. Initiation is broadened to all project-creating roles (`qualified`, `ministry_admin1/2`, `admin`, `super_admin`). Adjudication remains `super_admin`-only, per the original assumption — carrying this forward as confirmed. **Worth a quick double-check with dev now that `admin` is confirmed to exist as a distinct ZIDA-console tier:** does `admin` also get day-to-day adjudication authority within their console, or does everything route to `super_admin`? Not raising this to reopen the decision — just flagging it as worth a sanity check given the role model has firmed up since the original assumption was made.
- **NDA:** one-time, at registration, applies to all users platform-wide. Confirmed, no changes.
- **Entitlement layer (field-level toggles):** confirmed not built. No Entitlements page exists anywhere in the Platform Admin console.

---

## H. Dev To-Do List, Prioritized

1. **Phase 0 — Build the Entitlement Management module.** Nothing described as "hidden by default" or "toggle on/off" in this spec can function without it.
2. **Verify or build the Government/Admin creation path** (Section E) — its current build status is unconfirmed; don't assume it matches the investor path's maturity.
3. **Build E2 (Detailed Financial Model) and E3 (Company Financing Capability)** into the investor wizard's Financials & Impact step.
4. **Formalize the `government` role's actual scope** — confirm whether its Ministry of Industry & Commerce affiliation restricts access or is descriptive only.
5. **Confirm "My Team" permission model** for `qualified` investors — individual sub-permissions vs. shared account access.
6. **Extend Amendment Request initiation** to all project-creating roles; keep adjudication scoped to `super_admin` unless dev flags a reason to include `admin`.
7. **Confirm whether Project Publication Status already exists in the data layer**, given the Analytics dashboard already displays it — check before building it as new.
