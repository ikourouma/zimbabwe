import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Every approve/publish/override/status-change mutation writes a row here — a real "Governance
// Audit Trail" surfaced in /super-admin, and one of the concrete trust-building features called
// out to the board (see PRODUCTION_MIGRATION_PLAN.md Phase 1).
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
