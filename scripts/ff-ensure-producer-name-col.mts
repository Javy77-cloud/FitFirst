import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS producer_name text`);
  await db.execute(sql`
    UPDATE activity_logs AS al
    SET producer_name = u.name
    FROM policies AS p
    LEFT JOIN users AS u ON u.id = p.owner_id
    WHERE al.policy_id = p.id
      AND (al.producer_name IS NULL OR btrim(al.producer_name) = '')
      AND u.name IS NOT NULL
      AND btrim(u.name) <> ''
  `);
  const cols = await db.execute(sql`
    select column_name from information_schema.columns
    where table_name = 'activity_logs' and column_name = 'producer_name'
  `);
  console.log("column check", cols);
  const sample = await db.execute(sql`
    select coalesce(producer_name,'(null)') as producer_name, count(*)::int as n
    from activity_logs where policy_id is not null
    group by 1 order by n desc limit 5
  `);
  console.log("sample", sample);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
