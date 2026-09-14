import { upsertFieldDef, ensureModuleFieldCatalog, listFieldDefs } from "../src/lib/custom-fields/store";

const FIELDS = [
  { key: "lease_term", label: "Lease term", type: "single_line" as const },
  { key: "tenant_name", label: "Tenant name", type: "single_line" as const },
  { key: "landlord_liability", label: "Landlord liability", type: "currency" as const },
  { key: "loss_of_rents", label: "Loss of rents", type: "currency" as const },
  { key: "animals", label: "Animals on premises", type: "picklist" as const, options: ["yes", "no"] },
  { key: "primary_heat", label: "Primary heat", type: "single_line" as const },
  { key: "business_on_premises", label: "Business on premises", type: "picklist" as const, options: ["yes", "no"] },
];

async function main() {
  await ensureModuleFieldCatalog("deals");
  for (const f of FIELDS) await upsertFieldDef(f, "deals");
  const defs = await listFieldDefs("deals");
  for (const f of FIELDS) {
    console.log(f.key, defs.some((d) => d.key === f.key) ? "ok" : "MISSING");
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
