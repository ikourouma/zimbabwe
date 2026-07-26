import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import type { AuditLogEntry } from "@/lib/types";

interface LogAuditEventInput {
  actorUserId: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/** Writes one governance audit row. Fire-and-log — callers should not let a logging failure
 *  block the underlying mutation, so this never throws (errors are caught and logged only). */
export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: { actorName: input.actorName ?? null, ...(input.metadata ?? {}) },
    });
  } catch (error) {
    console.error("logAuditEvent failed", error);
  }
}

/** Joins `audit_logs` to `neon_auth."user"` for a display-ready actor name and to `profiles` for
 *  the actor's role, since the actor is stored as a bare Neon Auth user id (see
 *  lib/db/schema/audit.ts) — the role backs the Sovereign Telemetry & Audit Filter Bar's Actor
 *  Role Scope filter on /super-admin/audit. */
export async function fetchAuditLogs(limit = 200): Promise<AuditLogEntry[]> {
  const rows = await db.execute<{
    id: string;
    actor_user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: unknown;
    created_at: string;
    actor_name: string | null;
    actor_role: string | null;
  }>(sql`
    SELECT
      al.id,
      al.actor_user_id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.metadata,
      al.created_at,
      u.name AS actor_name,
      p.role AS actor_role
    FROM audit_logs al
    LEFT JOIN neon_auth."user" u ON u.id::text = al.actor_user_id
    LEFT JOIN profiles p ON p.user_id = al.actor_user_id
    ORDER BY al.created_at DESC
    LIMIT ${limit}
  `);

  return rows.rows.map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    actorRole: (row.actor_role as AuditLogEntry["actorRole"]) ?? null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

/**
 * A single project's full governance history: its own `project.status_changed` rows plus every
 * `engagement.*` event for engagements against it (matched via the `projectId` stamped into the
 * engagement audit metadata — see app/api/engagements/route.ts and app/api/engagements/[id]/route.ts).
 * Unlike `/api/audit-logs` (super_admin/admin/government only), this is deliberately narrow enough
 * to expose to `qualified` investors too — see GET /api/projects/[id]/history — since it's scoped
 * to one project's own record rather than the whole platform's activity.
 */
export async function fetchProjectHistory(projectId: string): Promise<AuditLogEntry[]> {
  const rows = await db.execute<{
    id: string;
    actor_user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: unknown;
    created_at: string;
    actor_name: string | null;
  }>(sql`
    SELECT
      al.id,
      al.actor_user_id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.metadata,
      al.created_at,
      u.name AS actor_name
    FROM audit_logs al
    LEFT JOIN neon_auth."user" u ON u.id::text = al.actor_user_id
    WHERE (al.entity_type = 'project' AND al.entity_id = ${projectId})
       OR (al.entity_type = 'engagement' AND al.metadata ->> 'projectId' = ${projectId})
    ORDER BY al.created_at ASC
  `);

  return rows.rows.map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

/**
 * Publishing-override history for the Sovereign Circuit Breaker queue: every `project.override_applied`
 * and `project.override_reverted` audit row, joined to the project's current title and the actor's
 * display name. Ordered newest-first so the override page can show the recent-activity table.
 */
export async function fetchOverrideHistory(limit = 30): Promise<AuditLogEntry[]> {
  const rows = await db.execute<{
    id: string;
    actor_user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: unknown;
    created_at: string;
    actor_name: string | null;
    project_title: string | null;
  }>(sql`
    SELECT
      al.id,
      al.actor_user_id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.metadata,
      al.created_at,
      u.name AS actor_name,
      p.title AS project_title
    FROM audit_logs al
    LEFT JOIN neon_auth."user" u ON u.id::text = al.actor_user_id
    LEFT JOIN projects p ON p.id::text = al.entity_id
    WHERE al.action IN ('project.override_applied', 'project.override_reverted')
    ORDER BY al.created_at DESC
    LIMIT ${limit}
  `);

  return rows.rows.map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: {
      ...((row.metadata as Record<string, unknown>) ?? {}),
      projectTitle: row.project_title,
    },
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function fetchRecentAuditLogsForEntity(entityType: string, limit = 20): Promise<AuditLogEntry[]> {
  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.entityType, entityType))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    actorUserId: row.actorUserId,
    actorName: (row.metadata as Record<string, unknown> | null)?.actorName as string | null | undefined ?? null,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Recent audit rows *performed by* a given actor (as opposed to fetchAuditLogsForEntityId, which
 *  covers events *about* an entity) — e.g. a qualified investor's own document-download activity,
 *  surfaced in the Institutional Compliance Dossier's Portfolio & Activity tab. */
export async function fetchAuditLogsByActor(actorUserId: string, limit = 50): Promise<AuditLogEntry[]> {
  const rows = await db.execute<{
    id: string;
    actor_user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: unknown;
    created_at: string;
  }>(sql`
    SELECT id, actor_user_id, action, entity_type, entity_id, metadata, created_at
    FROM audit_logs
    WHERE actor_user_id = ${actorUserId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  return rows.rows.map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actorName: null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

/** Recent audit rows for one specific entity instance (e.g. a single user's account activity in
 *  the Users & Roles detail drawer). Joins to Neon Auth for the actor's display name. */
export async function fetchAuditLogsForEntityId(
  entityType: string,
  entityId: string,
  limit = 20
): Promise<AuditLogEntry[]> {
  const rows = await db.execute<{
    id: string;
    actor_user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: unknown;
    created_at: string;
    actor_name: string | null;
  }>(sql`
    SELECT
      al.id,
      al.actor_user_id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.metadata,
      al.created_at,
      u.name AS actor_name
    FROM audit_logs al
    LEFT JOIN neon_auth."user" u ON u.id::text = al.actor_user_id
    WHERE al.entity_type = ${entityType} AND al.entity_id = ${entityId}
    ORDER BY al.created_at DESC
    LIMIT ${limit}
  `);

  return rows.rows.map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}
