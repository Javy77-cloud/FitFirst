import { loadLayoutForModule, ensureFieldsForModule, listFieldDefs } from "../src/lib/custom-fields/store";
import { allLayoutFieldKeys } from "../src/lib/custom-fields/types";

async function main() {
  await ensureFieldsForModule("deals", "HO");
  await ensureFieldsForModule("leads", "ALL");
  const dealLayout = await loadLayoutForModule("deals", "HO");
  const leadLayout = await loadLayoutForModule("leads", "ALL");
  const dealFields = await listFieldDefs("deals");
  const leadFields = await listFieldDefs("leads");
  const dealKeys = allLayoutFieldKeys(dealLayout);
  const leadKeys = allLayoutFieldKeys(leadLayout);
  console.log("DEAL layout keys insurance:", {
    insurance_type: dealKeys.includes("insurance_type"),
    insurance_subtype: dealKeys.includes("insurance_subtype"),
  });
  console.log("LEAD layout keys insurance:", {
    insurance_type: leadKeys.includes("insurance_type"),
    insurance_subtype: leadKeys.includes("insurance_subtype"),
  });
  const dealSubtype = dealFields.find((f) => f.key === "insurance_subtype" || f.systemKey === "quotingForm");
  const dealType = dealFields.find((f) => f.key === "insurance_type");
  const leadSubtype = leadFields.find((f) => f.key === "insurance_subtype");
  const leadType = leadFields.find((f) => f.key === "insurance_type");
  console.log("DEAL field defs:", {
    subtype: dealSubtype && { key: dealSubtype.key, label: dealSubtype.label, systemKey: dealSubtype.systemKey, options: dealSubtype.options?.slice(0, 5) },
    type: dealType && { key: dealType.key, label: dealType.label, systemKey: dealType.systemKey },
  });
  console.log("LEAD field defs:", {
    subtype: leadSubtype && { key: leadSubtype.key, label: leadSubtype.label },
    type: leadType && { key: leadType.key, label: leadType.label },
  });
  console.log("\nDEAL sections:");
  for (const col of dealLayout.columns) {
    for (const s of col.sections) console.log(`  [${col.id}] ${s.id}: ${s.fieldKeys.join(", ")}`);
  }
  console.log("LEAD sections:");
  for (const col of leadLayout.columns) {
    for (const s of col.sections) console.log(`  [${col.id}] ${s.id}: ${s.fieldKeys.join(", ")}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
