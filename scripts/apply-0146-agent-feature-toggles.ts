/**
 * Apply drizzle/0146_agent_feature_toggles.sql only (not a full db:migrate).
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/apply-0146-agent-feature-toggles.ts
 *
 * Refuses the local docker default unless ALLOW_DEFAULT_DB=1.
 *
 * Without this column, bare select() from agency_settings (pre-fix Home path)
 * threw and agents hit error.tsx "Try again" after login.
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

  const client = postgres(url, { max: 1 });
  try {
    const before = await columnExists(client, "agency_settings", "agent_feature_toggles");
    console.log("agent_feature_toggles existed before:", before ? "yes" : "no");
    if (!before) {
      const sqlText = readFileSync(resolve("drizzle/0146_agent_feature_toggles.sql"), "utf8");
      await client.unsafe(sqlText);
      console.log("Applied drizzle/0146_agent_feature_toggles.sql");
    } else {
      console.log("0146 already present — skipped ALTER");
    }
    const after = await columnExists(client, "agency_settings", "agent_feature_toggles");
    console.log("agent_feature_toggles exists after:", after ? "yes" : "no");
    if (!after) {
      throw new Error("agent_feature_toggles still missing after apply");
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
