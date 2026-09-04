import { and, eq, or } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { investorEngagements, ministries, projectSecondaryMinistries, projects } from "@/lib/db/schema";
import { projectMatchesMinistry } from "@/lib/entitlements/ministry-scope";
import type { InvestmentProject, LeadInquiry } from "@/lib/types";
import type { strategicInquiries } from "@/lib/db/schema";

type InquiryRow = InferSelectModel<typeof strategicInquiries>;

const PUBLIC_INQUIRY_TYPES = new Set<LeadInquiry["type"]>([
  "registration",
  "contact",
  "investment_interest",
  "document_request",
  "meeting_request",
  "strategic_partnership",
  "valuation_teaser",
]);

export function validatePublicInquiryBody(
  body: unknown
): { ok: true; inquiry: Omit<LeadInquiry, "id" | "createdAt"> } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const raw = body as Record<string, unknown>;
  const type = raw.type;
  if (typeof type !== "string" || !PUBLIC_INQUIRY_TYPES.has(type as LeadInquiry["type"])) {
    return { ok: false, error: "Invalid inquiry type." };
  }

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  if (!name) return { ok: false, error: "Name is required." };
  if (!email || !email.includes("@")) return { ok: false, error: "A valid email is required." };

  const inquiry: Omit<LeadInquiry, "id" | "createdAt"> = {
    type: type as LeadInquiry["type"],
    name,
    email,
    phone: typeof raw.phone === "string" ? raw.phone.trim() || undefined : undefined,
    organization: typeof raw.organization === "string" ? raw.organization.trim() || undefined : undefined,
    message: typeof raw.message === "string" ? raw.message.trim() || undefined : undefined,
    contactReasonId: typeof raw.contactReasonId === "string" ? raw.contactReasonId : undefined,
    projectId: typeof raw.projectId === "string" ? raw.projectId : undefined,
    engagementType:
      raw.engagementType === "investor" || raw.engagementType === "government_dfi" || raw.engagementType === "strategic_partner"
        ? raw.engagementType
        : undefined,
    investorType: typeof raw.investorType === "string" ? raw.investorType : undefined,
    sectorIds: Array.isArray(raw.sectorIds) ? raw.sectorIds.filter((id): id is string => typeof id === "string") : undefined,
    ticketSizeRange: typeof raw.ticketSizeRange === "string" ? raw.ticketSizeRange : undefined,
    partnershipType: typeof raw.partnershipType === "string" ? raw.partnershipType : undefined,
    ministryRepresented: typeof raw.ministryRepresented === "string" ? raw.ministryRepresented : undefined,
    natureOfEngagement: typeof raw.natureOfEngagement === "string" ? raw.natureOfEngagement : undefined,
    hqAddress: typeof raw.hqAddress === "string" ? raw.hqAddress : undefined,
    businessRegistrationId: typeof raw.businessRegistrationId === "string" ? raw.businessRegistrationId : undefined,
    websiteUrl: typeof raw.websiteUrl === "string" ? raw.websiteUrl : undefined,
    status: "pending",
  };

  return { ok: true, inquiry };
}

export function pickAllowedUpdates<T extends Record<string, unknown>>(
  updates: Record<string, unknown> | undefined,
  allowed: (keyof T)[]
): Partial<T> {
  if (!updates) return {};
  const out: Partial<T> = {};
  for (const key of allowed) {
    const k = String(key);
    if (k in updates) out[key] = updates[k] as T[typeof key];
  }
  return out;
}

export function isValidConciergeAttachmentKey(storageKey: string, userId: string): boolean {
  return storageKey.startsWith(`messages/concierge/${userId}/`);
}

export function isValidProjectAttachmentKey(storageKey: string, projectId: string, userId: string): boolean {
  const prefix = `messages/${projectId}/`;
  if (!storageKey.startsWith(prefix)) return false;
  const rest = storageKey.slice(prefix.length);
  const parts = rest.split("/");
  if (parts.length >= 2 && parts[0] === userId) return true;
  // Legacy keys uploaded before per-user path prefixing (project-scoped only).
  return parts.length === 1;
}

export function filterOwnedAttachments<T extends { storageKey?: string }>(
  attachments: T[],
  userId: string,
  scope: { kind: "concierge" } | { kind: "project"; projectId: string }
): T[] {
  return attachments.filter((a) => {
    if (!a.storageKey) return false;
    return scope.kind === "concierge"
      ? isValidConciergeAttachmentKey(a.storageKey, userId)
      : isValidProjectAttachmentKey(a.storageKey, scope.projectId, userId);
  });
}

export async function actorHasProjectGovernanceAccess(
  actor: { role: string; userId: string; ministryId?: string | null },
  project: InvestmentProject
): Promise<boolean> {
  if (actor.role === "admin" || actor.role === "super_admin") return true;
  if (actor.role === "ministry_admin" || actor.role === "government") {
    return Boolean(actor.ministryId && projectMatchesMinistry(project, actor.ministryId));
  }
  if (actor.role === "qualified") {
    if (project.createdBy === actor.userId) return true;
    if (project.teamAssignedUserIds?.includes(actor.userId)) return true;
    const [engagement] = await db
      .select({ id: investorEngagements.id })
      .from(investorEngagements)
      .where(
        and(
          eq(investorEngagements.projectId, project.id),
          or(eq(investorEngagements.userId, actor.userId), eq(investorEngagements.assignedUserId, actor.userId))
        )
      )
      .limit(1);
    return Boolean(engagement);
  }
  return false;
}

async function ministryProjectIds(ministryId: string): Promise<Set<string>> {
  const primary = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.primaryBeneficiaryMinistryId, ministryId));
  const secondary = await db
    .select({ projectId: projectSecondaryMinistries.projectId })
    .from(projectSecondaryMinistries)
    .where(eq(projectSecondaryMinistries.ministryId, ministryId));
  return new Set([...primary.map((p) => p.id), ...secondary.map((p) => p.projectId)]);
}

export async function filterInquiriesForMinistryAdmin(
  rows: InquiryRow[],
  ministryId: string
): Promise<InquiryRow[]> {
  const [ministry] = await db.select().from(ministries).where(eq(ministries.id, ministryId)).limit(1);
  if (!ministry) return [];
  const projectIds = await ministryProjectIds(ministryId);
  const ministryNames = new Set([ministry.name.toLowerCase(), ministry.shortName.toLowerCase()]);

  return rows.filter((row) => {
    if (row.projectId && projectIds.has(row.projectId)) return true;
    if (!row.ministryRepresented) return false;
    const rep = row.ministryRepresented.trim().toLowerCase();
    return ministryNames.has(rep);
  });
}
