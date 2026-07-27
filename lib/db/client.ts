import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Plain TCP `pg` driver (not the WebSocket-tunneled `@neondatabase/serverless` one) — Route
// Handlers run in the Node.js runtime with real TCP sockets available, and this is what Neon's
// own docs recommend for a persistent Node.js server (as opposed to edge/serverless functions
// with no raw sockets). The WebSocket driver hung indefinitely on Hostinger's hosting/proxy
// layer, timing out every DB-touching route — see PRODUCTION_MIGRATION_PLAN.md.

declare global {
  var __dbPool: Pool | undefined;
}

function getPool() {
  // Same rationale as lib/auth/server.ts: `next build` imports this module transitively for
  // any route that references it, even unused ones, so a hard throw on a missing env var here
  // would break builds that have no DB configured yet (e.g. the live Hostinger build). An
  // actual query against this placeholder fails at request time with a normal connection
  // error, which is the right place for that failure to surface.
  const connectionString =
    process.env.DATABASE_URL ?? "postgresql://unset:unset@unset-database-url.invalid/unset";
  // No explicit `ssl` option needed — `pg` parses `sslmode=require` straight out of the
  // connection string itself (via pg-connection-string) and enables TLS accordingly.
  // Reuse the pool across hot-reloads in dev and across warm serverless invocations.
  if (!global.__dbPool) {
    global.__dbPool = new Pool({ connectionString });
  }
  return global.__dbPool;
}

export const db = drizzle(getPool(), { schema });
export type Database = typeof db;
