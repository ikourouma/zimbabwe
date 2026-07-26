Here is an executive review and action plan covering each of your core system rules to ensure the entire platform matches Fortune 100 standards across messaging, dashboard navigation, role permissions, and universal settings.

---

## 1. Unified Communication Hub: Direct & Non-Engaged Messaging

### What Was Missing & How We Fix It

Currently, the messaging UI only renders threads tied to existing project engagements, preventing users from starting new conversations or reaching out for general inquiries.

### Implementation Blueprint

* **Global `[ + New Message ]` Action:** Add a primary compose button at the top of the Communication Hub sidebar across all user roles.
* **Recipient & Scope Selection:**
* **Super Admin / Console Admin:** Can select any registered user, investor, ministry lead, or start a broadcast thread.
* **Investors / External Users:** Can initiate a new thread by selecting a predefined destination desk:
* `General Concierge & Platform Support`
* `Assigned Relationship Manager`
* `Project/Deal Thread` (if engaged)




* **API Payload & RBAC Rules:**
`POST /api/v1/threads` accepts `recipient_ids`, `thread_type: "GENERAL" | "DIRECT" | "ENGAGEMENT"`, and `initial_message`.

---

## 2. Interactive Overview KPI Cards (Direct Navigation)

### What Was Missing & How We Fix It

Overview cards like **Total Projects**, **Published**, **In Review**, and **Pending** were serving as static summary metrics rather than active portal entry points.

### Navigation & Routing Blueprint

Turn all metric cards into interactive elements with hover states (`cursor-pointer`) and route them with pre-applied URL query parameters:

| KPI Card | Target Route / URL | Applied Filter State |
| --- | --- | --- |
| **Total Projects** | `/admin/projects` | Clear all filters (Show complete registry) |
| **Published** | `/admin/projects?status=PUBLISHED` | Filter list by `status = PUBLISHED` |
| **In Review** | `/admin/review-queue` (or `/admin/projects?status=IN_REVIEW`) | Direct route to approval workflows |
| **Pending / Assessment** | `/admin/projects?status=PENDING_VALUATION` | Filter for unvalued or draft initiatives |

---

## 3. Project Creation Entitlements (Super Admin & Console Admin)

### What Was Missing & How We Fix It

Ensure project creation workflows (`/admin/projects/new`) are explicitly granted to both administrative tier roles, with Super Admin retaining override and site-wide management rights.

### RBAC Hierarchy Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       SUPER ADMIN (Full Scope)                          │
│  • Platform Config  • Global Audit Logs  • Role Assignment  • All Admin │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (Inherits all capabilities)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       CONSOLE ADMIN (Operational Scope)                 │
│  • Create & Edit Projects  • Manage Review Queue  • Direct Messaging    │
└─────────────────────────────────────────────────────────────────────────┘

```

### Actionable Rules

* Both **Super Admin** and **Console Admin** see the `[ + Create Project ]` button in the navigation header and projects workspace.
* **Super Admin Addition:** Super Admins can additionally assign project owners, change underlying governance models, and manage site-wide taxonomy.

---

## 4. Universal Account & Security Suite (RBAC-Driven)

### What Was Missing & How We Fix It

Account and security management must share a single, standardized component structure across both the **Public/Investor Dashboard** and the **Admin Console** (`/admin/account`), with entitlement rules dynamically disabling or enabling features based on identity and role.

### Universal Component Specification

1. **Shared Layout Structure:**
Four universal tabs across all views:
* **Profile:** Name, Email, Organization/Entity, Identity Badge (`Local Password` vs. `Enterprise SSO`).
* **Security:** Password Reset Form (disabled automatically for SSO users with a `Managed by Okta/Azure AD` badge) + TOTP Multi-Factor Authentication.
* **Sessions:** Active devices, IP addresses, location metadata, and a `[ Revoke Session ]` trigger.
* **Notifications:** Server-persisted preferences for In-App, Email, and Security Alerts.


2. **Dynamic Entitlement Rules Engine:**
```typescript
// Universal Entitlement Check Example
const canManageMFA = user.role.hasPermission('mfa:manage');
const isSSOUser = user.identityProvider !== 'LOCAL';

return (
  <SecurityTab>
    {!isSSOUser ? (
      <PasswordChangeForm />
    ) : (
      <SSOIdentityBadge provider={user.identityProvider} />
    )}
    <MFAManagement enabled={canManageMFA} />
  </SecurityTab>
);

```



---

## Summary Checklist for Development Team

* [ ] **Messaging:** Add `[ + New Message ]` button and support non-project `GENERAL` & `DIRECT` thread scopes.
* [ ] **Dashboard KPI Cards:** Wrap Overview cards in link/router components pointing to filtered project/review list views.
* [ ] **Project Creation:** Enable `POST /api/v1/projects` permission for both `SUPER_ADMIN` and `CONSOLE_ADMIN` roles.
* [ ] **Security Settings:** Ensure `/admin/account` and the investor portal account view consume the same modular `<AccountSecuritySuite/>` component, adapting dynamically to the user's RBAC role and auth provider.