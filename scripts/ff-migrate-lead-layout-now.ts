import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts, deskCustomFields } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { migrateLeadLayout, needsLeadLayoutMigration } from "../src/lib/custom-fields/migrate-lead-layout";
import { defaultLayoutForModule } from "../src/lib/custom-fields/modules";
import { ensureModuleFieldCatalog, loadLayoutForModule } from "../src/lib/custom-fields/store";
import { parseLayout } from "../src/lib/custom-fields/types";

async function main() {
  await ensureModuleFieldCatalog("leads");
  await ensureModuleFieldCatalog("deals");

  // Force Insurance subtype label on leads
  const leadFields = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, "leads")));
  for (const row of leadFields) {
    if (row.key === "insurance_subtype" && row.label !== "Insurance subtype") {
      await db
        .update(deskCustomFields)
        .set({ label: "Insurance subtype", type: "picklist", updatedAt: new Date() })
        .where(eq(deskCustomFields.id, row.id));
      console.log("renamed insurance_subtype label");
    }
  }

  const rows = await db
    .select()
    .from(deskFieldLayouts)
    .where(and(eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID), eq(deskFieldLayouts.module, "leads")));

  if (rows.length === 0) {
    const layout = defaultLayoutForModule("leads");
    await db.insert(deskFieldLayouts).values({
      tenantId: DEFAULT_TENANT_ID,
      module: "leads",
      lineOfBusiness: "ALL",
      columns: layout,
    });
    console.log("seeded default lead layout");
  } else {
    for (const row of rows) {
      const parsed = parseLayout(row.columns);
      const next = needsLeadLayoutMigration(parsed) ? migrateLeadLayout(parsed) : migrateLeadLayout(parsed);
      await db
        .update(deskFieldLayouts)
        .set({ columns: next, updatedAt: new Date() })
        .where(eq(deskFieldLayouts.id, row.id));
      console.log("migrated lead layout", row.id, row.lineOfBusiness);
    }
  }

  // Touch load path (persists migrations again)
  const loaded = await loadLayoutForModule("leads");
  const keys = loaded.columns.flatMap((c) => c.sections.flatMap((s) => s.fieldKeys));
  console.log(
    JSON.stringify({
      sections: loaded.columns.flatMap((c) => c.sections.map((s) => ({ id: s.id, keys: s.fieldKeys }))),
      hasStatus: keys.includes("status"),
      hasDesire: keys.includes("insurance_type_desired"),
      hasSubtype: keys.includes("insurance_subtype"),
      hasGender: keys.includes("applicant_gender"),
      hasOccupation: keys.includes("applicant_occupation"),
    }),
  );
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
