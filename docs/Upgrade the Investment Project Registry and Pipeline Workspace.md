
---- 

Analyzing the Souvera Intelligence Terminal structure alongside your current **ZIDA Project Registry & Pipeline Workspace**, the proposed blueprint translates extremely well. Souvera’s dual-axis filtering model—where some controls govern **Row Visibility (Entities/Projects)** while others govern **Column Visibility (Sectors/Data Matrices)**—is precisely what an enterprise-grade investment pipeline needs.

Here is a quick evaluation of what was missing from the Souvera analysis when applied to ZIDA, followed by the **Final Engineering Specification Instructions** ready to hand off to your development team.

---

## What Was Missing (ZIDA-Specific Enhancements)

To adapt the Souvera framework to the **ZIDA Platform**, four critical enterprise elements must be integrated:

1. **Capital / Ticket Size Range Filtering (Missing)**: Souvera focuses heavily on trade agreements and macroeconomic scores, whereas ZIDA’s core transaction metric is **Capital Required ($)**. We must include institutional capital tier chips (`< $2M`, `$2M - $10M`, `$10M - $50M`, `$50M+`, and `🟡 Capital Assessment Pending`).
2. **Operational Freshness / Data Room Updates (Missing)**: Investors need a way to filter for deals with recently updated data rooms, new teasers, or quarterly updates (`Past 7 Days`, `Past 30 Days`, `Current Quarter`).
3. **Saved Searches & Intent Capture Triggers (Missing)**: Applying high-intent filters should trigger an inline CTA bar: `[ 💾 Save Search & Set Email Alert ]`. Additionally, filtering by `Capital Assessment Pending` must invoke the **Request Valuation Teaser Modal** for lead capture.
4. **ZIDA Taxonomies (Missing)**: Replacing Souvera's `Trade Frameworks (AGOA/CBTPA)` with ZIDA’s actual governance taxonomy: **Beneficiary Ministry**, **Province / Region**, **Pipeline Type (ZIDA Catalogue vs. Policy Initiative)**, **Strategic Pillar**, and **SDG Alignment**.

---

## Final Developer Implementation Instructions

> **Instructions for Frontend / Full-Stack Engineering Team**
> **Goal:** Upgrade the Investment Project Registry & Pipeline Workspace to implement a reactive, multi-axis filtering system modeled after Souvera, adapted for ZIDA enterprise requirements.

### 1. Updated TypeScript State Definition

Replace or expand the current filter state in the pipeline component with the following structure:

```typescript
export interface ZidaPipelineFilterState {
  // Search & Global
  searchQuery: string;               // Name, ISO, or keyword search
  
  // Geographic & Governance (Row Filters)
  selectedProvinces: string[];        // Harare, Bulawayo, Manicaland, etc.
  selectedMinistries: string[];       // Agriculture, Energy, ICT, etc.
  pipelineType: 'ALL' | 'CATALOGUE' | 'POLICY_INITIATIVE';
  
  // Financial & Capital Scope (Row Filters)
  capitalBracket: 'ALL' | 'MICRO' | 'GROWTH' | 'MIDDLE_MARKET' | 'INFRASTRUCTURE' | 'UNVALUED_PENDING';
  customCapitalRange: {
    min: number | null;
    max: number | null;
  };
  financingTypes: string[];           // PPP/EPC/BOT, Equity, Debt, Blended, TA/Grant
  
  // Freshness & Data Room Signals (Row Filters)
  freshnessPeriod: 'ALL' | 'PAST_7_DAYS' | 'PAST_30_DAYS' | 'CURRENT_QUARTER';
  onlyWithUpdatedDataRoom: boolean;   // Toggle for modified attachments/teasers
  
  // Strategic Alignment (Row Filters)
  strategicPillars: string[];        // Agriculture, Energy, Infrastructure, etc.
  sdgAlignments: number[];            // 1 through 17
  
  // Matrix Column Visibility Controls
  visibleSectorColumns: string[];     // Controls which sector columns display in grid view
}

```

---

### 2. UI Layout Architecture (`PipelineFilterPanel.tsx`)

Render the collapsible filter panel in **3 logical blocks** directly above the pipeline workspace table:

```
+-----------------------------------------------------------------------------------------------------------------------+
| 🔍 Search title, location, ministry...                                         [ 💾 Save Search & Set Alert ]  |
+-----------------------------------------------------------------------------------------------------------------------+
|  BLOCK 1: CAPITAL & FINANCIAL STRUCTURE                                                                              |
|  Capital Bracket:  ( All )  ( < $2M )  ( $2M-$10M )  ( $10M-$50M )  ( $50M+ )  ( 🟡 Assessment Pending )                 |
|  Financing Type:   [ PPP / EPC / BOT ] [ Blended ] [ Equity ] [ Debt ] [ Grant / TA ]                               |
|                                                                                                                       |
|  BLOCK 2: GOVERNANCE, STRATEGY & TAXONOMY                                                                             |
|  Province: [ All Provinces ▼ ]    Ministry: [ All Ministries ▼ ]    Pipeline Type: ( All ) ( ZIDA Catalogue )         |
|  Strategic Pillar: [ Investment Attraction ] [ Industrialization ] [ Agriculture ] [ Energy ] +6 more                 |
|  SDG Badges:       [1] [2] [3] [4] [5] [6] [7] [8] [9] [10] [11] [12] [13] [17]                                         |
|                                                                                                                       |
|  BLOCK 3: FRESHNESS & SECTOR MATRIX TOGGLES                                                                           |
|  Freshness: ( Anytime ) ( Past 7 Days ) ( Past 30 Days ) ( Q3 2026 )    [✓] Recently Updated Data Rooms Only           |
|  Visible Sector Columns: [✓ Agriculture] [✓ Energy] [✓ ICT] [✓ Mining] [✓ Manufacturing]                            |
+-----------------------------------------------------------------------------------------------------------------------+

```

---

### 3. Core Functional Rules & Behavior

1. **Reactive Client-Side & Debounced Server Filtering:**
* Text search should be debounced at `300ms`.
* Dynamic filter updates must filter the grid reactively without full page reloads.


2. **URL Parameter Syncing (State Persistence):**
* Synchronize active filters with browser query params (e.g., `?capital=GROWTH&province=Harare&freshness=PAST_7_DAYS`) to allow shareable filtered links.


3. **Unvalued Project Handling (`UNVALUED_PENDING`):**
* Projects with missing or unannounced valuations must render a yellow status pill: `🟡 Capital Assessment Pending` (or `Valuation Under Structuring`).
* Replacing static empty values, render an action button: `[ 🔔 Request Teaser ]`. Clicking this opens the **Investor Lead Capture Modal** to log investor ticket size interest prior to official project release.


4. **Saved Search Lead Generation:**
* When any combination of 2 or more filters is active, show the inline CTA banner: `[ 💾 Save Search Criteria & Get Email Alerts ]` to log investor mandate preferences into the backend CRM.


--- 

### Here is the updated instruction section for your development team incorporating the **SDG Name Tooltip / Hover State** behavior into the filtering specification:

---

### Updated Instruction for SDG Alignments (Block 2)

In **Block 2: Governance, Strategy & Taxonomy**, update the SDG Alignment UI specification as follows:

```
+-----------------------------------------------------------------------------------------------------------------------+
|  SDG ALIGNMENT HOVER INTERACTION                                                                                     |
|                                                                                                                       |
|  Pill / Badge Controls:                                                                                               |
|  [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 6 ] [ 7 ] [ 8 ] [ 9 ] [ 10 ] [ 11 ] [ 12 ] [ 13 ] [ 14 ] [ 15 ] [ 16 ] [ 17 ]       |
|                                                                                                                       |
|  Hover State Specification:                                                                                           |
|  • Each SDG badge (1–17) must display an accessible tooltip on hover (and long-press on mobile)                      |
|    showing the official SDG name and icon.                                                                           |
|                                                                                                                       |
|  Examples:                                                                                                            |
|  • Hover [ 1 ]:  "SDG 1: No Poverty"                                                                                  |
|  • Hover [ 7 ]:  "SDG 7: Affordable and Clean Energy"                                                                 |
|  • Hover [ 8 ]:  "SDG 8: Decent Work and Economic Growth"                                                            |
|  • Hover [ 9 ]:  "SDG 9: Industry, Innovation and Infrastructure"                                                     |
|  • Hover [ 13 ]: "SDG 13: Climate Action"                                                                             |
+-----------------------------------------------------------------------------------------------------------------------+

```

#### Code Snippet Reference for Developers (React / Radix Tooltip)

```tsx
const SDG_GOALS = [
  { id: 1, name: 'SDG 1: No Poverty' },
  { id: 2, name: 'SDG 2: Zero Hunger' },
  { id: 3, name: 'SDG 3: Good Health and Well-being' },
  { id: 4, name: 'SDG 4: Quality Education' },
  { id: 5, name: 'SDG 5: Gender Equality' },
  { id: 6, name: 'SDG 6: Clean Water and Sanitation' },
  { id: 7, name: 'SDG 7: Affordable and Clean Energy' },
  { id: 8, name: 'SDG 8: Decent Work and Economic Growth' },
  { id: 9, name: 'SDG 9: Industry, Innovation and Infrastructure' },
  { id: 10, name: 'SDG 10: Reduced Inequalities' },
  { id: 11, name: 'SDG 11: Sustainable Cities and Communities' },
  { id: 12, name: 'SDG 12: Responsible Consumption and Production' },
  { id: 13, name: 'SDG 13: Climate Action' },
  { id: 14, name: 'SDG 14: Life Below Water' },
  { id: 15, name: 'SDG 15: Life on Land' },
  { id: 16, name: 'SDG 16: Peace, Justice and Strong Institutions' },
  { id: 17, name: 'SDG 17: Partnerships for the Goals' },
];

// In the Filter Panel Component:
{SDG_GOALS.map((sdg) => (
  <Tooltip key={sdg.id} content={sdg.name}>
    <button
      onClick={() => toggleSdg(sdg.id)}
      className={`sdg-badge ${selectedSdgs.includes(sdg.id) ? 'active' : ''}`}
      aria-label={sdg.name}
    >
      {sdg.id}
    </button>
  </Tooltip>
))}

```