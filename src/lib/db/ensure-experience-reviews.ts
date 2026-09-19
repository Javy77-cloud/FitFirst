import {
  EXPERIENCE_REVIEWS_MIGRATION,
  EXPERIENCE_REVIEWS_SQL,
  EXPERIENCE_REVIEWS_TABLE,
  splitMigrationStatements,
} from "@/lib/db/experience-reviews-sql";
import { sql } from "@/lib/db";

let pending: Promise<boolean> | null = null;

export async function experienceReviewsTableExists(): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    select to_regclass('public.experience_reviews') is not null as exists
  `;
  return Boolean(rows[0]?.exists);
}

async function applyExperienceReviewsSql(): Promise<boolean> {
  for (const statement of splitMigrationStatements(EXPERIENCE_REVIEWS_SQL)) {
    await sql.unsafe(statement);
  }
  const exists = await experienceReviewsTableExists();
  console.log("[pulse] ensure experience_reviews", {
    migration: EXPERIENCE_REVIEWS_MIGRATION,
    table: EXPERIENCE_REVIEWS_TABLE,
    exists,
  });
  return exists;
}

/** Idempotent CREATE TABLE / FKs / indexes from drizzle 0145. Safe on every Pulse write. */
export async function ensureExperienceReviewsTable(): Promise<boolean> {
  if (!pending) pending = applyExperienceReviewsSql();
  try {
    return await pending;
  } catch (error) {
    pending = null;
    throw error;
  }
}
