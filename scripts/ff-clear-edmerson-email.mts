import { db } from "../src/lib/db";
import { and, eq } from "drizzle-orm";
import { quoteSheets, deskCustomFieldValues } from "../src/lib/db/schema";
import { sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";

const DP3 = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";

async function main() {
  // Clear contaminated email on deal details
  await db.execute(sql`
    update desk_custom_field_values
    set value = ''
    where record_id = ${DP3}
      and field_key = 'email'
      and lower(value) like '%edmerson%'
  `);
  console.log("cleared deal email if edmerson");

  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DP3), eq(quoteSheets.line, "home")));
  const values: any = { ...(sheet.values as any) };
  for (const k of ["applicant_email", "email", "notes"]) {
    const cur = values[k];
    if (cur && String(cur.value ?? "").toLowerCase().includes("edmerson")) {
      values[k] = { value: "", status: "missing", source: "blank" };
      console.log("cleared sheet", k);
    }
  }
  // also blank applicant_phone if Massachusetts Edmerson number
  if (String(values.applicant_phone?.value ?? "").includes("508-922")) {
    values.applicant_phone = { value: "", status: "missing", source: "blank" };
    console.log("cleared sheet applicant_phone (508 Edmerson)");
  }
  await db.update(quoteSheets).set({ values, updatedAt: new Date() }).where(eq(quoteSheets.id, sheet.id));

  // final counts both deals
  for (const [label, id] of [
    ["DP3", DP3],
    ["HO3", "8f4e7b68-2de3-458e-914b-ba60ea3c47aa"],
  ] as const) {
    const rows = await db.execute(sql`select values from quote_sheets where deal_id=${id} and line='home'`);
    const v = (rows as any[])[0]?.values || {};
    const entries = Object.entries(v) as any[];
    const filled = entries.filter(([,c])=>c && String(c.value||"").trim() && c.status!=="missing");
    const yellow = entries.filter(([,c])=>!c || !String(c.value||"").trim() || c.status==="missing");
    console.log(label, "filled", filled.length, "/", entries.length, `(${Math.round(100*filled.length/entries.length)}%)`, "yellow", yellow.length);
    console.log("  YELLOW:", yellow.map(([k])=>k).sort().join(", "));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
