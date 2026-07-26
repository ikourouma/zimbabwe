// Kept separate from lib/db/schema/enums.ts so lib/auth/session.ts's public surface doesn't
// force every importer to pull in the Drizzle schema module graph.
export type AccountRole = "registered" | "qualified" | "government" | "admin" | "super_admin";
