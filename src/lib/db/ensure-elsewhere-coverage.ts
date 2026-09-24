import { sql } from "@/lib/db";

/** Exact DDL from drizzle/0154 + 0155 — IF NOT EXISTS safe. */
const ELSEWHERE_COVERAGE_SQL = `
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "elsewhere_coverage" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "elsewhere_coverage" jsonb NOT NULL DEFAULT '[]'::jsonb;
`;

let ensuredContacts = false;
let ensuredAccounts = false;

export async function elsewhereCoverageColumnExists(
  table: "contacts" | "accounts" = "contacts",
): Promise<boolean> {
  const rows = await sql<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = 'elsewhere_coverage'
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

/**
 * Apply drizzle/0154+0155 on this connection if elsewhere_coverage is missing.
 * Idempotent. Prevents bare selects from blanking the desk when migrate lagged.
 */
export async function ensureElsewhereCoverageColumn(): Promise<boolean> {
  if (ensuredContacts && ensuredAccounts) return true;
  const contactsOk = ensuredContacts || (await elsewhereCoverageColumnExists("contacts"));
  const accountsOk = ensuredAccounts || (await elsewhereCoverageColumnExists("accounts"));
  if (contactsOk && accountsOk) {
    ensuredContacts = true;
    ensuredAccounts = true;
    return true;
  }
  await sql.unsafe(ELSEWHERE_COVERAGE_SQL);
  const okContacts = await elsewhereCoverageColumnExists("contacts");
  const okAccounts = await elsewhereCoverageColumnExists("accounts");
  if (okContacts) ensuredContacts = true;
  if (okAccounts) ensuredAccounts = true;
  return okContacts && okAccounts;
}
