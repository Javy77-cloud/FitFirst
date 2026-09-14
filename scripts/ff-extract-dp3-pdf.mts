import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const DP3 = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";

async function main() {
  const docs = await db.execute(sql`
    select id, filename, storage_path from documents where deal_id = ${DP3}
  `);
  console.log(docs);
  const row = (docs as any[])[0];
  const p = path.join("uploads", row.storage_path);
  console.log("path", p, "exists", existsSync(p));
  const alt = path.join("uploads", row.storage_path.split("/").pop());
  console.log("alt", alt, existsSync(alt));

  // deal custom values
  const tables = await db.execute(sql`
    select table_name from information_schema.tables
    where table_schema='public' and (table_name like '%custom%' or table_name like '%field%' or table_name like '%layout%')
    order by table_name
  `);
  console.log("tables", tables);

  const deal = await db.execute(sql`select * from deals where id = ${DP3}`);
  const d = (deal as any[])[0];
  console.log("deal keys", Object.keys(d));
  console.log("quoting_form", d.quoting_form, "policy_sub_type", d.policy_sub_type);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
