import type { AuditLogEntry } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";
import { isWithinTimeHorizon, TIME_HORIZON_LABELS, type TimeHorizon } from "@/lib/utils/time-horizon";

/**
 * Sovereign Telemetry & Audit Filter Bar taxonomy (/super-admin/audit) — categorizes every
 * `logAuditEvent()` call site's `entityType` (see app/api/**\/route.ts) into one of five
 * mutation-class buckets, so "All" always equals the sum of the five category pills.
 */
export type AuditCategoryKey = "projects" | "security" | "settings" | "documents" | "messages" | "other";

export const AUDIT_CATEGORY_LABELS: Record<AuditCategoryKey, string> = {
  projects: "Projects",
  security: "User & Security",
  settings: "Site Settings",
  documents: "VDR & Documents",
  messages: "Messages & Hub",
  other: "Other",
};

export const AUDIT_CATEGORY_ORDER: AuditCategoryKey[] = [
  "projects",
  "security",
  "settings",
  "documents",
  "messages",
  "other",
];

// Every real entityType currently written by logAuditEvent() call sites gets a home here.
// "engagement" (deal-room lifecycle, MOU drafts, follow-through) reads as project governance, not
// a separate bucket. "inquiry" (contact-form leads, concierge escalations, elevation requests)
// reads as inbound-communication routed through the Communication Hub, hence "Messages & Hub".
const ENTITY_TYPE_CATEGORY: Record<string, AuditCategoryKey> = {
  project: "projects",
  engagement: "projects",
  user: "security",
  user_invite: "security",
  profile: "security",
  site_settings: "settings",
  site_content_block: "settings",
  taxonomy: "settings",
  announcement: "settings",
  faq_entry: "settings",
  project_document: "documents",
  project_message: "messages",
  inquiry: "messages",
  // Organisational configuration, alongside taxonomy: a case manager assigned to a ministry is a
  // change to how that ministry is set up on the platform.
  ministry: "settings",
  marketing_popup: "settings",
  // An investor's team invitation is an access grant, and lands where user invites land.
  org_invite: "security",
};

/**
 * Falls back to "other" rather than to `null`.
 *
 * The header above promises that All equals the sum of the category pills, and a `null` return
 * broke that promise silently: three entity types written since this map was last extended —
 * ministry, org_invite and marketing_popup — belonged to no category, so the pills read 45, 9, 14,
 * 1 and 19 against an All of 93 and an export labelled 93. Five records were reachable only by
 * clearing the filter, on the exhibit the platform offers to auditors, and nothing anywhere said
 * so. A visible "Other" pill cannot go quiet in the same way: the next unmapped entity type shows
 * up as a number someone can ask about.
 */
export function categorizeEntityType(entityType: string): AuditCategoryKey {
  return ENTITY_TYPE_CATEGORY[entityType] ?? "other";
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  project: "Project",
  engagement: "Engagement",
  user: "User Account",
  user_invite: "User Invite",
  profile: "Profile / NDA",
  site_settings: "Site Settings",
  site_content_block: "Content Block",
  taxonomy: "Taxonomy",
  announcement: "Announcement",
  faq_entry: "FAQ Entry",
  project_document: "Document / VDR",
  project_message: "Message",
  inquiry: "Inquiry",
};

/**
 * The Entity ID column exists to say which record an action touched. Some entities have only one
 * record, and their id is a placeholder the schema needs rather than an identifier that
 * distinguishes anything: platform settings live in a row literally keyed "singleton". Showing that
 * word to an auditor puts a developer's implementation detail into the governance trail, where it
 * invites the question of what other singletons there might be. There is no "which" to answer, so
 * the column says so. The raw value is still exported verbatim in the CSV, for machine readers.
 */
export function auditEntityIdLabel(entityId: string): string {
  return entityId === "singleton" ? "—" : entityId;
}

/** Humanizes any entityType not in the map above, so a new logAuditEvent() call site never shows
 *  a raw snake_case value in the dropdown. */
export function entityTypeLabel(entityType: string): string {
  return (
    ENTITY_TYPE_LABELS[entityType] ??
    entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const ACTION_LABELS: Record<string, string> = {
  "project.created": "Project created",
  "project.status_changed": "Project status changed",
  "project.override": "Publishing override",
  "inquiry.submitted": "Inquiry submitted",
  "inquiry.status_changed": "Inquiry decided",
  "engagement.created": "Engagement created",
  "engagement.published": "Engagement certified",
  "engagement.status_changed": "Engagement status changed",
  "engagement.withdrawn": "Engagement withdrawn",
  "engagement.correction_requested": "Engagement correction requested",
  "mou.status_changed": "Memorandum status changed",
  "mou.approved": "Memorandum approved",
  "mou.draft_updated": "Memorandum draft updated",
  "message.created": "Message sent",
  "nda.accepted": "Confidentiality framework accepted",
  "user.updated": "User updated",
  "user.role_changed": "Role changed",
  "site_settings.updated": "Site settings updated",
  "taxonomy.addSector": "Sector added",
  "taxonomy.removeSector": "Sector removed",
  "taxonomy.addMinistry": "Ministry added",
  "taxonomy.removeMinistry": "Ministry removed",
  "taxonomy.addPillar": "Strategic pillar added",
  "taxonomy.removePillar": "Strategic pillar removed",
  "taxonomy.addGoal": "Development goal added",
  "taxonomy.removeGoal": "Development goal removed",
};

/**
 * The action as a phrase rather than as its identifier.
 *
 * The log rendered the raw action with its dot swapped for an arrow, so the column an auditor reads
 * first said "message → created", "taxonomy → removeSector" and "inquiry → status_changed". Those
 * are function names. This is the register in which the governance trail is offered as evidence, so
 * it should read as English; the identifier is still exported verbatim in the CSV, where a machine
 * is the reader.
 */
export function auditActionLabel(action: string): string {
  const known = ACTION_LABELS[action];
  if (known) return known;
  // Unknown actions still beat the raw string: split the namespace, break camelCase, sentence-case.
  const [, verb = action] = action.split(".");
  const words = verb.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Re-exported under the "Audit" name for backward compatibility with existing imports — the
// underlying type/labels/helper now live in lib/utils/time-horizon.ts so the Inquiries filter bar
// can share the exact same "Today / 24h / 7d / 30d / Custom" semantics.
export type AuditTimeHorizon = TimeHorizon;
export const AUDIT_TIME_HORIZON_LABELS = TIME_HORIZON_LABELS;

export interface AuditFilters {
  search: string;
  timeHorizon: AuditTimeHorizon;
  /** yyyy-mm-dd, only used when timeHorizon === "custom". */
  customFrom?: string;
  customTo?: string;
  actorRole: AccountRole | "all";
  category: AuditCategoryKey | "all";
  entityType: string; // "all" or a real entityType value
}

export const DEFAULT_AUDIT_FILTERS: AuditFilters = {
  search: "",
  timeHorizon: "all",
  actorRole: "all",
  category: "all",
  entityType: "all",
};

export { isWithinTimeHorizon };

type AuditFilterDimension = "search" | "time" | "actorRole" | "category" | "entityType";

/** Matches one entry against the full filter set. `exclude` skips a single dimension — used to
 *  compute each pill/button's own "live" count against everything *except* itself, the same
 *  pattern the project registries' governance-stage pills use. */
export function matchesAuditFilters(
  entry: AuditLogEntry,
  filters: AuditFilters,
  exclude?: AuditFilterDimension
): boolean {
  if (exclude !== "search" && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const haystack = [
      entry.action,
      entry.actorName ?? "",
      entry.entityType,
      entry.entityId,
      entry.metadata ? JSON.stringify(entry.metadata) : "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (exclude !== "time" && !isWithinTimeHorizon(entry.createdAt, filters.timeHorizon, filters.customFrom, filters.customTo)) {
    return false;
  }
  if (exclude !== "actorRole" && filters.actorRole !== "all" && entry.actorRole !== filters.actorRole) {
    return false;
  }
  if (exclude !== "category" && filters.category !== "all" && categorizeEntityType(entry.entityType) !== filters.category) {
    return false;
  }
  if (exclude !== "entityType" && filters.entityType !== "all" && entry.entityType !== filters.entityType) {
    return false;
  }
  return true;
}
