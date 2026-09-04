# Inquiry to qualification

## Path

1. Visitor registers (`registered`) or submits Contact / Strategic Partnership / investment-interest inquiry.
2. Inquiry lands in **Admin → Inquiries** (and executive-routed items in **Super Admin → Inquiries**).
3. ZIDA reviews KYC completeness on investor-type inquiries.
4. **Approve** (Admin / Super Admin only) can upgrade a matching account to `qualified`.
5. The investor signs the Deal Room NDA on first qualified-console visit.
6. Qualification unlocks proposals, engagements, Communication Hub, and MOU.

## Views

Admin, Super Admin, and Ministry all use Kanban / List / Table / Matrix plus a detail drawer.

Ministry is **read-only**. Approving an inquiry is an account-governance decision, not a ministry pipeline decision.

## What registration is not

Creating an account does **not** grant Deal Room deal tools. Registered users browse the governed pipeline and save projects. Qualification is a separate ZIDA review step.

## Production sign-up

Before open registration, turn on **Require email verification** in the Neon Auth console. If sign-up succeeds but no session is issued, the UI tells the user to verify email and then sign in.
