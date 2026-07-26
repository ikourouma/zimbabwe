import { pgTable, text, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { accountRoleEnum, accountStatusEnum } from "./enums";
import { ministries } from "./taxonomies";
import type { NotificationPreferences } from "@/lib/types";

/**
 * 1:1 with a Neon Managed Better Auth user (`neon_auth.user`), linked by `userId`. Not a hard
 * FK — `neon_auth` is a separate schema managed by the auth service itself, outside this
 * Drizzle schema — so referential integrity for `userId` is enforced at the application layer
 * (every write here happens right after/alongside a Better Auth signup or role-assignment
 * action, never independently).
 */
export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  // System-generated traceability id (Institutional Compliance Dossier round) — a Postgres
  // `serial`, so uniqueness is DB-guaranteed with no app-level race condition and every existing
  // row backfills automatically on migration. Never displayed raw — see formatAccountRef() in
  // lib/utils/account-ref.ts, so the display format (e.g. "ZIDA-000482") can change later without
  // a migration.
  accountSeq: serial("account_seq").notNull().unique(),
  role: accountRoleEnum("role").notNull().default("registered"),
  organization: text("organization"),
  // For government-persona users tied to a specific ministry (e.g. an Embassy Investment Desk
  // or Beneficiary Ministry account) — null for investor/admin/super_admin roles.
  ministryId: text("ministry_id").references(() => ministries.id, { onDelete: "set null" }),
  accountStatus: accountStatusEnum("account_status").notNull().default("active"),
  // Clickwrap NDA acceptance (Engagement Draft-Lock and NDA plan): the immutable legal audit trail
  // recorded when a qualified investor accepts the Sovereign Confidentiality Framework on first
  // Deal Room access — timestamp, agreement version, IP, and the legal title they attested under.
  // Stored here (not neon_auth.user, which is service-managed and outside this Drizzle schema).
  ndaAcceptedAt: timestamp("nda_accepted_at", { withTimezone: true }),
  ndaVersion: text("nda_version"),
  ndaAcceptedIp: text("nda_accepted_ip"),
  ndaAcceptedTitle: text("nda_accepted_title"),
  // Server-persisted per-user notification preferences (Account & Security suite) — replaces the
  // old browser-localStorage placeholder. Null until the user first saves; the app falls back to
  // DEFAULT_NOTIFICATION_PREFERENCES (all on) in that case.
  notificationPrefs: jsonb("notification_prefs").$type<NotificationPreferences>(),
  // R2 object key for the user's uploaded avatar image, streamed via GET /api/avatars/[userId].
  // Null falls back to the computed initials badge.
  avatarKey: text("avatar_key"),
  // Optional profile metadata surfaced/edited in the Account suite and admin Users workspace.
  jobTitle: text("job_title"),
  phone: text("phone"),
  // Institutional KYC fields — collected at Tier-2 NDA acceptance (see nda-gate.tsx), not at
  // self-registration, so top-of-funnel signup stays frictionless (KYC-at-NDA gate policy).
  hqAddress: text("hq_address"),
  businessRegistrationId: text("business_registration_id"),
  websiteUrl: text("website_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
