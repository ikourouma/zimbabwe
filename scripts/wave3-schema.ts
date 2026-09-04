import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

async function main() {
  await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS investment_source text`);
  await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS capital_structure text`);
  await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS shareholder_contribution text`);
  await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS sector_experience_years text`);
  await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS prior_projects_completed text`);
  await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS annual_turnover text`);
  await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS financing_confirmation text`);
  await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS financing_partners text`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS field_visibility jsonb`);
  await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_secret text`);
  await db.execute(sql`DO $$ BEGIN
    CREATE TYPE accreditation_kind AS ENUM ('commitment_letter', 'investment_guarantee');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await db.execute(sql`DO $$ BEGIN
    CREATE TYPE accreditation_status AS ENUM ('pending', 'approved', 'declined');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accreditation_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      kind accreditation_kind NOT NULL,
      storage_key text NOT NULL,
      file_name text NOT NULL,
      status accreditation_status NOT NULL DEFAULT 'pending',
      review_notes text,
      reviewed_by text,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  console.log("wave3 schema applied");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
