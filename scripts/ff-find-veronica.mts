import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const contacts = await db.execute(sql`
    select id, first_name, last_name, email
    from contacts
    where lower(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) like '%veronica%boyle%'
       or lower(coalesce(last_name,'')) = 'boyle'
    order by updated_at desc nulls last
    limit 20
  `);
  console.log("contacts", contacts);

  const policies = await db.execute(sql`
    select p.id, p.policy_number, p.line_of_business, p.policy_type, p.status,
           p.premium, p.effective_date, p.expiration_date, p.renewal_date,
           c.first_name, c.last_name
    from policies p
    left join contacts c on c.id = p.contact_id
    where lower(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')) like '%veronica%boyle%'
       or lower(coalesce(c.last_name,'')) = 'boyle'
    order by p.updated_at desc nulls last
    limit 30
  `);
  console.log("policies", policies);

  const renewals = await db.execute(sql`
    select rq.id, rq.policy_id, rq.status, rq.stage, rq.created_at, rq.updated_at,
           p.policy_number, p.line_of_business, c.first_name, c.last_name
    from renewal_queue rq
    join policies p on p.id = rq.policy_id
    left join contacts c on c.id = p.contact_id
    where lower(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')) like '%veronica%boyle%'
       or lower(coalesce(c.last_name,'')) = 'boyle'
    order by rq.updated_at desc nulls last
    limit 20
  `);
  console.log("renewal_queue", renewals);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
