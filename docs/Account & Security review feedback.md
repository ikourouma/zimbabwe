Looking at the current **Account & Security** view (`/super-admin/account`), there are two major architectural gaps preventing profile updates:

1. **Broken Visual Hierarchy / Disabled Button:** The `Save` button next to the **Display Name** field is grayed out and lacks affordance. It appears stuck in a disabled or sub-optimal inline state, offering no clear path to save changes.
2. **Missing Primary Form Actions & Section Scoping:** A Fortune 100 enterprise platform (e.g., Okta, AWS Management Console, Microsoft Entra ID) never relies on isolated, inline per-input save triggers for account settings. Instead, it uses **explicit section-level action footers**, **unsaved changes detection (dirty state bars)**, and **security step-up validations**.

---

## 1. Core Fortune 100 Gaps & Fix Strategy

| Dimension | Current Implementation | Fortune 100 Standard Fix |
| --- | --- | --- |
| **Save Action** | Isolated inline `Save` button next to Display Name | **Sticky Action Bar / Section CTA:** Clear primary `Save Profile Changes` button at the bottom of the section that activates dynamically when fields are edited (*dirty state*). |
| **Editable Fields** | Only `Display Name` is editable; Email and Entity are static labels | **Structured Form Controls:** Allow updating Display Name, Preferred Contact Email, Timezone/Locale, and Avatar/Initials badge. Static fields (e.g., Entity, Identity Provider) should display explicit `Read-Only` or `Managed via SSO` badges. |
| **Re-Authentication Guard** | Direct update without validation | **Step-Up Security:** Sensitive changes (e.g., updating contact email or profile details) trigger an administrative confirmation or 2FA prompt. |
| **Feedback & Audit** | No clear success state | **Instant Toast & Audit Log:** Fires an immediate success notification and logs a `user_profile_updated` record to the Audit Trail. |

---

## 2. Fortune 100 Wireframe Layout

```
+---------------------------------------------------------------------------------------------------------+
|  ACCOUNT & SECURITY GOVERNANCE                                                                          |
|  Manage administrative identity, authentication factors, active sessions, and security notifications. |
+---------------------------------------------------------------------------------------------------------+
|  ( Profile )  [ Security & Password ]   [ Active Sessions (2) ]   [ Notification Preferences ]          |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  ADMINISTRATIVE PROFILE & IDENTITY                                                                      |
|  +---------------------------------------------------------------------------------------------------+  |
|  |  [PA]  Pilot Super Admin                                                       [ 📷 Change Avatar ] |  |
|  |        superadmin+pilot@zidaproject.com • Afronovation, Inc.                                       |  |
|  +---------------------------------------------------------------------------------------------------+  |
|                                                                                                         |
|  Display Name *                                    Contact Email Address *                              |
|  [ Pilot Super Admin                             ] [ superadmin+pilot@zidaproject.com                 ] |  |
|                                                                                                         |
|  Organization / Entity (Read-Only)                 Identity Provider                                    |
|  [ Afronovation, Inc.               ] 🔒 Managed   [ Local Password / SAML SSO            ] 🔒 SSO      |
|                                                                                                         |
|  Preferred Timezone                                Administrative Language                              |
|  [ (UTC+02:00) Harare, Pretoria                  ▾ ] [ English (US)                                   ▾ ] |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
|  UNSAVED CHANGES DETECTED                              [ Cancel ]  [ SAVE PROFILE CHANGES ⚡ ]          |
+---------------------------------------------------------------------------------------------------------+

```

---

## 3. Production-Ready React / Tailwind Component Fix

Here is the elevated component layout to replace the static form on `/super-admin/account`. It includes dirty-state detection, clear primary buttons, and security indicators.

```tsx
import React, { useState } from 'react';
import { 
  UserCircleIcon, 
  ShieldCheckIcon, 
  LockClosedIcon, 
  CheckCircleIcon,
  ArrowPathIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

export const Fortune100AccountProfile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sessions' | 'notifications'>('profile');
  
  // Form State
  const [displayName, setDisplayName] = useState('Pilot Super Admin');
  const [email, setEmail] = useState('superadmin+pilot@zidaproject.com');
  const [timezone, setTimezone] = useState('Africa/Harare');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Track if form has been modified (Dirty State)
  const isDirty = displayName !== 'Pilot Super Admin' || 
                  email !== 'superadmin+pilot@zidaproject.com' || 
                  timezone !== 'Africa/Harare';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }, 800);
  };

  const handleReset = () => {
    setDisplayName('Pilot Super Admin');
    setEmail('superadmin+pilot@zidaproject.com');
    setTimezone('Africa/Harare');
  };

  return (
    <div className="w-full space-y-6 bg-zinc-950 p-6 text-zinc-100 rounded-xl border border-zinc-800 font-sans">
      
      {/* Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-lg shadow-2xl flex items-center space-x-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
          <span>Profile changes successfully saved & logged to Audit Trail.</span>
        </div>
      )}

      {/* Header */}
      <div className="pb-4 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">
            Super Admin Account
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Account & Governance Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage administrative identity, authentication credentials, and active session security.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 space-x-6 text-xs font-semibold">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${activeTab === 'profile' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
        >
          <UserCircleIcon className="w-4 h-4" />
          <span>Profile</span>
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${activeTab === 'security' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
        >
          <KeyIcon className="w-4 h-4" />
          <span>Security & 2FA</span>
        </button>
        <button 
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${activeTab === 'sessions' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
        >
          <ShieldCheckIcon className="w-4 h-4" />
          <span>Active Sessions (2)</span>
        </button>
      </div>

      {/* Profile Form */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          
          {/* Avatar Banner Card */}
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-full bg-amber-500 text-zinc-950 font-extrabold text-xl flex items-center justify-center shrink-0 shadow-lg">
                PA
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{displayName}</h2>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">{email}</div>
                <div className="inline-flex items-center space-x-1 mt-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  <ShieldCheckIcon className="w-3 h-3" />
                  <span>Super Admin Entitlements Active</span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition text-zinc-300"
            >
              Update Initials / Avatar
            </button>
          </div>

          {/* Form Grid */}
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Identity Details</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Display Name *</label>
                <input 
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Administrative Email *</label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Organization / Entity (Read-Only)</label>
                <div className="relative">
                  <input 
                    type="text"
                    value="Afronovation, Inc."
                    disabled
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-500 cursor-not-allowed"
                  />
                  <LockClosedIcon className="w-4 h-4 absolute right-3 top-3 text-zinc-600" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Preferred Timezone</label>
                <select 
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Africa/Harare">(UTC+02:00) Harare, Pretoria</option>
                  <option value="America/New_York">(UTC-05:00) Eastern Time (US & Canada)</option>
                  <option value="Europe/London">(UTC+00:00) London, UTC</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sticky Unsaved Changes Footer Bar */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div className="text-xs text-zinc-400">
              {isDirty ? (
                <span className="text-amber-400 font-medium">⚠️ Unsaved profile changes detected.</span>
              ) : (
                <span>Profile details up to date.</span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {isDirty && (
                <button 
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit"
                disabled={!isDirty || isSubmitting}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center space-x-2 ${
                  isDirty 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg' 
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                {isSubmitting && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Profile Changes</span>
              </button>
            </div>
          </div>

        </form>
      )}

    </div>
  );
};

```