Communication Hub and User Settings Review.

When evaluating the current **Communication Hub** in the ZIDA Deal Room workspace, the current layout is highly functional for transaction-bound operations, but it operates in a silo. Elevating this to a tier-one executive experience requires addressing both identity management and channel elasticity.

---

## 1. Identity & Account Management (Password Change Request)

### What We See

Currently, account settings and authentication flows appear disconnected from the primary workflow. In an enterprise Deal Room, force-multiplying user control over security is an baseline expectation.

### How to Elevate to Fortune 100 Standard

* **Decoupled Security Dashboard:** Place password changes, multi-factor authentication (MFA), active session revocation, and security notification preferences under a centralized **Account & Security Settings** tab (accessible from the user profile avatar at the top right).
* **Enterprise SSO / IdP Integration:** For institutional investors and government agencies, support Single Sign-On (Okta, Azure AD / Entra ID, Ping Identity). If a user logs in via SSO, gracefully present a managed identity badge rather than a password reset form, directing them to their organization's identity manager.
* **Self-Service Recovery:** Include a seamless "Request Password Reset" action directly inside the user dashboard with time-bound magic links or OTP verification to eliminate manual support tickets.

---

## 2. Platform Communication Architecture (General vs. Project-Bound Messaging)

### What We See

The current hub tightly couples messaging to active, engaged deal pipelines (e.g., *Misty Mountains Coffee Production*). While this keeps discussions contextualized, it creates a "cold start" problem: potential investors or stakeholders cannot communicate prior to entering an engagement phase, creating friction and driving conversations off-platform into unmonitored email threads.

```
[ Current Model ]   
Investor  --->  Must Have Active Engagement  --->  Can Access Thread

[ Target Fortune 100 Model ]
Investor  --->  General Concierge / Deal Desk  --->  General Inquiry
          --->  Project Channel (Scoped)        --->  Deal Execution Thread
          --->  Direct Messaging (Assigned RM)  --->  Private Strategy

```

### How to Elevate to Fortune 100 Standard

#### A. Multi-Tiered Channel Architecture

Expand the Communication Hub into three distinct messaging scopes:

1. **General Concierge / ZIDA Helpdesk:** A persistent, non-engagement-restricted channel where qualified or prospect investors can reach out regarding platform navigation, regulatory queries, or general investment inquiries.
2. **Deal / Engagement Channels:** The existing structured threads (like the *Misty Mountains Coffee* thread), scoped to specific investment assets with automated metadata tags (e.g., ticket size modifications, status changes).
3. **Direct Executive Contact / RM Chat:** Direct, 1:1 messaging between an investor and their designated ZIDA Relationship Manager or Deal Officer.

#### B. Rich Interaction & Structural Enhancements

To maximize engagement and fluidity:

* **Interactive Metadata Action Cards:** Instead of static text messages stating *"Correction requested: Ticket size should read USD 12M"*, render **Action Cards** inside the chat thread with quick actions (e.g., `[Approve Change to $12M]` | `[Reject]` | `[Propose Revision]`).
* **SLA & Queue Transparency:** Provide response expectation badges (e.g., *"Typical response time: < 2 hours"* or *"Assigned Officer: Active Now"*) so users know their message isn't disappearing into a black hole.
* **Contextual Escalation:** Allow a user in a general inquiry thread to click `[Link to Opportunity]` or `[Attach to Pipeline]` to convert a general discussion into a deal-bound thread effortlessly.
* **Compliance & Audit Logging:** Enterprise-grade platforms require explicit audit trails, exportable transcript logs (PDF/CSV for legal compliance), and role-based attachment security.

---

## Summary of Immediate Recommendations

| Feature Area | Current State | Fortune 100 Target State |
| --- | --- | --- |
| **Account Control** | Tied to portal context | Centralized Account & Security Suite (MFA, Passwords, IdP/SSO) |
| **Channel Elasticity** | Restricted to engaged projects | Tri-tier model: General Concierge, Deal Channels, & RM Direct Messaging |
| **Workflow Automation** | Plain-text updates | Interactive Action Cards (in-line approvals, ticket updates) |
| **Trust Indicators** | Routing badges (e.g., `SMOKE routed`) | SLA response times, active status, and explicit audit compliance |

---

Here is the complete, high-level **Workflow & System Architecture Design** for the expanded Communication Hub, tailored for your dev team. This is designed to integrate seamlessly into a Role-Based Access Control (RBAC) model.

---

## Part 1: Communication Hub Workflow Design

### 1. Conceptual Architecture & Data Scoping

To enable non-project messaging without breaking security or cluttering the UI, split the Communication Hub into **three distinct scopes**:

```
                  ┌─────────────────────────────────────────┐
                  │    Communication Hub (Root View)        │
                  └────────────────────┬────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
│ General Concierge │        │ Relationship Desk │        │   Deal / Pipeline │
│   (Unrestricted)  │        │   (Assigned RM)   │        │     (Scoped)      │
└────────┬──────────┘        └────────┬──────────┘        └────────┬──────────┘
         │                            │                            │
         ▼                            ▼                            ▼
  • General Inquiries          • 1:1 Strategy               • Project Threads
  • Onboarding / KYC           • Portfolio Guidance         • Data Room Access
  • Platform Support           • Custom Inquiries           • Formal Deal Flow

```

---

### 2. Interactive Sequence Workflow (General Inquiries & Escalation)

This workflow outlines how a user initiates a non-deal message and how the system dynamically handles RBAC routing, SLA tracking, and deal promotion.

```
[ Investor / User ]            [ Platform API / Router ]          [ ZIDA Staff / Team ]
         │                                │                                │
         │  1. Create New Message Thread  │                                │
         │ ─────────────────────────────> │                                │
         │   (Selects: General Inquire)   │                                │
         │                                │  2. Check RBAC & Routing Rules │
         │                                │ ─────────────────────────────> │
         │                                │   • Target Role: `Concierge`   │
         │                                │   • Priority: Normal / High    │
         │                                │                                │
         │                                │  3. Assign Thread ID & SLA     │
         │                                │ ─────────────────────────────> │
         │                                │   • Set SLA: 2-Hour Response   │
         │                                │                                │
         │  4. SLA Badge & Active Queue   │                                │
         │ <───────────────────────────── │                                │
         │    "Assigned to Desk (Active)" │                                │
         │                                │                                │
         │                                │  5. Staff Responds / Action    │
         │                                │ <───────────────────────────── │
         │                                │                                │
         │  6. Receive Interactive Card   │                                │
         │ <───────────────────────────── │                                │
         │    [ Link to Deal ]            │                                │
         │                                │                                │
         │  7. User Clicks [Link Deal]    │                                │
         │ ─────────────────────────────> │                                │
         │                                │  8. Convert Thread Context     │
         │                                │ ─────────────────────────────> │
         │                                │   • Mutate Scope: `Deal_Bound` │
         │                                │   • Re-check RBAC (`Deal_RM`)  │

```

---

### 3. Developer Implementation Checklist for Communication Hub

#### A. RBAC Permission Matrix for Messaging

| User Role | General Concierge | RM Direct Desk | Engaged Deal Thread | Thread Escalation / Re-assignment |
| --- | --- | --- | --- | --- |
| **Guest / Prospect** | Create / Reply | Read Only (if assigned) | Restricted | Restricted |
| **Qualified Investor** | Create / Reply | Create / Reply | Full Access (if engaged) | Can Request Deal Link |
| **Deal Team / RM** | Read / Reply | Read / Reply | Full Access | Full Access / Re-assign Scope |
| **Platform Admin** | Full Access / Audit | Full Access / Audit | Full Access / Audit | Full Access |

#### B. Component & API Endpoint Specifications

* **API Endpoints to Expose:**
* `POST /api/v1/threads` — Body payload includes `type: "GENERAL" | "RM_DIRECT" | "ENGAGEMENT"` and optional `engagement_id`.
* `POST /api/v1/threads/{id}/escalate` — Re-binds a general thread to a specific deal pipeline.
* `GET /api/v1/threads` — Supports filtering by `scope` so the left sidebar can render tabbed navigation (`General`, `Assigned RMs`, `Active Deals`).


* **UI Action Cards Schema:**
Instead of rendering raw text, support JSON message payloads for interactive cards:
```json
{
  "message_id": "msg_98234",
  "type": "ACTION_CARD",
  "title": "Ticket Size Revision Requested",
  "attributes": {
    "proposed_value": "USD 12,000,000",
    "field": "ticket_size"
  },
  "actions": [
    { "label": "Approve Change", "action_code": "APPROVE_REVISION", "style": "primary" },
    { "label": "Propose Counter", "action_code": "COUNTER_OFFER", "style": "secondary" }
  ]
}

```



---

## Part 2: Account & Security Settings Review

Based on the current Settings screen implementation, the page currently serves primarily as a read-only profile display with basic local notification toggles. It lacks password management, session governance, multi-factor authentication (MFA), and RBAC-driven authorization states.

Here is an executive review and blueprint to elevate this page into a **Fortune 100 enterprise Account & Security Settings suite** while remaining aligned with platform RBAC and entitlement rules.

---

## 1. Executive Gap Analysis of Current UI

| Module | Current Implementation | Fortune 100 Target State |
| --- | --- | --- |
| **Profile & Identity** | Read-only text listing Name, Email, and Role. | Dynamic profile management with self-service avatar, entity affiliation badge, and identity status. |
| **Authentication & Security** | *Not implemented.* | Self-service Password Change, MFA Management, and Active Session Management. |
| **RBAC Integration** | Displays role name (`Qualified`) as static text. | Context-aware security controls governed by user permissions and identity provider (IdP) source. |
| **Notifications** | Local browser storage only with disclaimers. | Server-persisted multi-channel notification controls (In-App, Email, SMS, Webhooks). |

---

## 2. Dynamic RBAC & Entitlement Architecture

To maintain strict entitlement rules without confusing users, the UI should dynamically adapt depending on **Authentication Source (SSO vs. Local Password)** and **Assigned RBAC Role**.

```
                           ┌──────────────────────────────────┐
                           │      Account & Security UI       │
                           └────────────────┬─────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
       ┌───────────────────────────┐                 ┌───────────────────────────┐
       │   Local Auth (DB User)    │                 │   Federated (SSO / IdP)   │
       └─────────────┬─────────────┘                 └─────────────┬─────────────┘
                     │                                             │
      • Show Password Reset Form                     • Hide Password Reset Controls
      • Show MFA Setup / QR Code                     • Render "Managed by [Okta/Entra]"
      • Session Revocation Options                   • Show IdP Metadata Badge

```

### RBAC Permission Matrix for Security Actions

| Security Action | Guest / Prospect | Qualified Investor | Deal Team / RM | Platform Admin |
| --- | --- | --- | --- | --- |
| **Change Password** | Self-Service | Self-Service | Self-Service | Self-Service |
| **Manage MFA (TOTP/SMS)** | Optional | Required / Enforced | Required / Enforced | Required / Enforced |
| **Revoke Own Sessions** | Allowed | Allowed | Allowed | Allowed |
| **Force Password Reset (Other Users)** | Restricted | Restricted | Restricted | **Admin Governed** |
| **View Audit / Security Logs** | Own Logs Only | Own Logs Only | Team Logs | Full System Audit |

---

## 3. Targeted Recommendations & Wireframe Structure

### Structure: Tabbed Modern Enterprise Layout

Instead of a single scrolling list, organize settings into structured tabs:

1. **General Profile**
2. **Security & Authentication** *(New)*
3. **Sessions & Devices** *(New)*
4. **Notifications**

---

### Tab 2 UI Wireframe: Security & Authentication

```
+-----------------------------------------------------------------------------------+
|  ACCOUNT SETTINGS                                                                 |
|  [ General Profile ]  [ Security & Authentication ]  [ Sessions ]  [ Notifications]|
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  🔑 Password Management                                                          |
|  -------------------------------------------------------------------------------  |
|  [ Conditional Rendering based on Auth Type ]                                     |
|                                                                                   |
|  IF Local Auth User:                                                              |
|    Current Password:  [ ****************** ]                                      |
|    New Password:      [ ****************** ] (Min 12 chars, Special, Num)          |
|    Confirm Password:  [ ****************** ]                                      |
|    [ Update Password Button ]                                                     |
|                                                                                   |
|  IF SSO / Enterprise User (Okta / Azure AD):                                      |
|    🛡️ Managed Identity                                                            |
|    Your account is authenticated via Enterprise Single Sign-On (Azure AD).         |
|    Password updates must be managed via your corporate identity provider.          |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  🔒 Multi-Factor Authentication (MFA)                                             |
|  -------------------------------------------------------------------------------  |
|  Status: 🟢 Enabled (Authenticator App / TOTP)                                   |
|                                                                                   |
|  • Authenticator App (Google/Authy)              [ Reconfigure ]  [ Disable ]    |
|  • SMS Backup Verification (+1 *** *** 8920)     [ Manage ]                      |
|  • Security Keys (WebAuthn / YubiKey)            [ + Add Hardware Key ]          |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  🛡️ Account Entitlements & Role Scope                                            |
|  -------------------------------------------------------------------------------  |
|  Assigned Role: Qualified Investor (Level 2)                                      |
|  Permissions: Access Deal Data Rooms, Direct Communication Hub, MOU Signature      |
|  Request Elevated Permissions: [ Request Admin Review ]                            |
|                                                                                   |
+-----------------------------------------------------------------------------------+

```

---

### Tab 3 UI Wireframe: Active Sessions & Audit Trail

```
+-----------------------------------------------------------------------------------+
|  ACTIVE SESSIONS & SECURITY LOGS                                                  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  💻 Active Sessions                                                               |
|  -------------------------------------------------------------------------------  |
|  🟢 Chrome on MacOS (Current Session)                                             |
|     IP: 192.0.2.45 • Washington, D.C., USA • Last active: Just now                |
|                                                                                   |
|  📱 Safari on iPhone 15 Pro                                                       |
|     IP: 198.51.100.12 • London, UK • Last active: 2 hours ago                      |
|     [ Revoke Session ]                                                            |
|                                                                                   |
|  [ Revoke All Other Sessions ]                                                    |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  📋 Recent Security Activity                                                       |
|  -------------------------------------------------------------------------------  |
|  Timestamp            Event                      IP Address       Status          |
|  2026-07-23 09:12     Password Auth Success      192.0.2.45       SUCCESS         |
|  2026-07-21 14:05     MFA Challenge Passed       192.0.2.45       SUCCESS         |
|  2026-07-18 22:40     Failed Login Attempt       203.0.113.5      FAILED (Blocked)|
|                                                                                   |
+-----------------------------------------------------------------------------------+

```

---

## 4. Developer API Specifications

To support this enhanced security layout, your backend team can implement these key RESTful endpoints:

### Self-Service Security Endpoints

* **`PUT /api/v1/user/security/password`**
* *Request Body:* `{ current_password, new_password }`
* *RBAC Gate:* Local users only (`auth_provider == "LOCAL"`).


* **`POST /api/v1/user/security/mfa/setup`**
* *Response:* Generates TOTP secret and QR code payload.


* **`GET /api/v1/user/sessions`**
* *Response:* List of active tokens/sessions with user agent, IP location, and `is_current` flag.


* **`DELETE /api/v1/user/sessions/{session_id}`**
* *Action:* Invalidate refresh token for target session.



### Admin-Governed Security Endpoints (Admin Portal Scope)

* **`POST /api/v1/admin/users/{user_id}/reset-password`**
* *RBAC Gate:* Requires `Role == "PLATFORM_ADMIN"`. Triggers email magic link.


* **`POST /api/v1/admin/users/{user_id}/revoke-sessions`**
* *RBAC Gate:* Requires `Role == "PLATFORM_ADMIN"`. Immediately revokes access for compromised accounts.