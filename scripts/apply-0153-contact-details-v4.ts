/**
 * Apply drizzle/0153_contact_details_v4.sql only (not a full db:migrate).
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/apply-0153-contact-details-v4.ts
 *
 * Refuses the local docker default unless ALLOW_DEFAULT_DB=1.
 *
 * Why: Contact Details v4 (#354) added nickname / DL / dependents columns to the
 * Drizzle schema. Bare `select().from(contacts)` (Contact + Account workspaces)
 * 500s with "column does not exist" until this ALTER lands — desk shows
 * app/error.tsx "Optional chrome failed."
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const LOCAL_DEFAULT = "postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst";

const V4_COLUMNS = [
  "nickname",
  "secondary_phone",
  "gender",
  "spouse_name",
  "spouse_dob",
  "dependents",
  "dl_state",
  "license_number_enc",
  "license_number_iv",
  "license_number_last4",
  "license_expiration",
] as const;

async function columnExists(client: postgres.Sql, table: string, column: string) {
  const rows = await client<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  if (url === LOCAL_DEFAULT && process.env.ALLOW_DEFAULT_DB !== "1") {
    throw new Error(
      "DATABASE_URL is the local docker default. Refusing to run. Set ALLOW_DEFAULT_DB=1 only for a local desk.",
    );
  }

  const client = postgres(url, { max: 1, ssl: url.includes("sslmode=require") ? "require" : undefined });
  try {
    const missingBefore: string[] = [];
    for (const column of V4_COLUMNS) {
      if (!(await columnExists(client, "contacts", column))) missingBefore.push(column);
    }
    console.log("contacts v4 missing before:", missingBefore.length ? missingBefore.join(", ") : "(none)");

    if (missingBefore.length > 0) {
      const sqlText = readFileSync(resolve("drizzle/0153_contact_details_v4.sql"), "utf8");
      await client.unsafe(sqlText);
      console.log("Applied drizzle/0153_contact_details_v4.sql");
    } else {
      console.log("0153 already present — skipped ALTER");
    }

    const missingAfter: string[] = [];
    for (const column of V4_COLUMNS) {
      if (!(await columnExists(client, "contacts", column))) missingAfter.push(column);
    }
    console.log("contacts v4 missing after:", missingAfter.length ? missingAfter.join(", ") : "(none)");
    if (missingAfter.length > 0) {
      throw new Error(`Contact Details v4 columns still missing: ${missingAfter.join(", ")}`);
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
