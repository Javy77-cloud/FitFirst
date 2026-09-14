import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

const DP3 = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
const HO3 = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";

async function dumpDeal(id: string, label: string) {
  console.log("\n==========", label, id, "==========");
  const docs = await db.execute(sql`
    select id, filename, doc_type, mime_type, storage_path, created_at
    from documents where deal_id = ${id} order by created_at
  `);
  console.log("docs", JSON.stringify(docs, null, 2));

  const extracted = await db.execute(sql`
    select ef.field_key, ef.raw_value, ef.normalized_value, ef.confidence, ef.flagged, d.filename
    from extracted_fields ef
    join documents d on d.id = ef.document_id
    where d.deal_id = ${id}
    order by ef.field_key
  `);
  console.log("extracted_fields count", (extracted as any[]).length);
  for (const e of extracted as any[]) {
    console.log(`  ${e.field_key} = ${JSON.stringify(e.normalized_value || e.raw_value)} conf=${e.confidence} file=${e.filename}`);
  }

  const values = await db.execute(sql`
    select qs.line, qs.values, qs.updated_at from quote_sheets qs where qs.deal_id = ${id}
  `);
  for (const row of values as any[]) {
    const v = row.values || {};
    const entries = Object.entries(v).map(([k, cell]: any) => {
      const c = cell && typeof cell === "object" ? cell : { value: cell };
      return {
        key: k,
        value: c.value ?? "",
        source: c.source ?? "",
        status: c.status ?? "",
        reason: c.reason ?? c.why ?? c.note ?? c.message ?? "",
      };
    });
    const yellow = entries.filter((e) =>
      e.status === "missing" || e.status === "yellow" || e.status === "needs_review" ||
      !String(e.value).trim()
    );
    const filled = entries.filter((e) => String(e.value).trim() && e.status !== "missing");
    console.log("\n--- sheet line", row.line, "updated", row.updated_at, "total", entries.length, "filled", filled.length, "empty/yellow", yellow.length);
    console.log("FILLED:");
    for (const e of filled.sort((a,b)=>a.key.localeCompare(b.key))) {
      console.log(`  ${e.key} | ${JSON.stringify(e.value)} | src=${e.source} status=${e.status}`);
    }
    console.log("EMPTY/YELLOW:");
    for (const e of yellow.sort((a,b)=>a.key.localeCompare(b.key))) {
      console.log(`  ${e.key} | ${JSON.stringify(e.value)} | src=${e.source} status=${e.status} reason=${JSON.stringify(e.reason)}`);
    }
  }

  const risks = await db.execute(sql`
    select * from risks where deal_id = ${id}
  `);
  console.log("risks", JSON.stringify(risks, null, 2));
}

async function main() {
  await dumpDeal(DP3, "DP3");
  await dumpDeal(HO3, "HO3");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
