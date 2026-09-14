import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst";
  const sql = postgres(url, { max: 1 });
  await sql.unsafe(
    `ALTER TABLE "review_tasks" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL`,
  );
  const rows = await sql.unsafe(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'review_tasks' AND column_name = 'tags'`,
  );
  console.log(rows);
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
