/**
 * Apply drizzle/0155_account_elsewhere_coverage.sql only (not a full db:migrate).
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/apply-0155-account-elsewhere-coverage.ts
 *
 * Refuses the local docker default unless ALLOW_DEFAULT_DB=1.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const LOCAL_DEFAULT = "postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst";

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
    const missing = !(await columnExists(client, "accounts", "elsewhere_coverage"));
    console.log("accounts.elsewhere_coverage missing before:", missing);
    if (missing) {
      const sqlText = readFileSync(resolve("drizzle/0155_account_elsewhere_coverage.sql"), "utf8");
      await client.unsafe(sqlText);
      console.log("Applied drizzle/0155_account_elsewhere_coverage.sql");
    } else {
      console.log("0155 already present — skipped ALTER");
    }
    if (!(await columnExists(client, "accounts", "elsewhere_coverage"))) {
      throw new Error("accounts.elsewhere_coverage column still missing");
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
