import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../schema";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString || connectionString.includes("placeholder")) {
  throw new Error("DATABASE_URL_UNPOOLED (or DATABASE_URL) must be set in .env.local for db:seed");
}

const pool = new Pool({ connectionString });

export const seedDb = drizzle(pool, { schema });
export { pool as seedPool };
