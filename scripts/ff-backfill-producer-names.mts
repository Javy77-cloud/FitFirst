import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`
    UPDATE activity_logs AS al
    SET producer_name = u.name
    FROM policies AS p
    LEFT JOIN users AS u ON u.id = p.owner_id
    WHERE al.policy_id = p.id
      AND u.name IS NOT NULL
      AND btrim(u.name) <> ''
  `);
  const dist = await db.execute(sql`
    select coalesce(producer_name, '(null)') as producer_name, count(*)::int as n
    from activity_logs where policy_id is not null
    group by 1 order by n desc limit 15
  `);
  console.log(dist);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
