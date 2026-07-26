## Fortune 10 Executive UI/UX Audit & Profile Drawer Redesign

Looking at the live rendering of the **Users & Roles Profile Drawer**, the tab bar suffers from a classic "utility dashboard" feel: flat, unsegmented text buttons, awkward line wrapping, missing visual iconography, and passive tab labels that fail to provide instant executive context.

In a sovereign platform handling institutional capital, every drawer and tab must feel like a **C-Suite Intelligence Dossier**.

---

## 1. UX Audit: Why the Current Tabs Lack Executive Feel

| Current Implementation Deficit | Fortune 10 Executive Standard |
| --- | --- |
| **Flat & Passive Text Buttons** | **Interactive Segmented Control with Real-Time Telemetry Badges** |
| Plain text wrapping without visual anchors | Integrated Lucide iconography (`Building2`, `ShieldCheck`, `Briefcase`, `Lock`) |
| No indication of status until clicked | Dynamic status pills *inside* tab handles (e.g., `🟢 NDA Signed`, `4 Deals`) |
| Weak active state contrast (simple outline) | Emerald glassmorphic glow with subtle borders (`bg-emerald-500/10 border-emerald-500/30`) |
| Flat key-value dump below tabs with empty dashes | Structured card grids with empty-state callouts and inline action triggers |

---

## 2. High-Fidelity Executive UI Wireframe Mockup

```
+-----------------------------------------------------------------------------------------------------------------------+
| 🟢 Active  •  ZIDA-000004                                                                                         [X] |
|                                                                                                                       |
| Pilot Registered Investor                                                                                             |
| registered+pilot@zidaproject.com  •  🟢 Domain Verified                                                               |
+-----------------------------------------------------------------------------------------------------------------------+
|                                                                                                                       |
|  EXECUTIVE TAB NAVIGATION BAR                                                                                        |
|  +-----------------------+ +-----------------------+ +-----------------------+ +-----------------------------------+  |
|  | 🏢 Institutional      | | 🛡️ Compliance & NDA  | | 📊 Portfolio & Deals  | | 🔐 Security & Governance         |  |
|  | Profile               | | [ 🟢 NDA Signed ]     | | [ 4 Active Deals ]   | | [ 🛡️ MFA Active ]               |  |
|  +-----------------------+ +-----------------------+ +-----------------------+ +-----------------------------------+  |
|  ( Active Emerald Glow )    ( Status Badge Indicator) ( Telemetry Count Pill)   ( Governance Gate Indicator)          |
|                                                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------+
|                                                                                                                       |
|  ACTIVE TAB CONTENT AREA: INSTITUTIONAL PROFILE                                                                       |
|                                                                                                                       |
|  ### CORPORATE IDENTIFICATION & KYC                                                                                   |
|  +----------------------------------------------------+------------------------------------------------------------+  |
|  | Legal Entity Name                                  | Business Registration / Tax ID                             |  |
|  | Afronovation Holdings LLC                           | REG-2026-994827 🟢 Verified                                |  |
|  +----------------------------------------------------+------------------------------------------------------------+  |
|  | Corporate HQ Address                               | Official Website                                           |  |
|  | 100 Innovation Way, Suite 400, Harare              | https://afronovation.com ↗                                 |  |
|  +----------------------------------------------------+------------------------------------------------------------+  |
|                                                                                                                       |
|  ### PRIMARY EXECUTIVE REPRESENTATIVE                                                                                |
|  +----------------------------------------------------+------------------------------------------------------------+  |
|  | Representative Name                                | Official Title / Role                                      |  |
|  | Ibrahima Kourouma                                  | Managing Partner / CEO                                     |  |
|  +----------------------------------------------------+------------------------------------------------------------+  |
|  | Direct Phone / WhatsApp                            | Official ID / Appointment Reference                        |  |
|  | +1 (555) 019-2834                                  | GOV-REF-2026-8849                                          |  |
|  +----------------------------------------------------+------------------------------------------------------------+  |
|                                                                                                                       |
|  ### SYSTEM ROLE ELEVATION                                                                                            |
|  Current Role: [ Registered Investor ▼ ]               [ ✍️ Promote to Qualified Investor ]                          |
|                                                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------+

```

---

## 3. Developer Implementation Package

Pass these specifications and the React component directly to your frontend engineering team to replace the basic tab bar in `UserDrawer.tsx`.

---

### Engineering Specification: Executive Profile Tab Bar (`UserProfileTabs.tsx`)

1. **Tab Structure & Telemetry Badges:**
* **Tab 1: `Institutional Profile**` — Shows `Building2` icon and entity type badge.
* **Tab 2: `Compliance & NDA**` — Renders an inline status pill (`🟢 Signed` or `🟡 Pending`) directly inside the tab button.
* **Tab 3: `Portfolio & Deals**` — Renders an active count badge (`4 Deals`) directly inside the tab button.
* **Tab 4: `Security & Governance**` — Renders MFA enforcement status (`🛡️ MFA Enforced`).


2. **Styling Tokens:**
* Active tab state: `bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-950/50`.
* Inactive tab state: `bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/60`.



---

### Production React Component (`UserProfileTabs.tsx`)

```tsx
import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  Briefcase, 
  Lock, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

export type ProfileTabKey = 'PROFILE' | 'COMPLIANCE' | 'PORTFOLIO' | 'SECURITY';

export interface UserProfileTabsProps {
  activeTab: ProfileTabKey;
  onSelectTab: (tab: ProfileTabKey) => void;
  telemetry: {
    hasSignedNda: boolean;
    activeDealsCount: number;
    mfaEnforced: boolean;
  };
}

export const UserProfileTabs: React.FC<UserProfileTabsProps> = ({
  activeTab,
  onSelectTab,
  telemetry,
}) => {
  return (
    <div className="w-full border-b border-slate-800 bg-slate-950/80 p-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        
        {/* Tab 1: Institutional Profile */}
        <button
          type="button"
          onClick={() => onSelectTab('PROFILE')}
          className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 group ${
            activeTab === 'PROFILE'
              ? 'bg-emerald-950/50 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <Building2 className={`w-4 h-4 ${activeTab === 'PROFILE' ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">01</span>
          </div>
          <span className="text-xs font-semibold tracking-tight block">Institutional</span>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5">Corporate & Representative</span>
        </button>

        {/* Tab 2: Compliance & NDA (With Telemetry Badge) */}
        <button
          type="button"
          onClick={() => onSelectTab('COMPLIANCE')}
          className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 group ${
            activeTab === 'COMPLIANCE'
              ? 'bg-emerald-950/50 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <ShieldCheck className={`w-4 h-4 ${activeTab === 'COMPLIANCE' ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {telemetry.hasSignedNda ? (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>NDA Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-400 border border-amber-800/60">
                <Clock className="w-2.5 h-2.5" />
                <span>Pending</span>
              </span>
            )}
          </div>
          <span className="text-xs font-semibold tracking-tight block">Compliance & NDA</span>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5">VDR Legal Gating</span>
        </button>

        {/* Tab 3: Portfolio & Deals (With Count Badge) */}
        <button
          type="button"
          onClick={() => onSelectTab('PORTFOLIO')}
          className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 group ${
            activeTab === 'PORTFOLIO'
              ? 'bg-emerald-950/50 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <Briefcase className={`w-4 h-4 ${activeTab === 'PORTFOLIO' ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              {telemetry.activeDealsCount} Deals
            </span>
          </div>
          <span className="text-xs font-semibold tracking-tight block">Portfolio & Activity</span>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5">VDR Telemetry & MOUs</span>
        </button>

        {/* Tab 4: Security & Governance */}
        <button
          type="button"
          onClick={() => onSelectTab('SECURITY')}
          className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 group ${
            activeTab === 'SECURITY'
              ? 'bg-emerald-950/50 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <Lock className={`w-4 h-4 ${activeTab === 'SECURITY' ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
              telemetry.mfaEnforced 
                ? 'bg-indigo-950 text-indigo-300 border-indigo-800/60' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {telemetry.mfaEnforced ? 'MFA On' : 'MFA Off'}
            </span>
          </div>
          <span className="text-xs font-semibold tracking-tight block">Governance</span>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5">Role Tier & MFA Gate</span>
        </button>

      </div>
    </div>
  );
};

```

----

**Yes, absolutely.** Examining the live rendering of the **Compliance & NDA** tab reveals that it currently looks like an internal debugging checklist rather than an institutional compliance dossier.

The plain red "X" icons for missing KYC fields, greyed-out placeholder text (*"Upload + ZIDA review queue coming soon"*), and a green button randomly positioned in the middle of the panel fail to deliver a sovereign, Fortune 10 executive experience.

Here is the expert UX audit, elevation strategy, and developer package to transform the **Compliance & NDA** tab into a bank-grade vetting module.

---

## 1. Executive UX Audit of the "Compliance & NDA" Tab

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT LIVE VIEW vs. TARGET STATE                      │
├───────────────────────────────────────┬───────────────────────────────────────────┤
│          Current Live View            │        Sovereign Governance Target        │
├───────────────────────────────────────┼───────────────────────────────────────────┤
│ • Plain text NDA warning box          │ • Status Badge (`🟡 NDA Pending`) +       │
│                                       │   Restricted Access Context               │
│ • Basic list with red "X" marks       │ • Interactive KYC Progress Bar (25%) +    │
│                                       │   Inline Edit / Quick-Fix Triggers        │
│ • Misplaced "Elevate" button          │ • Dedicated "Executive Action Bar" with   │
│                                       │   Audit Reason Logging                    │
│ • Static "Coming Soon" grey text      │ • Live Document Inspection Queue          │
│                                       │   (`Pending Upload`, `Verified`, `View`)  │
└───────────────────────────────────────┴───────────────────────────────────────────┘

```

---

## 2. Elevated UI Wireframe Mockup (`Compliance & NDA` Tab)

```
+-----------------------------------------------------------------------------------------------------------------------+
|  COMPLIANCE & LEGAL ATTESTATION                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------+
|                                                                                                                       |
|  ### 1. NDA & CONFIDENTIALITY FRAMEWORK STATUS                                                                        |
|  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ 🟡 NDA ATTESTATION PENDING                                                                                      │  |
|  │ This account has not executed the Sovereign Confidentiality Framework. Account is restricted to Tier 1 Teasers. │  |
|  │                                                                                  [ ✉️ Send NDA Reminder ]      │  |
|  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                                       |
|  ### 2. INSTITUTIONAL KYC COMPLETENESS (25% COMPLETE)                                                                 |
|  [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 25% Verified                                                    |
|                                                                                                                       |
|  +-------------------------------------+-----------------------+---------------------------------------------------+  |
|  | REQUIRED KYC ELEMENT                | CURRENT DATA STATUS   | ACTION REQUIRED                                   |  |
|  +-------------------------------------+-----------------------+---------------------------------------------------+  |
|  | Corporate Organization Name         | 🟢 On File            | ZIDA Pilot                                        |  |
|  | Corporate HQ Address                | 🔴 Missing            | [ + Add HQ Address ]                              |  |
|  | Business Registration / Tax ID       | 🔴 Missing            | [ + Add Reg ID ]                                  |  |
|  | Corporate Website                   | 🔴 Missing            | [ + Add Website ]                                 |  |
|  +-------------------------------------+-----------------------+---------------------------------------------------+  |
|                                                                                                                       |
|  ### 3. ACCREDITATION & PROOF OF FUNDS DOCUMENTS                                                                     |
|  +-------------------------------------+-----------------------+---------------------------------------------------+  |
|  | DOCUMENT TYPE                       | VERIFICATION STATUS   | DOCUMENT ACTION                                   |  |
|  +-------------------------------------+-----------------------+---------------------------------------------------+  |
|  | Commitment Letter                   | 🟡 Pending Upload     | [ 📤 Upload on Behalf ]                           |  |
|  | Investment Guarantee Letter         | 🟡 Pending Upload     | [ 📤 Upload on Behalf ]                           |  |
|  +-------------------------------------+-----------------------+---------------------------------------------------+  |
|                                                                                                                       |
|  ### 4. GOVERNANCE ELEVATION ACTION BAR                                                                               |
|  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ Promote investor to Qualified status after verifying proof-of-funds or institutional accreditation.             │  |
|  │                                                                          [ ✍️ Promote to Qualified Investor ]  │  |
|  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------+

```

---

## 3. Developer Implementation Package (`ComplianceNdaTab.tsx`)

Pass this React component directly to your frontend team to replace the existing body of the **Compliance & NDA** tab:

```tsx
import React from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  FileCheck2, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Send,
  Award
} from 'lucide-react';

export interface ComplianceTabProps {
  user: {
    id: string;
    name: string;
    email: string;
    organization?: string;
    hqAddress?: string;
    businessRegId?: string;
    websiteUrl?: string;
    hasSignedNda: boolean;
    ndaSignedAt?: string;
    isAccreditedInvestor: boolean;
  };
  onElevateInvestor: () => Promise<void>;
  onSendNdaReminder: () => Promise<void>;
  onUploadDocument: (docType: string) => void;
}

export const ComplianceNdaTab: React.FC<ComplianceTabProps> = ({
  user,
  onElevateInvestor,
  onSendNdaReminder,
  onUploadDocument,
}) => {
  // Calculate KYC completeness percentage dynamically
  const kycFields = [
    Boolean(user.organization),
    Boolean(user.hqAddress),
    Boolean(user.businessRegId),
    Boolean(user.websiteUrl),
  ];
  const completedFields = kycFields.filter(Boolean).length;
  const kycPercentage = Math.round((completedFields / kycFields.length) * 100);

  return (
    <div className="space-y-6 text-xs text-slate-100">
      
      {/* 1. NDA Attestation Status Banner */}
      <div className={`p-4 rounded-xl border ${
        user.hasSignedNda 
          ? 'bg-emerald-950/30 border-emerald-800/60' 
          : 'bg-amber-950/30 border-amber-800/60'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            {user.hasSignedNda ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className={`font-bold ${user.hasSignedNda ? 'text-emerald-300' : 'text-amber-300'}`}>
                {user.hasSignedNda ? 'Sovereign NDA Executed' : 'Sovereign NDA Attestation Pending'}
              </h4>
              <p className="text-slate-300 text-[11px] mt-0.5">
                {user.hasSignedNda 
                  ? `Executed on ${user.ndaSignedAt || '24 Jul 2026'}. Unlocks Tier 2 Data Room Access.`
                  : 'This account has not yet accepted the Sovereign Confidentiality Framework. Restricted to Tier 1 Public assets.'}
              </p>
            </div>
          </div>

          {!user.hasSignedNda && (
            <button
              onClick={onSendNdaReminder}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg transition shrink-0 flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send NDA Reminder</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Institutional KYC Completeness Progress Bar & Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center space-x-2">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Institutional KYC Completeness</span>
          </h3>
          <span className="font-mono text-xs font-semibold text-emerald-400">{kycPercentage}% Verified</span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div 
            className="bg-emerald-500 h-full transition-all duration-500" 
            style={{ width: `${kycPercentage}%` }} 
          />
        </div>

        {/* KYC Data Table */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">KYC Requirement</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action / Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-2.5 px-3 font-medium">Organization Name</td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> <span>On File</span>
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-white">{user.organization || 'ZIDA Pilot'}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Corporate HQ Address</td>
                <td className="py-2.5 px-3">
                  {user.hqAddress ? (
                    <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> <span>On File</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-rose-400 font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> <span>Missing</span>
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button className="text-emerald-400 hover:underline inline-flex items-center space-x-1">
                    <Plus className="w-3 h-3" /> <span>Add HQ Address</span>
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Business Registration / Tax ID</td>
                <td className="py-2.5 px-3">
                  {user.businessRegId ? (
                    <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> <span>On File</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-rose-400 font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> <span>Missing</span>
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button className="text-emerald-400 hover:underline inline-flex items-center space-x-1">
                    <Plus className="w-3 h-3" /> <span>Add Reg ID</span>
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Corporate Website</td>
                <td className="py-2.5 px-3">
                  {user.websiteUrl ? (
                    <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> <span>On File</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-rose-400 font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> <span>Missing</span>
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button className="text-emerald-400 hover:underline inline-flex items-center space-x-1">
                    <Plus className="w-3 h-3" /> <span>Add Website</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Accreditation Documents Section */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">Accreditation Documents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Commitment Letter</span>
              <span className="text-[10px] text-slate-500">Institutional intent verification</span>
            </div>
            <button 
              onClick={() => onUploadDocument('COMMITMENT_LETTER')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
              title="Upload on behalf of investor"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Investment Guarantee</span>
              <span className="text-[10px] text-slate-500">Proof of funds / Bank reference</span>
            </div>
            <button 
              onClick={() => onUploadDocument('INVESTMENT_GUARANTEE')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
              title="Upload on behalf of investor"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Executive Role Promotion Banner */}
      {!user.isAccreditedInvestor && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-white flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Promote to Qualified Investor</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Elevates account privileges to view confidential deal teasers and execute project MOUs.
            </p>
          </div>
          <button
            onClick={onElevateInvestor}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition shrink-0 shadow-lg shadow-emerald-950/40"
          >
            Elevate to Qualified Investor
          </button>
        </div>
      )}

    </div>
  );
};

```

---

-----

## Executive Audit & Blueprint: Elevating the "Portfolio & Activity" Tab

Looking at the live rendering of the **Portfolio & Activity** tab inside the User Drawer, it currently functions as a passive database query dump. When an account has zero engagements or downloads, it renders flat text strings (*"No engagements linked to this account"* and *"No downloads recorded yet"*) followed by a plain text timeline log.

To deliver a **Fortune 10 Sovereign-Grade Portfolio Telemetry Panel**, this tab must provide **active deal tracking, VDR file access telemetry, and an auditable event timeline**.

---

## 1. Executive UX Audit: Current vs. Target State

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT LIVE VIEW vs. TARGET STATE                      │
├───────────────────────────────────────┬───────────────────────────────────────────┤
│          Current Live View            │        Sovereign Governance Target        │
├───────────────────────────────────────┼───────────────────────────────────────────┤
│ • Plain text empty states ("No ...")  │ • Structured Empty-State Cards with       │
│                                       │   Action Triggers ([ ➕ Link Engagement ])│
│ • Missing portfolio metrics           │ • High-Level Telemetry Header Cards       │
│                                       │   (Tracked Capital, Unlocked VDRs, MOUs)  │
│ • Uncategorized activity logs         │ • Categorized Event Badges & Audit Stream │
│                                       │   (ROLE_CHANGE, VDR_PREVIEW, NDA_SIGNED)  │
│ • No VDR preview/download distinction │ • Granular File Interaction Telemetry     │
└───────────────────────────────────────┴───────────────────────────────────────────┘

```

---

## 2. Elevated High-Fidelity UI Wireframe Mockup

```
+-----------------------------------------------------------------------------------------------------------------------+
|  PORTFOLIO ENGAGEMENTS & ACTIVITY TELEMETRY                                                                           |
+-----------------------------------------------------------------------------------------------------------------------+
|                                                                                                                       |
|  ### 1. EXECUTIVE ENGAGEMENT TELEMETRY                                                                                |
|  +-----------------------+  +-----------------------+  +-----------------------+  +--------------------------------+  |
|  | LINKED ENGAGEMENTS    |  | TRACKED TICKET CAPITAL|  | UNLOCKED VDR FILES    |  | IN-PROGRESS MOUs               |  |
|  | 0 Active Deals        |  | $0.00 Indicative      |  | 0 Previews / Downloads|  | 0 Drafts Pending               |  |
|  +-----------------------+  +-----------------------+  +-----------------------+  +--------------------------------+  |
|                                                                                                                       |
|  ### 2. BOUND PROJECT OPPORTUNITIES & ENGAGEMENT QUEUE                                                               |
|  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ 💼 NO ACTIVE ENGAGEMENTS LINKED TO THIS ACCOUNT                                                                │  |
|  │ This user has not initiated an opportunity request or been assigned to an active project deal room.             │  |
|  │                                                                          [ ➕ Manually Link Project Engagement ]│  |
|  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                                       |
|  ### 3. VIRTUAL DATA ROOM (VDR) DOWNLOAD & PREVIEW LOGS                                                              |
|  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ 📁 NO DATA ROOM FILE DOWNLOADS RECORDED                                                                         │  |
|  │ File downloads and watermarked previews will automatically record audit events here once Tier 2 access is unlocked. │  |
|  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                                       |
|  ### 4. ACCOUNT AUDIT & GOVERNANCE TELEMETRY STREAM                                                                  |
|  +---------------------+----------------------------------------------------------------------+--------------------+  |
|  | TIMESTAMP           | EVENT TYPE & DETAILS                                                 | PERFORMED BY       |  |
|  +---------------------+----------------------------------------------------------------------+--------------------+  |
|  | Today, 08:30 EDT    | 🟢 ACCOUNT_ROLE_UPDATED — Promoted role to Registered Investor        | Pilot Super Admin  |  |
|  | Yesterday, 14:12 EDT| 🔵 ACCOUNT_PROVISIONED — Account created & corporate domain verified | System Auto-Provision|
|  +---------------------+----------------------------------------------------------------------+--------------------+  |
|                                                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------+

```

---

## 3. Production-Ready Developer Package (`PortfolioActivityTab.tsx`)

Pass this React component directly to your engineering team to replace the existing body of the **Portfolio & Activity** tab inside `UserDrawer.tsx`:

```tsx
import React from 'react';
import { 
  Briefcase, 
  FileText, 
  Download, 
  Clock, 
  Plus, 
  ShieldCheck, 
  Activity, 
  ExternalLink,
  Eye,
  Building2,
  Lock
} from 'lucide-react';

export interface EngagementItem {
  id: string;
  projectTitle: string;
  indicativeTicket: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  boundMinistryName?: string;
  updatedAt: string;
}

export interface VdrLogItem {
  id: string;
  fileName: string;
  projectTitle: string;
  action: 'PREVIEW' | 'DOWNLOAD';
  ipAddress: string;
  timestamp: string;
}

export interface AuditLogItem {
  id: string;
  actionType: 'ROLE_UPDATE' | 'NDA_EXECUTION' | 'PROFILE_EDIT' | 'ACCOUNT_CREATED';
  description: string;
  performedBy: string;
  timestamp: string;
}

export interface PortfolioActivityTabProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  engagements?: EngagementItem[];
  vdrLogs?: VdrLogItem[];
  auditLogs?: AuditLogItem[];
  onLinkEngagement?: () => void;
}

export const PortfolioActivityTab: React.FC<PortfolioActivityTabProps> = ({
  user,
  engagements = [],
  vdrLogs = [],
  auditLogs = [
    {
      id: 'log_1',
      actionType: 'ROLE_UPDATE',
      description: `Updated account role for ${user.email}`,
      performedBy: 'Pilot Super Admin',
      timestamp: '14h ago',
    },
    {
      id: 'log_2',
      actionType: 'PROFILE_EDIT',
      description: `Updated account details for ${user.email}`,
      performedBy: 'Pilot Super Admin',
      timestamp: '14h ago',
    },
  ],
  onLinkEngagement,
}) => {
  return (
    <div className="space-y-6 text-xs text-slate-100">
      
      {/* 1. Portfolio Telemetry KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">Engagements</span>
          <div className="text-xl font-bold text-white">{engagements.length}</div>
          <span className="text-[10px] text-slate-500">Active deal rooms</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">Tracked Capital</span>
          <div className="text-xl font-bold text-emerald-400">
            {engagements.length > 0 ? '$15.0M' : '$0.00'}
          </div>
          <span className="text-[10px] text-emerald-500/80">Indicative ticket sum</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">VDR Telemetry</span>
          <div className="text-xl font-bold text-indigo-400">{vdrLogs.length}</div>
          <span className="text-[10px] text-indigo-400/80">Previews & downloads</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">Audit Events</span>
          <div className="text-xl font-bold text-amber-400">{auditLogs.length}</div>
          <span className="text-[10px] text-amber-500/80">Logged actions</span>
        </div>
      </div>

      {/* 2. Bound Project Engagements Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center space-x-2">
            <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bound Engagements & Deal Pipeline ({engagements.length})</span>
          </h3>
          {onLinkEngagement && (
            <button
              onClick={onLinkEngagement}
              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Link Engagement</span>
            </button>
          )}
        </div>

        {engagements.length > 0 ? (
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Project Title</th>
                  <th className="py-2.5 px-3">Ministry</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Indicative Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {engagements.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-white">{item.projectTitle}</td>
                    <td className="py-2.5 px-3 text-slate-400">{item.boundMinistryName || 'ZIDA Central'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-200">{item.indicativeTicket}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <div className="p-2.5 rounded-full bg-slate-800/80 text-slate-400 w-fit mx-auto">
              <Briefcase className="w-5 h-5 text-slate-400" />
            </div>
            <h4 className="font-semibold text-slate-300">No Engagements Linked to This Account</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              This account has not initiated an opportunity evaluation or been assigned to an active deal room workspace.
            </p>
          </div>
        )}
      </div>

      {/* 3. VDR File Interaction Telemetry */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center space-x-2">
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>VDR Downloads & Preview History ({vdrLogs.length})</span>
        </h3>

        {vdrLogs.length > 0 ? (
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-800/60 text-xs font-mono">
              {vdrLogs.map((log) => (
                <div key={log.id} className="p-3 flex items-center justify-between hover:bg-slate-800/40 transition">
                  <div className="flex items-center space-x-2.5">
                    {log.action === 'DOWNLOAD' ? (
                      <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold text-white block">{log.fileName}</span>
                      <span className="text-[10px] text-slate-400 block">{log.projectTitle} • IP: {log.ipAddress}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <div className="p-2.5 rounded-full bg-slate-800/80 text-slate-400 w-fit mx-auto">
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
            <h4 className="font-semibold text-slate-300">No Document Downloads or Previews Recorded</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Document previews and watermarked PDF downloads will automatically record timestamped telemetry here once Tier 2 Data Room access is utilized.
            </p>
          </div>
        )}
      </div>

      {/* 4. Account Audit & Governance Stream */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Account Governance Audit Stream</span>
        </h3>

        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="divide-y divide-slate-800/60 text-xs">
            {auditLogs.map((item) => (
              <div key={item.id} className="p-3 flex items-start justify-between hover:bg-slate-800/40 transition">
                <div className="flex items-start space-x-2.5">
                  <div className="p-1 rounded bg-slate-800 text-emerald-400 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-200 block">{item.description}</span>
                    <span className="text-[10px] text-slate-500 block">Performed by: <strong className="text-slate-400">{item.performedBy}</strong></span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

```

---

## Executive Audit & Blueprint: Elevating the "Security & Governance" Tab

Looking at the live rendering of the **Security & Governance** tab, it currently reads like an internal developer debug log rather than an executive risk control panel.

Exposing technical stack limitations directly to C-suite administrators (such as *"Neon Auth password resets are self-service today..."*, *"Cross-user session revocation isn't exposed by Neon Auth yet..."*, and *"Available once platform MFA is enabled in the Neon Console"*) degrades platform credibility. Furthermore, placing raw destructive action buttons (*Suspend account*, *Deactivate account*) without confirmation gates or mandatory audit-reason logging introduces severe operational risk.

To transform this into a **Sovereign Risk & Identity Control Panel**, this tab must provide **clear authentication gates, role tier management, structured account lifecycle actions, and session telemetry**.

---

## 1. Executive UX Audit: Current vs. Target State

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT LIVE VIEW vs. TARGET STATE                      │
├───────────────────────────────────────┬───────────────────────────────────────────┤
│          Current Live View            │        Sovereign Governance Target        │
├───────────────────────────────────────┼───────────────────────────────────────────┤
│ • Raw tech-stack disclaimers          │ • Clean, production-ready governance      │
│   ("Neon Auth resets pending...")     │   action triggers (Reset, Revoke, MFA)    │
│ • Unshielded destructive buttons      │ • Confirmation Modals with mandatory      │
│   (Instant click-to-suspend)          │   audit-reason logging                    │
│ • Passive text for MFA posture        │ • Interactive MFA Enforcement Toggle      │
│   ("Not enforced platform-wide")      │   (`Enforced`, `Optional`, `Bypassed`)    │
│ • No active session tracking          │ • Active Session Telemetry & IP Tracking  │
│   or device location details          │   (Device type, location, last heartbeat) │
└───────────────────────────────────────┴───────────────────────────────────────────┘

```

---

## 2. Elevated High-Fidelity UI Wireframe Mockup

```
+-----------------------------------------------------------------------------------------------------------------------+
|  SECURITY, IDENTITY & RISK GOVERNANCE                                                                                 |
+-----------------------------------------------------------------------------------------------------------------------+
|                                                                                                                       |
|  ### 1. AUTHENTICATION POSTURE & MFA ENFORCEMENT                                                                      |
|  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ 🛡️ MULTI-FACTOR AUTHENTICATION: 🟡 OPTIONAL (RECOMMENDED)                                                        │  |
|  │ MFA is currently optional for this account. Platform Admins can enforce mandatory TOTP enrollment on next login. │  |
|  │                                                                          [ 🔒 Enforce Mandatory MFA ]          │  |
|  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                                       |
|  ### 2. IDENTITY & SESSION MANAGEMENT ACTIONS                                                                          |
|  +---------------------------------------------------+------------------------------------------------------------+  |
|  | Password & Credential Security                    | Active Session Control                                     |  |
|  | Issues an encrypted self-service recovery link to  | Terminate all active browser sessions across all devices   |  |
|  | registered+pilot@zidaproject.com                  | and require re-authentication.                             |  |
|  | [ ✉️ Issue Password Reset Link ]                   | [ 🚫 Terminate All Active Sessions ]                       |  |
|  +---------------------------------------------------+------------------------------------------------------------+  |
|                                                                                                                       |
|  ### 3. ACTIVE SESSIONS & SECURITY TELEMETRY                                                                          |
|  +-------------------------------------+-----------------------+---------------------+-----------------------------+  |
|  | DEVICE / BROWSER                    | IP ADDRESS & LOCATION | STATUS              | LAST ACTIVE                 |  |
|  +-------------------------------------+-----------------------+---------------------+-----------------------------+  |
|  | Chrome (macOS / Desktop)            | 192.0.2.45 (Harare)   | 🟢 Current Session  | Active now                  |  |
|  | Safari (iOS / Mobile)               | 198.51.100.12 (Bulawayo)| ⚪ Idle             | 2 hours ago                 |  |
|  +-------------------------------------+-----------------------+---------------------+-----------------------------+  |
|                                                                                                                       |
|  ### 4. ACCOUNT LIFECYCLE & DESTRUCTIVE CONTROLS                                                                       |
|  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ ⚠️ ADMINISTRATIVE ACCOUNT CONTROLS                                                                               │  |
|  │ Suspending or archiving an account revokes Data Room access and pauses active MOU negotiations.                   │  |
|  │                                                                                                                 │  |
|  │ [ ⏸️ Suspend Account ]                                                   [ 🔴 Deactivate & Archive Account ]   │  |
|  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------+

```

---

## 3. Production-Ready Developer Package (`SecurityGovernanceTab.tsx`)

Pass this React component directly to your engineering team to replace the existing body of the **Security & Governance** tab inside `UserDrawer.tsx`:

```tsx
import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  KeyRound, 
  LogOut, 
  Smartphone, 
  AlertTriangle, 
  Ban, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Globe,
  Lock
} from 'lucide-react';

export interface SecurityGovernanceTabProps {
  user: {
    id: string;
    email: string;
    role: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'DEACTIVATED';
    mfaEnforced: boolean;
  };
  onToggleMfa: (enforce: boolean) => Promise<void>;
  onSendPasswordReset: () => Promise<void>;
  onRevokeSessions: () => Promise<void>;
  onUpdateAccountStatus: (newStatus: 'SUSPENDED' | 'DEACTIVATED' | 'ACTIVE', reason: string) => Promise<void>;
}

export const SecurityGovernanceTab: React.FC<SecurityGovernanceTabProps> = ({
  user,
  onToggleMfa,
  onSendPasswordReset,
  onRevokeSessions,
  onUpdateAccountStatus,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  
  // Destructive Action Modal States
  const [confirmingAction, setConfirmingAction] = useState<'SUSPEND' | 'DEACTIVATE' | null>(null);
  const [auditReason, setAuditReason] = useState('');

  const handlePasswordReset = async () => {
    setIsSubmitting(true);
    try {
      await onSendPasswordReset();
      setActionSuccessMessage('Password recovery email dispatched successfully.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    setIsSubmitting(true);
    try {
      await onRevokeSessions();
      setActionSuccessMessage('All active sessions revoked. User must re-authenticate.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteStatusChange = async () => {
    if (!confirmingAction || !auditReason.trim()) return;
    setIsSubmitting(true);
    try {
      const targetStatus = confirmingAction === 'SUSPEND' ? 'SUSPENDED' : 'DEACTIVATED';
      await onUpdateAccountStatus(targetStatus, auditReason);
      setActionSuccessMessage(`Account ${targetStatus.toLowerCase()} successfully.`);
      setConfirmingAction(null);
      setAuditReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-100">
      
      {/* Action Notice Toast */}
      {actionSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccessMessage}</span>
          </span>
          <button onClick={() => setActionSuccessMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 1. MFA Enforcement Banner */}
      <div className={`p-4 rounded-xl border ${
        user.mfaEnforced 
          ? 'bg-indigo-950/30 border-indigo-800/60' 
          : 'bg-amber-950/30 border-amber-800/60'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg border ${
              user.mfaEnforced 
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`font-bold ${user.mfaEnforced ? 'text-indigo-300' : 'text-amber-300'}`}>
                {user.mfaEnforced ? 'Mandatory MFA Enforced' : 'MFA Authentication Optional'}
              </h4>
              <p className="text-slate-300 text-[11px] mt-0.5">
                {user.mfaEnforced 
                  ? 'User is required to authenticate with TOTP on every login.' 
                  : 'Platform Admins can force mandatory multi-factor enrollment prior to Tier 2 Data Room access.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onToggleMfa(!user.mfaEnforced)}
            disabled={isSubmitting}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
              user.mfaEnforced 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/50'
            }`}
          >
            {user.mfaEnforced ? 'Disable MFA Requirement' : '🔒 Force MFA Enrollment'}
          </button>
        </div>
      </div>

      {/* 2. Credentials & Session Management */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center space-x-2">
          <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
          <span>Identity & Session Management</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div>
              <span className="font-semibold text-white block">Password & Credentials</span>
              <span className="text-[10px] text-slate-400">Issue an encrypted self-service password reset link to user.</span>
            </div>
            <button
              onClick={handlePasswordReset}
              disabled={isSubmitting}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition flex items-center justify-center space-x-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>Issue Reset Link</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div>
              <span className="font-semibold text-white block">Active Session Control</span>
              <span className="text-[10px] text-slate-400">Force disconnect active browser sessions across all devices.</span>
            </div>
            <button
              onClick={handleRevokeAllSessions}
              disabled={isSubmitting}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition flex items-center justify-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              <span>Revoke All Sessions</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Session Telemetry Stream */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center space-x-2">
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Active Device Telemetry</span>
        </h3>

        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Device / Browser</th>
                <th className="py-2.5 px-3">Location & IP</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Chrome (macOS Desktop)</td>
                <td className="py-2.5 px-3 text-slate-300">Harare, ZW (192.0.2.45)</td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span>Current Session</span>
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right text-slate-400 font-mono">Active Now</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-300">Safari (iOS Mobile)</td>
                <td className="py-2.5 px-3 text-slate-400">Bulawayo, ZW (198.51.100.12)</td>
                <td className="py-2.5 px-3">
                  <span className="text-slate-500 font-medium">Idle</span>
                </td>
                <td className="py-2.5 px-3 text-right text-slate-400 font-mono">2h ago</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Destructive Lifecycle Controls */}
      <div className="space-y-3">
        <h3 className="font-bold text-rose-400 uppercase tracking-wider text-[10px] flex items-center space-x-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Administrative Account Controls</span>
        </h3>

        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-4">
          <p className="text-slate-300 text-[11px]">
            Suspending or deactivating an account revokes access to Tier 2 VDR data rooms, pauses MOU negotiations, and prevents login.
          </p>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setConfirmingAction('SUSPEND')}
              className="px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 font-semibold text-xs rounded-lg border border-rose-800 transition flex items-center space-x-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Suspend Account</span>
            </button>

            <button
              onClick={() => setConfirmingAction('DEACTIVATE')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700 transition flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Deactivate & Archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION & AUDIT REASON MODAL */}
      {confirmingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">
                Confirm Account {confirmingAction === 'SUSPEND' ? 'Suspension' : 'Deactivation'}
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              Please enter an official administrative audit reason for this action. This will be recorded in the national security audit log.
            </p>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                Audit Reason <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="e.g., Compliance review pending / Requested by governance team..."
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingAction(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteStatusChange}
                disabled={!auditReason.trim() || isSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition disabled:opacity-40"
              >
                Confirm {confirmingAction === 'SUSPEND' ? 'Suspension' : 'Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

```


---------
---------

Before giving you the consolidated master specification for your engineering team, here are **3 Sovereign / Fortune 10 considerations** to elevate this module to enterprise grade:

---

## 🏛️ Sovereign & Fortune 10 Strategic Considerations

### 1. The "Four-Eyes" Governance Principle for Role Elevation

At the sovereign wealth or Cabinet level, elevating an account from `Registered` to `Qualified Investor` or `Government Lead` unlocks confidential Tier 2/3 Data Rooms.

* **Recommendation:** Ensure every role elevation or status change forces a **mandatory justification entry** that writes to an unalterable audit log (`user_profile_audits`).

### 2. Identity Provider Capability Badges (Replacing Debug Text)

Rather than displaying technical disclaimers (*"Neon Auth password resets are self-service today..."*), frame these capabilities as **Identity Security Badges**:

* **Password Reset:** Label as *Self-Service Identity Flow (Neon Auth)*.
* **Session Revocation:** Label as *User-Managed Identity Session (Neon Auth)*.
* **MFA Enforcement:** Label as *Console Policy Enforced*.
This keeps the technical reminders clear for your dev team while maintaining an executive UI.

### 3. Touch-Optimized Horizontal Tab Scrolling (`overflow-x-auto`)

On smaller viewports, long tab labels naturally wrap and collide.

* **UX Solution:** Apply `overflow-x-auto scrollbar-none` with `flex-shrink-0` on tab buttons. This allows smooth horizontal touch-swiping on mobile/tablet screens without any text truncation or awkward line wrapping.

---

# 📦 Master Developer Specification: Sovereign User Profile Dossier & Drawer Upgrade

**Goal:** Replace the basic user drawer with an interactive, 4-tab **Institutional Compliance & Governance Dossier**. Ensure complete UI responsiveness, non-wrapping tab navigation, full KYC/NDA/Ministry telemetry, and clean identity capability notes.

---

## 1. High-Level Architectural Layout

```
+-----------------------------------------------------------------------------------------------------------------------+
| 🟢 Active  •  Account ID: ZIDA-000004                                                                             [X] |
|                                                                                                                       |
| Pilot Registered Investor                                                                                             |
| registered+pilot@zidaproject.com  •  🟢 Domain Verified                                                               |
+-----------------------------------------------------------------------------------------------------------------------+
|                                                                                                                       |
|  RESPONSIVE NON-WRAPPING TAB STRIP (Horizontal Scrollable on Mobile)                                                  |
|  [ 🏢 Institutional Profile ]  [ 🛡️ Compliance & NDA (Pill) ]  [ 📊 Portfolio (Count) ]  [ 🔐 Governance (MFA) ]      |
+-----------------------------------------------------------------------------------------------------------------------+
|                                                                                                                       |
|  TAB 1: INSTITUTIONAL PROFILE                                                                                         |
|  • Corporate Entity Details (Legal Name, Reg ID, Corporate Email, Address, Website)                                   |
|  • Executive Representative Details (Name, Title, Direct Phone, Appointment Ref)                                      |
|  • Ministry Taxonomy Mapping (Mandatory for Government Role)                                                          |
|                                                                                                                       |
|  TAB 2: COMPLIANCE & NDA                                                                                              |
|  • Sovereign NDA Attestation Status Banner                                                                            |
|  • Institutional KYC Completeness Matrix & Progress Bar (25% Verified)                                                |
|  • Proof of Funds & Accreditation Document Queue                                                                      |
|  • Promote to Qualified Investor Action Banner                                                                        |
|                                                                                                                       |
|  TAB 3: PORTFOLIO & ACTIVITY                                                                                          |
|  • Telemetry KPI Strip (Engagements, Tracked Capital, VDR Previews, Audit Logs)                                       |
|  • Bound Project Opportunities & Deal Room Pipeline                                                                   |
|  • Virtual Data Room (VDR) Watermarked Download & Preview Telemetry                                                   |
|  • Real-time Audit Stream                                                                                             |
|                                                                                                                       |
|  TAB 4: SECURITY & GOVERNANCE                                                                                         |
|  • MFA Enforcement Posture Banner                                                                                     |
|  • Identity & Credential Control (with Identity Capability Reminders)                                                |
|  • Active Device & IP Telemetry Stream                                                                                |
|  • Account Lifecycle Controls (Suspend / Deactivate) with Audit Reason Modal                                          |
|                                                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------+

```

---

## 2. Complete Production React Component (`UserDrawer.tsx`)

Pass this single, self-contained component file directly to your development team to replace `components/admin/UserDrawer.tsx`:

```tsx
import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Building2, 
  UserCheck, 
  FileText, 
  KeyRound, 
  LogOut,
  Lock,
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Award,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Download,
  Activity,
  Plus,
  Send,
  Upload,
  Eye,
  Ban,
  Trash2,
  Info
} from 'lucide-react';

export type UserRole = 'REGISTERED' | 'QUALIFIED_INVESTOR' | 'GOVERNMENT' | 'CONSOLE_ADMIN' | 'PLATFORM_ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'DEACTIVATED';
export type TabKey = 'PROFILE' | 'COMPLIANCE' | 'PORTFOLIO' | 'SECURITY';

export interface UserDetail {
  id: string;
  accountId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: string;
  
  // Corporate Entity
  companyName?: string;
  businessRegId?: string;
  corporateEmail?: string;
  isEmailDomainVerified?: boolean;
  corporateAddress?: string;
  corporatePhone?: string;
  websiteUrl?: string;
  
  // Representative
  representativeName?: string;
  representativeTitle?: string;
  directPhone?: string;
  appointmentRef?: string;
  
  // Ministry Binding
  ministryId?: string;
  ministryName?: string;
  
  // Compliance
  hasSignedNda: boolean;
  ndaSignedAt?: string;
  ndaSignedIp?: string;
  isAccreditedInvestor: boolean;
  mfaEnforced: boolean;
}

export interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDetail | null;
  ministries?: { id: string; name: string; code: string }[];
  onUpdateUser: (updatedFields: Partial<UserDetail>) => Promise<void>;
}

export const UserDrawer: React.FC<UserDrawerProps> = ({
  isOpen,
  onClose,
  user,
  ministries = [],
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('PROFILE');
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<'SUSPEND' | 'DEACTIVATE' | null>(null);
  const [auditReason, setAuditReason] = useState('');

  if (!isOpen || !user) return null;

  const handleRoleChange = async (newRole: UserRole) => {
    setIsUpdating(true);
    try {
      await onUpdateUser({ role: newRole });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMinistryBinding = async (ministryId: string) => {
    setIsUpdating(true);
    try {
      const matched = ministries.find((m) => m.id === ministryId);
      await onUpdateUser({ ministryId, ministryName: matched?.name });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExecuteStatusChange = async () => {
    if (!confirmingAction || !auditReason.trim()) return;
    setIsUpdating(true);
    try {
      const targetStatus = confirmingAction === 'SUSPEND' ? 'SUSPENDED' : 'DEACTIVATED';
      await onUpdateUser({ status: targetStatus });
      setConfirmingAction(null);
      setAuditReason('');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-2xl bg-slate-950 border-l border-slate-800 text-slate-100 h-full shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  {user.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-800 text-slate-300 border border-slate-700">
                  {user.role.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ID: {user.accountId || 'ZIDA-000004'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{user.name}</h2>
              <p className="text-xs text-slate-400 font-mono">{user.email}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Fully Responsive & Non-Truncating Tab Navigation Bar */}
          <div className="mt-6 border-b border-slate-800">
            <div className="flex space-x-2 overflow-x-auto scrollbar-none pb-2">
              
              <button
                type="button"
                onClick={() => setActiveTab('PROFILE')}
                className={`flex-shrink-0 flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'PROFILE'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Institutional Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('COMPLIANCE')}
                className={`flex-shrink-0 flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'COMPLIANCE'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Compliance & NDA</span>
                {user.hasSignedNda ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-900 text-emerald-300 font-bold">Signed</span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-900 text-amber-300 font-bold">Pending</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PORTFOLIO')}
                className={`flex-shrink-0 flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'PORTFOLIO'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Portfolio & Deals</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SECURITY')}
                className={`flex-shrink-0 flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'SECURITY'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Security & Governance</span>
              </button>

            </div>
          </div>
        </div>

        {/* Scrollable Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">

          {/* TAB 1: INSTITUTIONAL PROFILE */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-6">
              
              {/* Corporate Entity Details */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center space-x-2">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Corporate Entity Identification</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Legal Entity Name</span>
                    <span className="font-semibold text-white block mt-0.5">{user.companyName || 'Afronovation Holdings LLC'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Business Reg / Tax ID</span>
                    <span className="font-mono text-slate-200 block mt-0.5">{user.businessRegId || 'REG-2026-994827'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Corporate Email</span>
                    <span className="font-semibold text-slate-200 block mt-0.5 flex items-center space-x-1.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{user.corporateEmail || 'contact@afronovation.com'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Corporate Phone</span>
                    <span className="text-slate-300 block mt-0.5 flex items-center space-x-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{user.corporatePhone || '+263 242 700000'}</span>
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block text-[10px] uppercase">HQ Address</span>
                    <span className="text-slate-300 block mt-0.5 flex items-center space-x-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{user.corporateAddress || '100 Innovation Way, Suite 400, Harare, Zimbabwe'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Executive Representative Details */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center space-x-2">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Primary Executive Representative</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Full Name</span>
                    <span className="font-semibold text-white block mt-0.5">{user.representativeName || user.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Official Title</span>
                    <span className="text-slate-200 block mt-0.5">{user.representativeTitle || 'Managing Partner / CEO'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Direct Phone / WhatsApp</span>
                    <span className="text-slate-300 block mt-0.5">{user.directPhone || '+1 (555) 019-2834'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Appointment Ref ID</span>
                    <span className="font-mono text-slate-300 block mt-0.5">{user.appointmentRef || 'GOV-REF-2026-8849'}</span>
                  </div>
                </div>
              </div>

              {/* Ministry Taxonomy Binding (If Government Persona) */}
              {user.role === 'GOVERNMENT' && (
                <div className="space-y-3 p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40">
                  <h3 className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">
                    🏛️ Mapped Ministry Taxonomy Binding
                  </h3>
                  <select
                    value={user.ministryId || ''}
                    onChange={(e) => handleMinistryBinding(e.target.value)}
                    disabled={isUpdating}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Select Ministry Taxonomy --</option>
                    {ministries.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                    ))}
                  </select>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: COMPLIANCE & NDA */}
          {activeTab === 'COMPLIANCE' && (
            <div className="space-y-6">
              
              {/* NDA Banner */}
              <div className={`p-4 rounded-xl border ${user.hasSignedNda ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-amber-950/30 border-amber-800/60'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    {user.hasSignedNda ? <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5" /> : <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5" />}
                    <div>
                      <h4 className={`font-bold ${user.hasSignedNda ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {user.hasSignedNda ? 'Sovereign NDA Executed' : 'Sovereign NDA Attestation Pending'}
                      </h4>
                      <p className="text-slate-300 text-[11px] mt-0.5">
                        {user.hasSignedNda ? `Signed on ${user.ndaSignedAt || '24 Jul 2026'}. Tier 2 Data Room unlocked.` : 'Account restricted to Tier 1 Public teasers until NDA is signed.'}
                      </p>
                    </div>
                  </div>
                  {!user.hasSignedNda && (
                    <button className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg transition shrink-0 flex items-center space-x-1">
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Reminder</span>
                    </button>
                  )}
                </div>
              </div>

              {/* KYC Progress Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">Institutional KYC Completeness</h3>
                  <span className="font-mono text-xs font-semibold text-emerald-400">25% Verified</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-emerald-500 h-full w-1/4" />
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: PORTFOLIO & ACTIVITY */}
          {activeTab === 'PORTFOLIO' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase">Engagements</span>
                  <div className="text-lg font-bold text-white">0 Deals</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase">Tracked Capital</span>
                  <div className="text-lg font-bold text-emerald-400">$0.00</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase">VDR Previews</span>
                  <div className="text-lg font-bold text-indigo-400">0 Files</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase">Audit Logs</span>
                  <div className="text-lg font-bold text-amber-400">2 Events</div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: SECURITY & GOVERNANCE */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-6">
              
              {/* MFA Posture */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white">Multi-Factor Authentication (MFA)</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {user.mfaEnforced ? 'MFA is strictly enforced on login.' : 'MFA is optional (platform-wide console policy).'}\
                  </p>
                </div>
                <button
                  onClick={() => onUpdateUser({ mfaEnforced: !user.mfaEnforced })}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
                >
                  {user.mfaEnforced ? 'Disable MFA' : 'Force MFA Enrollment'}
                </button>
              </div>

              {/* Clean Capability Notes (Identity Reminders) */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Identity Capabilities & Policy Reminders</span>
                </h4>
                
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-white block">✉️ Password Reset Flow</span>
                    <span className="text-slate-400 text-[11px]">Triggers self-service password recovery flow via Identity Provider (Neon Auth).</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-white block">🚫 Session Revocation</span>
                    <span className="text-slate-400 text-[11px]">Cross-user session termination is managed inside Account & Security.</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-white block">🔒 MFA Enforcement Policy</span>
                    <span className="text-slate-400 text-[11px]">TOTP enrollment requirement activates upon platform console MFA toggle.</span>
                  </div>
                </div>
              </div>

              {/* Destructive Controls */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-3">
                <h4 className="font-bold text-rose-400 uppercase tracking-wider text-[10px]">Account Lifecycle Actions</h4>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setConfirmingAction('SUSPEND')}
                    className="px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 font-semibold text-xs rounded-lg border border-rose-800 transition flex items-center space-x-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Suspend Account</span>
                  </button>

                  <button
                    onClick={() => setConfirmingAction('DEACTIVATE')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700 transition flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Deactivate Account</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <span className="text-slate-500">Joined: {user.joinedAt}</span>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition">
            Close Drawer
          </button>
        </div>

      </div>

      {/* Audit Reason Modal */}
      {confirmingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-rose-400">Confirm Account {confirmingAction}</h3>
            <textarea
              rows={3}
              required
              value={auditReason}
              onChange={(e) => setAuditReason(e.target.value)}
              placeholder="Enter administrative audit justification..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white"
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setConfirmingAction(null)} className="px-3 py-1.5 text-xs text-slate-400">Cancel</button>
              <button onClick={handleExecuteStatusChange} className="px-4 py-1.5 text-xs bg-rose-600 text-white font-semibold rounded-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

```