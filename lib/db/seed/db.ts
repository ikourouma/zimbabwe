import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../schema";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString || connectionString.includes("placeholder")) {
  throw new Error("DATABASE_URL_UNPOOLED (or DATABASE_URL) must be set in .env.local for db:seed");
}

// No explicit `ssl` option needed — `pg` parses `sslmode=require` straight out of the
// connection string itself (via pg-connection-string) and enables TLS accordingly.
const pool = new Pool({ connectionString });

export const seedDb = drizzle(pool, { schema });
export { pool as seedPool };
