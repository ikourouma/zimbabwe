/** Formats the DB-guaranteed-unique `profiles.accountSeq` into the human-facing traceability id
 *  shown across the Users & Roles workspace and the Institutional Compliance Dossier (e.g.
 *  "ZIDA-000482"). Deliberately never stored pre-formatted — see lib/db/schema/profiles.ts — so
 *  this display format can change later without a migration. */
export function formatAccountRef(seq: number): string {
  return `ZIDA-${String(seq).padStart(6, "0")}`;
}
