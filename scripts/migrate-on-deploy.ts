/**
 * Apply pending drizzle migrations on deploy, then ensure 0145_experience_reviews.
 *
 * How this reaches Production Neon:
 * - `npm run build` runs this before `next build` (Vercel Production / Preview).
 * - Docker `scripts/entrypoint.sh` runs this after Postgres is up.
 * - Manual: `DATABASE_URL=... npm run db:migrate:deploy`
 *
 * Full journal migrate is preferred. 0145 is also applied with IF NOT EXISTS so a
 * stuck `__drizzle_migrations` journal cannot leave Pulse unable to save.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { splitMigrationStatements } from "../src/lib/db/experience-reviews-sql";

const EXPERIENCE_REVIEWS_SQL = resolve(process.cwd(), "drizzle/0145_experience_reviews.sql");

function onVercelProduction() {
  return process.env.VERCEL_ENV === "production";
}

async function tableExists(client: ReturnType<typeof postgres>, name: string) {
  const rows = await client<{ exists: boolean }[]>`
    select to_regclass(${`public.${name}`}) is not null as exists
  `;
  return Boolean(rows[0]?.exists);
}

async function applySqlFile(client: ReturnType<typeof postgres>, filePath: string) {
  const statements = splitMigrationStatements(readFileSync(filePath, "utf8"));
  for (const statement of statements) {
    await client.unsafe(statement);
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[migrate-on-deploy] DATABASE_URL unset — skip schema apply (next build continues).");
    return;
  }

  const client = postgres(url, { max: 1, prepare: false });
  try {
    try {
      await client`select 1`;
    } catch (error) {
      console.error("[migrate-on-deploy] DATABASE_URL is not reachable.", error);
      if (onVercelProduction()) process.exit(1);
      return;
    }

    try {
      const db = drizzle(client);
      await migrate(db, { migrationsFolder: "./drizzle" });
      console.log("[migrate-on-deploy] drizzle journal migrations applied.");
    } catch (error) {
      console.error("[migrate-on-deploy] drizzle migrate failed; ensuring 0145 anyway.", error);
    }

    await applySqlFile(client, EXPERIENCE_REVIEWS_SQL);
    console.log("[migrate-on-deploy] 0145_experience_reviews ensured.");

    const exists = await tableExists(client, "experience_reviews");
    if (!exists) {
      console.error("[migrate-on-deploy] experience_reviews is still missing.");
      if (onVercelProduction()) process.exit(1);
      return;
    }
    console.log("[migrate-on-deploy] experience_reviews is present.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("[migrate-on-deploy] unexpected failure.", error);
  if (onVercelProduction()) process.exit(1);
});
