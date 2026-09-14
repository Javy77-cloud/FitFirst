import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst";
  const sql = postgres(url, { max: 1 });
  await sql.unsafe(
    `ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "calendar_mark_sunday_non_working" boolean DEFAULT true NOT NULL`,
  );
  await sql.unsafe(
    `ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "calendar_show_us_federal_holidays" boolean DEFAULT true NOT NULL`,
  );
  const rows = await sql.unsafe(
    `SELECT column_name, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'agency_settings' AND column_name LIKE 'calendar_%' ORDER BY column_name`,
  );
  console.log(rows);
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
