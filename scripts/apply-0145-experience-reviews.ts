/**
 * Apply drizzle/0145_experience_reviews.sql only (not a full db:migrate).
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/apply-0145-experience-reviews.ts
 *
 * Refuses the local docker default unless ALLOW_DEFAULT_DB=1.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const LOCAL_DEFAULT = "postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst";

async function tableExists(client: postgres.Sql, name: string) {
  const rows = await client<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${name}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  if (url === LOCAL_DEFAULT && process.env.ALLOW_DEFAULT_DB !== "1") {
    throw new Error("DATABASE_URL is the local docker default. Refusing to run. Set ALLOW_DEFAULT_DB=1 only for a local desk.");
  }

  const client = postgres(url, { max: 1 });
  try {
    const before = await tableExists(client, "experience_reviews");
    console.log("experience_reviews existed before:", before ? "yes" : "no");
    if (!before) {
      const sqlText = readFileSync(resolve("drizzle/0145_experience_reviews.sql"), "utf8");
      await client.unsafe(sqlText);
      console.log("Applied drizzle/0145_experience_reviews.sql");
    } else {
      console.log("0145 already present — skipped CREATE");
    }
    const after = await tableExists(client, "experience_reviews");
    console.log("experience_reviews exists after:", after ? "yes" : "no");
    if (!after) {
      throw new Error("experience_reviews still missing after apply");
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
