import type { AuditLogEntry } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";
import { isWithinTimeHorizon, TIME_HORIZON_LABELS, type TimeHorizon } from "@/lib/utils/time-horizon";

/**
 * Sovereign Telemetry & Audit Filter Bar taxonomy (/super-admin/audit) — categorizes every
 * `logAuditEvent()` call site's `entityType` (see app/api/**\/route.ts) into one of five
 * mutation-class buckets, so "All" always equals the sum of the five category pills.
 */
export type AuditCategoryKey = "projects" | "security" | "settings" | "documents" | "messages";

export const AUDIT_CATEGORY_LABELS: Record<AuditCategoryKey, string> = {
  projects: "Projects",
  security: "User & Security",
  settings: "Site Settings",
  documents: "VDR & Documents",
  messages: "Messages & Hub",
};

export const AUDIT_CATEGORY_ORDER: AuditCategoryKey[] = ["projects", "security", "settings", "documents", "messages"];

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
};

/** Falls back to `null` (excluded from every category pill's count, but still visible via the
 *  granular Entity Type filter) for any future entityType not yet added above. */
export function categorizeEntityType(entityType: string): AuditCategoryKey | null {
  return ENTITY_TYPE_CATEGORY[entityType] ?? null;
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

/** Humanizes any entityType not in the map above, so a new logAuditEvent() call site never shows
 *  a raw snake_case value in the dropdown. */
export function entityTypeLabel(entityType: string): string {
  return (
    ENTITY_TYPE_LABELS[entityType] ??
    entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
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
