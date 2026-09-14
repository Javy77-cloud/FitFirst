import { db } from "../src/lib/db";
import { policies, users } from "../src/lib/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const counts = await db.execute(sql`
    select count(*)::int as n,
           count(nullif(btrim(coalesce(producer,'')), ''))::int as with_producer,
           count(owner_id)::int as with_owner
    from policies
  `);
  console.log("counts", counts);

  const rows = await db.execute(sql`
    select p.policy_number, p.producer, p.owner_id, u.name as owner_name
    from policies p
    left join users u on u.id = p.owner_id
    order by p.created_at desc nulls last
    limit 25
  `);
  console.log("sample", rows);

  const logs = await db.execute(sql`
    select coalesce(producer_name, '(null)') as producer_name, count(*)::int as n
    from activity_logs
    where policy_id is not null
    group by 1
    order by n desc
    limit 20
  `);
  console.log("activity producer_name", logs);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
