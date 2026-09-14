import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

const POLICY = "a6001473-d872-467d-80c7-d6ef5648050e";
const PROPOSED_TERM = "b5ada369-367f-48e4-86ca-c4169b600cd0";
const CURRENT_TERM = "9f4741e8-7dc9-4f5d-82d0-9fae24cfea62";
const SERVICING_CHECK = "efb482a4-c7c0-40b6-bbf4-f51867836570";
const TASK_FROM_CHECK = "27c3d1bb-8163-4387-b3aa-fe03e0614233";
const SERVICING_ACTIVITY = "336d1227-d7a9-414c-a1d8-8dfe006299c4";

async function main() {
  // Preview first
  console.log("renewal_queue before", await db.execute(sql`select * from renewal_queue where policy_id = ${POLICY}`));
  console.log("tasks", await db.execute(sql`
    select id, title, status from activities
    where id in (${TASK_FROM_CHECK}::uuid, ${SERVICING_ACTIVITY}::uuid)
       or (policy_id = ${POLICY} and title ilike '%Renewal docs%')
  `));

  // 1) Compare logs for this policy (test renewal premium edits)
  const delLogs = await db.execute(sql`
    delete from renewal_compare_logs where policy_id = ${POLICY} returning id, event_type, proposed_premium, created_at
  `);
  console.log("deleted compare logs", delLogs);

  // 2) Proposed term only (never current)
  const delTerm = await db.execute(sql`
    delete from policy_terms
    where id = ${PROPOSED_TERM}::uuid and policy_id = ${POLICY} and role = 'proposed'
    returning id, role, premium
  `);
  console.log("deleted proposed term", delTerm);

  // 3) Renewal queue row if present
  const delRq = await db.execute(sql`
    delete from renewal_queue where policy_id = ${POLICY} returning id, stage
  `);
  console.log("deleted renewal_queue", delRq);

  // 4) Servicing checklist row
  const check = await db.execute(sql`
    select * from policy_servicing_checks where id = ${SERVICING_CHECK}::uuid
  `);
  console.log("check before delete", check);
  const taskIds = new Set<string>();
  for (const row of check as any[]) {
    if (row.task_id) taskIds.add(row.task_id);
  }
  taskIds.add(TASK_FROM_CHECK);
  taskIds.add(SERVICING_ACTIVITY);

  const delCheck = await db.execute(sql`
    delete from policy_servicing_checks
    where policy_id = ${POLICY} and item_key = 'renewal_docs'
    returning id, item_key, task_id, status
  `);
  console.log("deleted servicing checks", delCheck);

  // 5) Linked activity logs + activities for the test servicing task(s)
  for (const tid of taskIds) {
    const logs = await db.execute(sql`
      delete from activity_logs where activity_id = ${tid}::uuid returning id
    `);
    const act = await db.execute(sql`
      delete from activities
      where id = ${tid}::uuid
        and policy_id = ${POLICY}
        and (title ilike '%Renewal docs%' or title ilike '%Servicing%')
      returning id, title, status
    `);
    console.log("deleted for", tid, { logs, act });
  }

  // Also catch any orphan renewal-docs servicing tasks on this policy from today
  const orphans = await db.execute(sql`
    delete from activities
    where policy_id = ${POLICY}
      and title ilike '%Renewal docs%'
      and created_at >= '2026-09-13'
    returning id, title
  `);
  console.log("orphan renewal-docs activities", orphans);

  // Verify
  console.log("\nVERIFY terms", await db.execute(sql`
    select id, role, premium from policy_terms where policy_id = ${POLICY}
  `));
  console.log("VERIFY compare", await db.execute(sql`
    select count(*)::int as n from renewal_compare_logs where policy_id = ${POLICY}
  `));
  console.log("VERIFY checks", await db.execute(sql`
    select * from policy_servicing_checks where policy_id = ${POLICY}
  `));
  console.log("VERIFY policy premium", await db.execute(sql`
    select policy_number, premium, status from policies where id = ${POLICY}
  `));
  console.log("VERIFY activities still", await db.execute(sql`
    select id, title, status, created_at from activities where policy_id = ${POLICY} order by created_at desc limit 10
  `));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
