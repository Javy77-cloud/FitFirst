import { sql } from "@/lib/db";

/** Exact DDL from drizzle/0154_elsewhere_coverage.sql — IF NOT EXISTS safe. */
const ELSEWHERE_COVERAGE_0154_SQL = `
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "elsewhere_coverage" jsonb NOT NULL DEFAULT '[]'::jsonb;
`;

let ensured = false;

export async function elsewhereCoverageColumnExists(): Promise<boolean> {
  const rows = await sql<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'elsewhere_coverage'
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

/**
 * Apply drizzle/0154 on this connection if elsewhere_coverage is missing.
 * Idempotent. Prevents bare `select().from(contacts)` from blanking the desk when
 * migrate lagged behind a deploy.
 */
export async function ensureElsewhereCoverageColumn(): Promise<boolean> {
  if (ensured) return true;
  if (await elsewhereCoverageColumnExists()) {
    ensured = true;
    return true;
  }
  await sql.unsafe(ELSEWHERE_COVERAGE_0154_SQL);
  const ok = await elsewhereCoverageColumnExists();
  if (ok) ensured = true;
  return ok;
}
