import { sql } from "@/lib/db";

/** Exact DDL from drizzle/0153_contact_details_v4.sql — IF NOT EXISTS safe. */
const CONTACT_DETAILS_V4_0153_SQL = `
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "nickname" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "secondary_phone" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "gender" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "spouse_name" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "spouse_dob" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "dependents" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "dl_state" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "license_number_enc" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "license_number_iv" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "license_number_last4" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "license_expiration" text;
`;

let ensured = false;

export async function contactDetailsV4ColumnsExist(): Promise<boolean> {
  const rows = await sql<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'nickname'
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

/**
 * Apply drizzle/0153 on this connection if Contact Details v4 columns are missing.
 * Idempotent. Prevents bare `select().from(contacts)` from blanking the desk when
 * migrate lagged behind a deploy (see #354 / Optional chrome failed).
 */
export async function ensureContactDetailsV4Columns(): Promise<boolean> {
  if (ensured) return true;
  if (await contactDetailsV4ColumnsExist()) {
    ensured = true;
    return true;
  }
  await sql.unsafe(CONTACT_DETAILS_V4_0153_SQL);
  const ok = await contactDetailsV4ColumnsExist();
  if (ok) ensured = true;
  return ok;
}
