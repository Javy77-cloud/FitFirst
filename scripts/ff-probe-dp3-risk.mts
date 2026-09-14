import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
const DP3 = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
async function main() {
  const risk = await db.execute(sql`
    select id, year_built, roof_year, roof_covering, construction, occupancy, stories,
           pool, protection_class, miles_to_coast, city, county, coverage_a,
           opening_protection, address1
    from risks where deal_id = ${DP3}
  `);
  console.log(JSON.stringify(risk, null, 2));
  const atLog = await db.execute(sql`
    select id, result, quote_number, premium, cov_a_tried, cov_a_forced, left(why, 200) as why
    from quote_attempt_logs
    where deal_id = ${DP3} and carrier_id = 'e66c7eef-e6a2-44e5-8255-9fe15b11803d'
    order by attempted_at desc limit 3
  `);
  console.log("AT_LOGS", JSON.stringify(atLog, null, 2));
  const atAppetite = await db.execute(sql`
    select appetite_rows, left(appetite_notes, 800) as notes_tail,
           dont_write_rows, left(coalesce(dont_write_notes,''), 400) as dont_notes
    from carriers where id = 'e66c7eef-e6a2-44e5-8255-9fe15b11803d'
  `);
  const row = (atAppetite as any[])[0];
  const rows = row?.appetite_rows ?? [];
  const dp3rows = rows.filter((r: any) => r.lob === 'DP3' || /Q5113600/.test(r.notes||''));
  console.log("AT_DP3_APPETITE_ROWS", JSON.stringify(dp3rows, null, 2));
  const dont = (row?.dont_write_rows ?? []).filter((r: any) => r.lob === 'DP3' || /Q5113600/.test(`${r.reason} ${r.notes}`));
  console.log("AT_DP3_DONT", JSON.stringify(dont, null, 2));
  console.log("AT_NOTES_HAS_VERIFY", /VERIFY|BusType/.test(row?.notes_tail||''));
  console.log("NOTES_SNIP", (row?.notes_tail||'').slice(-500));
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
