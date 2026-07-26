# Comprehensive Engineering Instructions & Technical Implementation Plan

This unified document serves as the complete technical instruction set and engineering specification for developing the **ZIDA Platform** to a Fortune 100 enterprise standard. It merges the **Souvera-Inspired Filtering Architecture**, the **5 High-Impact Enhancements**, the **4 Value-Added Operational Modules**, and the **Administrative Role Governance Framework**.

---

## SECTION 1: SOUVERA-INSPIRED PIPELINE & SMART FILTERING SPECIFICATION

### 1. Component Architecture & State Management (`PipelineFilterPanel.tsx`)

The pipeline filter bar must be structured into **3 distinct logical blocks** positioned directly above the project matrix table.

```typescript
export interface ZidaPipelineFilterState {
  // Global & Text Search
  searchQuery: string;               // Keyword search (Title, ISO, Keyword)
  
  // Block 1: Capital & Financial Structure (Row Filters)
  capitalBracket: 'ALL' | 'MICRO' | 'GROWTH' | 'MIDDLE_MARKET' | 'INFRASTRUCTURE' | 'UNVALUED_PENDING';
  customCapitalRange: { min: number | null; max: number | null };
  financingTypes: string[];           // PPP/EPC/BOT, Equity, Debt, Blended, TA/Grant
  
  // Block 2: Governance, Strategic & Taxonomy (Row Filters)
  selectedProvinces: string[];        // Harare, Bulawayo, Manicaland, etc.
  selectedMinistries: string[];       // Agriculture, Energy, ICT, etc.
  pipelineType: 'ALL' | 'CATALOGUE' | 'POLICY_INITIATIVE';
  strategicPillars: string[];        // Investment Attraction, Agriculture, Energy, etc.
  sdgAlignments: number[];            // 1 through 17
  
  // Block 3: Velocity, Data Room Freshness & Sector Column Toggles
  freshnessPeriod: 'ALL' | 'PAST_7_DAYS' | 'PAST_30_DAYS' | 'CURRENT_QUARTER';
  onlyWithUpdatedDataRoom: boolean;   // Filter for deals with modified data rooms/teasers
  visibleSectorColumns: string[];     // Controls column visibility in grid view
}

```

### 2. SDG Hover Tooltip Specification

Each SDG badge button (1–17) in Block 2 must be wrapped in an accessible Tooltip component displaying the full official name:

```
• Hover [ 1 ]:  "SDG 1: No Poverty"
• Hover [ 7 ]:  "SDG 7: Affordable and Clean Energy"
• Hover [ 8 ]:  "SDG 8: Decent Work and Economic Growth"
• Hover [ 9 ]:  "SDG 9: Industry, Innovation and Infrastructure"
• Hover [ 13 ]: "SDG 13: Climate Action"

```

### 3. Handling Unvalued Deals (`UNVALUED_PENDING`) & Lead Capture

* **Table/Card Tag:** Render a yellow pill: `🟡 Capital Assessment Pending` (or `Valuation Under Structuring`).
* **Lead Capture Action:** Render `[ 🔔 Request Valuation Teaser ]`. Clicking invokes an Investor Lead Capture Modal prompting for target ticket size and firm type.
* **Saved Search Intent Capture:** When 2+ filters are active, render an inline CTA banner: `[ 💾 Save Search Criteria & Get Email Alerts ]` to capture investor mandates into the CRM telemetry handler.

---

## SECTION 2: THE 5 HIGH-IMPACT FORTUNE 100 ENHANCEMENTS

### 1. Instant IC Executive Brief Generator (PDF & QR Data Bundle)

* **API Endpoint:** `GET /api/v1/projects/{id}/export-pdf`
* **Functionality:** Generates a dynamically formatted, white-labeled 2-page PDF containing project summary, financial metrics, SDG alignment, ministry contact, and a scannable QR code linking directly back to the project’s secure online Data Room.
* **UI Trigger:** `[ 📄 Generate IC Executive Brief (PDF) ]` button in the Pipeline Workspace.

### 2. Telemetry-Based Investor Intent Scoring

* **Telemetry Handler:** Track user telemetry (filter usage frequency, document previews, VDR downloads, and thread initiations).
* **UI Badge:** Render an **Investor Activity Score** badge (`🔥 High Intent`, `⚡ Active Evaluator`, `Dormant`) in the **Users & Roles Workspace** (`/super-admin/users`).
* **Admin Capability:** Allows Console and Super Admins to filter and prioritize proactive outreach to high-intent investors.

### 3. Communication Hub: Context Cards & In-Thread Call Scheduling

* **Project Context Header:** Sticky header at the top of project-bound threads displaying live deal metrics (`Project Title`, `Capital Range`, `Phase`).
* **Interactive Action Cards:** Support JSON message payloads to insert an inline `[ 📅 Schedule Deal Review Call ]` calendar scheduling card directly into the chat thread.

### 4. Multi-Tenant Entity & Delegated Team Management

* **Data Model:** Support **Entity / Organization Profiles** in the Account Workspace.
* **Delegated Roles:** Allow primary `Qualified Investor` accounts to invite team members with granular sub-permissions (e.g., *Analyst: Read-Only VDR Access* vs. *Partner: MOU Signing Rights*).

### 5. Dynamic Data Room Watermarking & Leak Prevention

* **Watermark Overlay:** Dynamically overlay a light, secure canvas watermark across all document previews in the Virtual Data Room and Communication Hub.
* **Watermark Payload:** `{User Email} | {IP Address} | {Timestamp} | Confidential ZIDA Property`.

---

## SECTION 3: THE 4 HIGH-VALUE OPERATIONAL MODULES

### Module 1: Investor Virtual Data Room (VDR) & Compliance Vault

* **Access Hierarchy:** Tier 1 (Public Teaser), Tier 2 (Confidential Financial Models), Tier 3 (Legal & MOU Drafts).
* **Gating:** Enforce automated digital NDA execution before unlocking Tier 2/3 folders.
* **Analytics:** Log page-by-page viewing duration, downloads, and prints to feed the Investor Intent Scoring engine.

### Module 2: Institutional Deal Desk & MOU Execution Engine

* **LOI / MOU Generator:** Template engine pre-populating digital Letters of Intent and MOUs with live deal metadata.
* **In-App E-Signature:** Native integration (DocuSign / Adobe Sign API) for executing agreements within the portal.
* **Milestone Tracking:** Post-execution dashboard monitoring regulatory approvals, licensing steps, and capital drawdown timelines.

### Module 3: Ministry Deal Preparation & Project Intake Portal

* **Guided Intake Wizard:** Multi-step submission builder prompting Ministry Leads for mandatory feasibility parameters (ROI, land tenure, infrastructure proximity).
* **Valuation Routing:** Automatically flag unvalued submissions as `🟡 Capital Assessment Pending` and route them to ZIDA financial analysts prior to public publishing.

### Module 4: Macroeconomic & Trade Analytics Intelligence Terminal

* **Incentives Calculator:** Interactive tool estimating tax holidays, duty exemptions, and capital repatriation terms based on sector and province.
* **Infrastructure Matrix:** Spatial indicators covering power grid access, transport corridors, and regional trade preference eligibility.

---

## SECTION 4: ADMINISTRATIVE ROLE GOVERNANCE MATRIX

Both **Console Admin (ZIDA Admin)** and **Super Admin** govern platform operations. Their respective operational boundaries across all modules are defined below:

| Module / Platform Area | Console Admin (`ZIDA Admin`) | Super Admin (`Super Admin`) |
| --- | --- | --- |
| **User & Account Governance (`/super-admin/users`)** | Full operational authority to invite, edit, and provision accounts up to Console Admin. Manage statuses (Active/Suspended) and reset credentials. | Inherits all Console Admin rights PLUS site-wide governance overrides—including assigning, promoting, or revoking Super Admin roles and accessing global audit logs. |
| **Communication Hub Architecture** | Access to start broadcasts, initiate 1:1 messages with any user/investor, and respond via General Concierge and Relationship Desk. | Full operational access PLUS inspection, reassignment, and archiving rights over any thread for compliance and auditing. |
| **Pipeline & Project Management** | Full project creation (`[ + Create Project ]`), editing, and data room upload entitlements. | Full operational capabilities PLUS direct publishing override authority to publish/unpublish deals to the public registry. |
| **Account & Security Settings** | Governed by universal RBAC security suite (MFA, session revocation, security logs). | Universal RBAC governance with platform-wide security configuration overrides. |

---

## SECTION 5: MASTER RBAC & ENTITLEMENT MATRIX

| Feature / Module | Registered Prospect | Qualified Investor | Ministry Lead | Console Admin | Super Admin |
| --- | --- | --- | --- | --- | --- |
| **Smart Pipeline Filters & Tooltips** | Full Access | Full Access | Full Access | Full Access | Full Access |
| **Request Valuation Teaser (`Unvalued`)** | Initiates Upgrade | Full Access | N/A | Manage Queue | Manage Queue |
| **VDR Tier 1 (Public Teaser)** | Full Access | Full Access | Owner | Full Access | Full Access |
| **VDR Tier 2/3 (Confidential / NDA)** | Restricted | NDA Gated | Owner | Full Access | Full Access |
| **MOU E-Signature Engine** | Restricted | Signatory | Signatory | Facilitator | Full Override |
| **Ministry Intake Wizard** | Restricted | Restricted | Primary User | Reviewer | Full Override |
| **User Provisioning & Intent Telemetry** | Restricted | Entity Level | Restricted | Full Access | Full Access & Overrides |
| **Publishing Override** | Restricted | Restricted | Restricted | Standard Review | Direct Override |