import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

const POLICY = "a6001473-d872-467d-80c7-d6ef5648050e";

async function cols(table: string) {
  const r = await db.execute(sql`
    select column_name from information_schema.columns
    where table_name = ${table} order by ordinal_position
  `);
  return r;
}

async function main() {
  for (const t of [
    "renewal_queue",
    "renewal_compare_logs",
    "policy_servicing_checks",
    "policy_terms",
    "policy_work_items",
    "activities",
    "activity_logs",
  ]) {
    console.log("\n==", t, "==");
    console.log(await cols(t));
  }

  console.log("\n== renewal_queue rows ==");
  console.log(await db.execute(sql`select * from renewal_queue where policy_id = ${POLICY}`));

  console.log("\n== renewal_compare_logs ==");
  console.log(await db.execute(sql`select * from renewal_compare_logs where policy_id = ${POLICY} order by created_at desc nulls last limit 20`));

  console.log("\n== policy_servicing_checks ==");
  console.log(await db.execute(sql`select * from policy_servicing_checks where policy_id = ${POLICY}`));

  console.log("\n== policy_terms ==");
  console.log(await db.execute(sql`select id, role, premium, term_effective, term_expiration, source, created_at from policy_terms where policy_id = ${POLICY} order by created_at desc nulls last`));

  console.log("\n== recent activities on policy ==");
  console.log(await db.execute(sql`
    select id, kind, title, notes, status, created_at, updated_at
    from activities
    where policy_id = ${POLICY}
    order by created_at desc nulls last
    limit 25
  `));

  console.log("\n== policy premium now ==");
  console.log(await db.execute(sql`select id, policy_number, premium, status from policies where id = ${POLICY}`));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
