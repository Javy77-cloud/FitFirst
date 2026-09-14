import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const deals = await db.execute(sql`
    select d.id, d.title, d.pipeline_stage, d.line_of_business, d.policy_sub_type,
           d.quoting_line, d.quoting_form, d.created_at, d.updated_at, d.contact_id,
           d.primary_named_insured, d.property_oneliner, d.current_carrier
    from deals d
    where lower(coalesce(d.title,'')) like '%gloria%'
       or lower(coalesce(d.title,'')) like '%martinez%'
       or lower(coalesce(d.primary_named_insured,'')) like '%gloria%'
       or lower(coalesce(d.property_oneliner,'')) like '%adriatico%'
       or lower(coalesce(d.quoting_form,'')) like '%dp3%'
       or lower(coalesce(d.policy_sub_type,'')) like '%dp3%'
    order by d.created_at desc nulls last
    limit 40
  `);
  console.log("deals", JSON.stringify(deals, null, 2));

  const contacts = await db.execute(sql`
    select id, first_name, last_name, email, phone, mobile_phone, created_at, updated_at
    from contacts
    where lower(coalesce(first_name,'')) like '%gloria%'
       or (lower(coalesce(last_name,'')) = 'martinez' and lower(coalesce(first_name,'')) like '%gloria%')
    order by updated_at desc nulls last
    limit 20
  `);
  console.log("contacts", JSON.stringify(contacts, null, 2));

  // recent home deals last 2 days
  const recent = await db.execute(sql`
    select d.id, d.title, d.quoting_form, d.policy_sub_type, d.line_of_business,
           d.primary_named_insured, d.property_oneliner, d.created_at, d.updated_at
    from deals d
    where d.created_at > now() - interval '3 days'
       or d.updated_at > now() - interval '3 days'
    order by greatest(d.created_at, d.updated_at) desc nulls last
    limit 40
  `);
  console.log("recent", JSON.stringify(recent, null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
