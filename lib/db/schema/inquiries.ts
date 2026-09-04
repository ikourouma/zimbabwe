import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { engagementTypeEnum, inquiryStatusEnum, leadInquiryTypeEnum } from "./enums";
import { contactReasons } from "./taxonomies";
import { projects } from "./projects";

// Mirrors LeadInquiry (lib/types/index.ts) exactly, including the Strategic Partnerships &
// Inquiries wizard's extra fields (engagementType through natureOfEngagement) — those stay
// nullable since they're only populated by that flow, not the regular Contact form.
export const strategicInquiries = pgTable("strategic_inquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: leadInquiryTypeEnum("type").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  organization: text("organization"),
  message: text("message"),
  contactReasonId: text("contact_reason_id").references(() => contactReasons.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  engagementType: engagementTypeEnum("engagement_type"),
  investorType: text("investor_type"),
  // Multi-select sector interest from the wizard — kept as a lightweight array rather than a
  // join table since it's an ancillary preference field, not a referential-integrity-critical
  // relationship like project<->sector.
  sectorIds: text("sector_ids").array(),
  ticketSizeRange: text("ticket_size_range"),
  partnershipType: text("partnership_type"),
  ministryRepresented: text("ministry_represented"),
  natureOfEngagement: text("nature_of_engagement"),
  // Soft-linked to the submitter's Neon Auth account when they're signed in (Investor
  // Qualification Vetting plan) — not a hard FK, same convention as profiles.userId, since
  // neon_auth is a separate service-managed schema. Null for anonymous/pre-account submissions;
  // lets the draft-autosave/resume flow and the admin "Open Dossier" link both key off one id
  // instead of a fragile email match.
  userId: text("user_id"),
  // Institutional KYC fields, captured up-front in the Strategic Partnerships wizard now instead
  // of only after qualification at the NDA gate — see the KYC-before-qualified rule driving this
  // plan. Mirrors profiles.hqAddress/businessRegistrationId/websiteUrl exactly so approval can
  // copy these straight onto the matched profile row.
  hqAddress: text("hq_address"),
  businessRegistrationId: text("business_registration_id"),
  websiteUrl: text("website_url"),
  // Staff-authored message shown back to the applicant on decline or "changes requested" — the
  // reason-required vetting workflow's one applicant-visible field.
  reviewNotes: text("review_notes"),
  status: inquiryStatusEnum("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
