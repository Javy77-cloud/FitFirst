import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
async function main() {
  const rows = await db.execute(sql`select columns from desk_field_layouts where module='deals' and line_of_business='HO' limit 1`);
  const raw = (rows as any[])[0].columns;
  const cols = raw.columns ?? raw;
  for (const c of cols) for (const s of c.sections) {
    if (s.id === "landlord" || (s.fieldKeys||[]).includes("lease_term")) {
      console.log(s.id, s.label, "=>", s.fieldKeys.join(", "));
    }
  }
  const cl = await db.execute(sql`select count(*)::int as n from column_layouts`);
  console.log("column_layouts count (untouched)", (cl as any[])[0].n);
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
