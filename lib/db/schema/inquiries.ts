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
  status: inquiryStatusEnum("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
