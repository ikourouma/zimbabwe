import { defineConfig } from "drizzle-kit";

// `generate` only diffs the TS schema against the migrations folder and needs no live
// connection, so a placeholder is fine there. `migrate` / `push` / `studio` actually connect and
// will fail with Neon's own clear connection error if DATABASE_URL_UNPOOLED isn't set for real —
// copy .env.example to .env.local and fill it in before running those.
const connectionUrl =
  process.env.DATABASE_URL_UNPOOLED ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "./lib/db/schema/*.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Drizzle Kit (migration generation/push) always uses the direct, unpooled connection.
    url: connectionUrl,
  },
  strict: true,
  verbose: true,
});
