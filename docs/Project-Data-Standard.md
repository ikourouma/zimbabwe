# Project Data Standard v1.0

*Afronovation | Zimbabwe Digital Investment & Economic Intelligence Platform*
*Defines the field set a project must carry to represent a live, investable opportunity on the platform. Written as part of the Project Data Standardisation initiative — see `docs/UAT-Defect-Log.md` DEF-048 onward for the gaps this closes.*

## 1. Why this exists

Before this standard, "what a project needs" was implicit in whatever the ZIDA 2025 Projects deck happened to contain, and the creation wizard could only capture a subset of it. This document is what ZIDA (or any government partner) can be handed and asked "does your data meet this", and it is the definition the platform's own completeness score and publication gate are checked against — see `lib/governance/project-completeness.ts`.

## 2. Two tiers, not one

Every project row carries a `record_standard` value (`lib/db/schema/enums.ts`):

| Tier | Meaning | Held to this standard? |
| --- | --- | --- |
| `catalogue_seed` | One of the 32 projects seeded from the ZIDA 2025 Projects deck (`lib/data/seed-raw.ts`). Carries whatever the deck stated, no more. | No — exempt from the publication gate. Shown with the "Catalogue Seed" badge (`components/projects/record-standard-badge.tsx`) and "pending official validation" language throughout. |
| `full_template` | Every project created through the project wizard from this standard's adoption onward. | Yes — must clear the minimum completeness score below before it can be published. |

A `catalogue_seed` record is not a lesser project; it is data captured before this standard existed, and the badge exists so a reader always knows which tier they are looking at rather than assuming every record was captured the same way.

## 3. The required field set

| # | Field | Column(s) | Notes |
| --- | --- | --- | --- |
| 1 | Title | `title` | |
| 2 | Sector | `sector_id` | Bound to the sector taxonomy |
| 3 | Primary Beneficiary Ministry | `primary_beneficiary_ministry_id` | Bound to the ministry taxonomy |
| 4 | Project Owner | `project_owner` | |
| 5 | Location | `location` | Free text — a site description, not the province |
| 6 | Readiness Level | `project_readiness` | |
| 7 | Opportunity Summary | `opportunity_summary` | One to two sentences for the registry card |
| 8 | Full Description | `description` | |
| 9 | Province | `province`, and `project_provinces` junction | Bound to the ten-province taxonomy (`lib/data/taxonomies.ts`); see §4 |
| 10 | Development Impact | `development_impact` | At least one line item |
| 11 | Capital Required (structured) | `capital_total_usd` | A numeric figure, not a free-text description |
| 12 | At least one return metric | `irr_pct`, `npv_usd`, `roi_pct`, `payback_months`, `projected_revenue_usd`/`projected_revenue_years` | See §5 — one is enough to satisfy the standard, all five where known |
| 13 | Supporting Documents | `project_documents` | At least one attachment |

Fields 1–8 are the pre-existing eight-field submission gate (`REQUIRED_FIELDS` in `lib/governance/project-workflow.ts`) that already blocks `draft -> submitted_for_review`, unchanged by this standard. Fields 9–13 are checked only by the completeness score and the publication gate below, not the submission gate — a project can enter the review queue before every one of them is filled in, but cannot leave it as Published without them (or without being `catalogue_seed`). Province is deliberately in the second group rather than the first: it is now capturable from the wizard's first step, but making it submission-blocking is a separate, harder decision than making it publication-blocking, and this standard only makes the latter call.

## 4. Money and return metrics are numbers, not sentences

Every financial field has a structured numeric counterpart beside the original free-text field (`lib/db/schema/projects.ts`):

| Free text (kept as the source note) | Structured column |
| --- | --- |
| `capital_required` | `capital_total_usd`, `capital_equity_usd`, `capital_debt_usd` |
| `irr` | `irr_pct` |
| `npv` | `npv_usd` |
| `roi` | `roi_pct` |
| `payback_period` | `payback_months` |
| `projected_revenue` | `projected_revenue_usd`, `projected_revenue_years` |

The project wizard (`components/admin/project-wizard.tsx`) writes only the numeric columns — there is no free-text financial input on a `full_template` project. The display layer (`lib/utils/financial-display.ts`) prefers the numeric column and falls back to the free-text field, so a `catalogue_seed` record's original deck wording keeps rendering unchanged. Every aggregate (platform-stats, site-stats, the executive report, the capital bracket filters) reads the numeric columns exclusively — see `scripts/migrate-financial-fields.ts` for the one-time backfill that populated them for the 32 seeded records.

## 5. Province is a taxonomy, not a sentence

`province` stays a free-text display column, but every write also resolves it into the `project_provinces` junction against the ten-province taxonomy (`lib/governance/province-resolver.ts`). A project naming several provinces (e.g. "Mashonaland East / Manicaland / Masvingo") gets one row per province rather than one illegible combined string — filtering (`getUniqueProvinces`/`matchesProvinceFilter` in `lib/entitlements/visibility.ts`) and the executive report's provincial rollup both read the junction. The wizard's Province field is a single-select bound to the same taxonomy, so a newly created project's junction entry is always an exact match with no resolution ambiguity.

## 6. The completeness score

`lib/governance/project-completeness.ts` scores any project against the thirteen fields in §3 and returns:

- a 0–100 score,
- the list of fields still missing, by label, and
- whether the record is exempt from the gate (`catalogue_seed`).

The score is surfaced wherever a reviewer decides whether a project is ready: the Review Queue card, and the project detail drawer's Overview tab (staff view only). It is advisory everywhere it is shown — the only place it blocks anything is the publication gate below.

## 7. The publication gate

`PATCH /api/projects/[id]` refuses an `approved -> published` transition for a `full_template` project scoring below the minimum (currently 70%), returning the missing-fields list in the error so the caller knows exactly what to add. `catalogue_seed` records are always exempt. This is the one place the standard is actually enforced server-side; every other surface (the wizard's own step gating, the score badge) is guidance, not a hard stop, because a project moves through several hands — creator, reviewer, approver — before publication and any of them may have a legitimate reason to advance it with a field still open.

## 8. Three empty states, not one

A missing value on the project detail page's Financial Performance panel now names which situation it is, rather than a single undifferentiated "Not disclosed":

| Situation | Label | When it applies |
| --- | --- | --- |
| Not applicable to this record's tier | "Not stated in source catalogue" | `catalogue_seed` — the deck simply never captured this field |
| A gap in an otherwise-standard record | "Not yet supplied" | `full_template` — the field is expected but not yet filled in |
| Withheld pending entitlement | A blurred/locked placeholder, no text | Any record, for a viewer who has not cleared the qualified-investor gate — see `FinRow`'s `locked` prop in `app/projects/[slug]/page.tsx` |

## 9. What this standard does not cover

- It does not retroactively re-validate the 32 seeded records' figures against ZIDA or Government of Zimbabwe sources — see `docs/data/Zimbabwe_ZIDA_Seed_Projects_v1.0.md`, now marked historical, for that provenance.
- It does not set a minimum for the eight-field submission gate beyond what already existed (province is the one addition) — raising that bar is a separate decision from raising the publication bar.
- It does not cover documents' content or quality, only their presence.
