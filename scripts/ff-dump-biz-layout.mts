import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { defaultLayoutForModule } from "../src/lib/custom-fields/modules";
import { parseLayout, allLayoutFieldKeys } from "../src/lib/custom-fields/types";

async function dump(module: string) {
  const rows = await db
    .select()
    .from(deskFieldLayouts)
    .where(and(eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID), eq(deskFieldLayouts.module, module)));
  console.log(`\n=== ${module} DB (${rows.length} rows) ===`);
  for (const row of rows) {
    const layout = parseLayout(row.columns);
    console.log("line", row.lineOfBusiness, "id", row.id, "updated", row.updatedAt);
    for (const [ci, col] of layout.columns.entries()) {
      const keys = col.sections.flatMap((s) => s.fieldKeys);
      console.log(`COL ${col.id ?? (ci === 0 ? "left" : "right")} (${keys.length} fields)`);
      for (const s of col.sections) {
        console.log(`  ${s.id} | ${s.label} => ${s.fieldKeys.join(", ")}`);
      }
    }
    console.log("all keys", allLayoutFieldKeys(layout).join(", "));
  }
}

async function main() {
  await dump("businesses");
  await dump("contacts");
  console.log("\n=== DEFAULT businesses ===");
  const def = defaultLayoutForModule("businesses");
  for (const [ci, col] of def.columns.entries()) {
    const keys = col.sections.flatMap((s) => s.fieldKeys);
    console.log(`COL ${col.id} (${keys.length} fields)`);
    for (const s of col.sections) {
      console.log(`  ${s.id} | ${s.label} => ${s.fieldKeys.join(", ")}`);
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
