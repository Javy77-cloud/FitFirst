import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts, deskFieldDefs } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { parseLayout } from "../src/lib/custom-fields/types";

async function dump(module: string, line?: string | null) {
  const rows = await db
    .select()
    .from(deskFieldLayouts)
    .where(and(eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID), eq(deskFieldLayouts.module, module)));
  const filtered = line
    ? rows.filter((r) => (r.lineOfBusiness ?? "").toUpperCase() === line.toUpperCase())
    : rows;
  console.log(`\n=== ${module} (${filtered.length}/${rows.length} rows) ===`);
  for (const row of filtered.slice(0, line ? 5 : 3)) {
    const layout = parseLayout(row.columns);
    console.log("line", row.lineOfBusiness, "id", row.id);
    for (const [ci, col] of layout.columns.entries()) {
      console.log(`COL ${ci === 0 ? "left" : "right"}`);
      for (const s of col.sections) {
        console.log(`  ${s.id} | ${s.label} => ${s.fieldKeys.join(", ")}`);
      }
    }
  }
}

async function main() {
  await dump("deals", "HO");
  await dump("leads");
  const leadDefs = await db
    .select({ key: deskFieldDefs.key, label: deskFieldDefs.label })
    .from(deskFieldDefs)
    .where(and(eq(deskFieldDefs.tenantId, DEFAULT_TENANT_ID), eq(deskFieldDefs.module, "leads")));
  const dealDefs = await db
    .select({ key: deskFieldDefs.key })
    .from(deskFieldDefs)
    .where(and(eq(deskFieldDefs.tenantId, DEFAULT_TENANT_ID), eq(deskFieldDefs.module, "deals")));
  const leadKeys = new Set(leadDefs.map((d) => d.key));
  const dealKeys = dealDefs.map((d) => d.key);
  const missingOnLead = dealKeys.filter((k) => !leadKeys.has(k));
  console.log("\nlead field defs", leadDefs.length, "deal field defs", dealKeys.length);
  console.log("deal keys missing on leads catalog", missingOnLead.length, missingOnLead.slice(0, 40));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
