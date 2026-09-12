import { ensureDefaultFieldPicklists } from "../src/lib/custom-fields/picklist-store.ts";
import { ensureBusinessDetailPicklists } from "../src/lib/businesses/business-detail-picklists.ts";
import {
  ensureModuleFieldCatalog,
  ensureBusinessDetailLayout,
  listFieldDefs,
} from "../src/lib/custom-fields/store.ts";
import { allLayoutFieldKeys } from "../src/lib/custom-fields/types.ts";
import { accountsListColumnsFromLayout } from "../src/lib/list-columns.ts";

async function main() {
  const force = process.argv.includes("--force");
  const lists = await ensureDefaultFieldPicklists();
  console.log("picklists", lists.map((l) => l.name).join(", "));
  const ids = await ensureBusinessDetailPicklists();
  console.log("business detail picklist ids", ids);
  await ensureModuleFieldCatalog("businesses");
  // Default: agency-safe ensure (seed/broken only + phone opposite-name migrate).
  // Pass --force only to reset to stock default (clobbers Edit Layout deletes).
  const layout = await ensureBusinessDetailLayout(force);
  const fields = await listFieldDefs("businesses");
  const keys = allLayoutFieldKeys(layout);
  console.log("force", force);
  console.log("layout keys", keys.join(", "));
  for (const [ci, col] of layout.columns.entries()) {
    console.log(`COL ${col.id ?? ci}`);
    for (const s of col.sections) {
      console.log(`  ${s.id} | ${s.label} => ${s.fieldKeys.join(", ")}`);
    }
  }
  console.log("field count", fields.length);
  const cols = accountsListColumnsFromLayout(layout, fields);
  const extras = cols.filter((c) => !["pick", "business", "status", "industry", "source", "linkedContacts", "policies", "lastActivity"].includes(c.id));
  console.log("list column extras", extras.map((c) => c.id).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
