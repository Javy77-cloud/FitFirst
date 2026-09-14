import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
async function main() {
  const tid = "27c3d1bb-8163-4387-b3aa-fe03e0614233";
  console.log("task", await db.execute(sql`select id, title, status, policy_id from activities where id = ${tid}::uuid`));
  console.log("today acts", await db.execute(sql`
    select id, title, status from activities
    where policy_id = ${"a6001473-d872-467d-80c7-d6ef5648050e"}::uuid
      and created_at >= '2026-09-13'
  `));
}
main().then(()=>process.exit(0));
