Looking at your current **Users & Roles** workspace (under `Super Admin Platform Ops`), you have a clean list view displaying active accounts across your five tier roles (`Registered`, `Qualified Investor`, `Government`, `ZIDA Admin`, and `Super Admin`), along with high-level KPI cards like **MFA Compliance (0%)** and **Pending Invites (0)**.

However, as you pointed out, the interface currently lacks direct row-level administrative actions (edit, modify, role promotion/demotion, status suspension/revocation), and the user addition/invite workflow needs to support full dynamic role provisioning.

Here is an executive review and concrete specification for upgrading the user management module for both **Super Admin** and **Console Admin (ZIDA Admin)**.

---

## 1. Dynamic User Account Modification & Row-Level Governance

To grant full account management capabilities to administrators directly within the workspace, add row-level quick actions and an interactive **Account Workspace Side Sheet / Modal**.

### A. Row-Level Action Dropdown (`···`)

Add an action menu to each user row in the table with the following options:

* **Edit Profile & Entity Details:** Update Name, Email, Organization, Title, and Phone Number.
* **Modify Role & Scope (Provision / Revoke):** Dynamically assign or change role tiers (`Registered` → `Qualified Investor` → `Government` → `ZIDA Admin` → `Super Admin`).
* **Manage Security & MFA:** Trigger forced password reset, clear active sessions, or bypass/reset MFA keys.
* **Account Status Governance:** Toggle account state (`Active`, `Suspended`, `Deactivated`, or `Pending Verification`).
* **Delete / Archive Account:** Soft delete or archive account records for compliance.

### B. Account Workspace Drawer (When Clicking a User Row)

Clicking any row should open a slide-over panel displaying:

1. **User Identity & Metadata:** Name, Organization, Role Badge, Joined Date, Auth Type (`Local` vs. `SSO`).
2. **Role & Entitlement Matrix:** Active permission toggles corresponding to the user's role.
3. **Audit & Activity Log:** Recent logins, IP addresses, data room downloads, and API token usage.
4. **Action Bar:** `[ Save Changes ]`, `[ Force Password Reset ]`, `[ Suspend Account ]`.

---

## 2. Dynamic "Invite / Add User" Form Specification

To ensure nothing is missing during user provisioning, the **Invite / Add User** modal must be dynamic, adapting its fields based on the selected **Role Tier**.

```
+-----------------------------------------------------------------------------------+
|  INVITE / PROVISION NEW USER                                                   [X]|
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  1. BASIC IDENTITY                                                                |
|  First Name: [                     ]   Last Name:  [                     ]        |
|  Email Address: [                  ]   Phone:      [                     ]        |
|  Organization / Ministry: [                                             ]         |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  2. ROLE PROVISONING & ENTITLEMENTS                                               |
|  Role Tier: [ Select Role Tier                        ▼ ]                        |
|             • Registered Investor                                                 |
|             • Qualified Investor                                                  |
|             • Government / Ministry Lead                                          |
|             • ZIDA Admin (Console Admin)                                          |
|             • Super Admin                                                         |
|                                                                                   |
|  [ DYNAMIC CONDITIONAL FIELDS BASED ON ROLE ]                                     |
|                                                                                   |
|  IF Role == "Government / Ministry Lead":                                         |
|    Assigned Ministry: [ Ministry of Agriculture        ▼ ]                        |
|    Approval Threshold: [ Read & Propose / Full Approval ]                         |
|                                                                                   |
|  IF Role == "Qualified Investor":                                                 |
|    Investment Firm Type: [ Private Equity / Sovereign Wealth / Family Office ▼ ]   |
|    Target Mandate Size:  [ $10M - $50M                               ▼ ]         |
|                                                                                   |
|  IF Role == "ZIDA Admin" OR "Super Admin":                                        |
|    Admin Permissions: [✓] Manage Projects  [✓] Review Queue  [✓] User Management|
|    Publishing Override Rights: ( Yes / No )                                       |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  3. ONBOARDING & SECURITY METHOD                                                  |
|  (•) Send Email Invitation Link (User sets password upon first login)            |
|  ( ) Set Temporary Password (Admin defines initial credential)                    |
|  [✓] Enforce MFA Setup on First Login                                             |
|                                                                                   |
|  [ Cancel ]                                            [ Send Invite / Create ]   |
+-----------------------------------------------------------------------------------+

```

---

## 3. RBAC Entitlement Comparison: Super Admin vs. Console Admin

Both roles require full user administration capabilities, but **Super Admin** holds site-wide governance overrides:

| Administrative Capability | Console Admin (`ZIDA Admin`) | Super Admin (`Super Admin`) |
| --- | --- | --- |
| **Invite / Provision Users** | Investor, Government, & Console Admin tiers | All Roles (including Super Admin) |
| **Modify User Roles** | Up to Console Admin level | Full Tier (Can promote/demote Super Admins) |
| **Suspend / Activate Users** | Allowed | Allowed |
| **Force Password Reset / Session Revocation** | Allowed | Allowed |
| **Publishing & System Overrides** | Standard Approvals | Site-wide Override & Global Audit Logs |

---

## Developer Action Plan & API Specs

* **`GET /api/v1/admin/users/{user_id}`** — Returns complete user profile, role permissions, active sessions, and audit history.
* **`PATCH /api/v1/admin/users/{user_id}`** — Updates profile details, status (`ACTIVE` | `SUSPENDED`), or assigned ministry/organization.
* **`POST /api/v1/admin/users/{user_id}/role`** — Mutates user RBAC role tier and entitlement scopes.
* **`POST /api/v1/admin/users/invite`** — Triggers dynamic invite payload containing `email`, `role`, `organization`, `assigned_ministry`, and `enforce_mfa: true`.