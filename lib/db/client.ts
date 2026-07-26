import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// Route Handlers run in the Node.js runtime (not edge) so the WebSocket-backed driver is
// available, giving us real multi-statement transactions (audit-log writes alongside
// approve/publish mutations) — the HTTP-only driver can't do that.
neonConfig.webSocketConstructor = ws;

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
  // Reuse the pool across hot-reloads in dev and across warm serverless invocations.
  if (!global.__dbPool) {
    global.__dbPool = new Pool({ connectionString });
  }
  return global.__dbPool;
}

export const db = drizzle(getPool(), { schema });
export type Database = typeof db;
