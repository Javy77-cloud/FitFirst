import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts, deskCustomFields } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { defaultLayoutForModule } from "../src/lib/custom-fields/modules";
import { defaultLayoutForLine, CORE_FIELDS } from "../src/lib/custom-fields/defaults";
import { ensureModuleFieldCatalog, saveLayoutForModule, saveLayoutForEveryLine } from "../src/lib/custom-fields/store";
import { APPLICANT_CRM_FIELDS } from "../src/lib/custom-fields/applicant-fields";

async function main() {
  await ensureModuleFieldCatalog("leads");
  await ensureModuleFieldCatalog("deals");

  // Force clean Lead layout (Javy feel-pass)
  const leadLayout = defaultLayoutForModule("leads");
  await saveLayoutForModule("leads", leadLayout);
  console.log("lead layout reset", JSON.stringify(leadLayout.columns.map(c => c.sections.map(s => ({id:s.id, keys:s.fieldKeys})))));

  // Ensure Deal layouts include Applicant + Insured/Mailing
  const dealLayout = defaultLayoutForLine("HO");
  await saveLayoutForEveryLine(dealLayout);
  console.log("deal layout reset", JSON.stringify(dealLayout.columns.map(c => c.sections.map(s => ({id:s.id, keys:s.fieldKeys})))));

  // Ensure lead insurance_subtype label
  const rows = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, "leads"), eq(deskCustomFields.key, "insurance_subtype")));
  for (const row of rows) {
    if (row.label !== "Insurance subtype") {
      await db.update(deskCustomFields).set({ label: "Insurance subtype", updatedAt: new Date() }).where(eq(deskCustomFields.id, row.id));
    }
  }

  // Upsert applicant fields on deals if missing
  for (const field of APPLICANT_CRM_FIELDS) {
    const hit = CORE_FIELDS.find((f) => f.key === field.key);
    if (!hit) continue;
  }

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
