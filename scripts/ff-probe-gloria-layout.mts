import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const rows = await db.execute(sql`
    select id, module, line_of_business, jsonb_typeof(columns) as t, columns
    from desk_field_layouts
    where module='deals'
  `);
  for (const r of rows as any[]) {
    console.log("--- layout", r.id, r.line_of_business, "typeof", r.t);
    const cols = r.columns;
    const arr = Array.isArray(cols) ? cols : cols?.columns ?? cols?.cols ?? null;
    if (!arr) {
      console.log("  keys", Object.keys(cols || {}));
      console.log("  sample", JSON.stringify(cols).slice(0, 400));
      continue;
    }
    for (const c of arr) {
      console.log("  COL", c.id, c.title ?? c.name ?? "");
      for (const s of c.sections ?? []) {
        console.log(`    SEC ${s.id} ${s.title ?? s.name ?? s.label ?? ""}: ${(s.fieldKeys ?? []).join(", ")}`);
      }
    }
  }

  const pti = await db.execute(sql`
    select id, name, portal_url, agent_portal_url, portal_login, portal_username_hint,
           left(coalesce(appetite_notes,''), 400) as notes
    from carriers where id = '67d52980-9167-4d94-8017-23509ded489a'
  `);
  console.log("PTI", JSON.stringify(pti, null, 2));

  const defs = await db.execute(sql`
    select key, label, type from desk_custom_fields
    where module='deals' order by key
  `);
  const keys = (defs as any[]).map((d) => d.key);
  console.log("DEAL_DEF_COUNT", keys.length);
  console.log("DEAL_DEFS", keys.join(", "));
}
main().then(()=>process.exit(0)).catch((e)=>{console.error(e);process.exit(1)});
