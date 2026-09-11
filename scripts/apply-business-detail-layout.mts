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
  const lists = await ensureDefaultFieldPicklists();
  console.log("picklists", lists.map((l) => l.name).join(", "));
  const ids = await ensureBusinessDetailPicklists();
  console.log("business detail picklist ids", ids);
  await ensureModuleFieldCatalog("businesses");
  const layout = await ensureBusinessDetailLayout(true);
  const fields = await listFieldDefs("businesses");
  const keys = allLayoutFieldKeys(layout);
  console.log("layout keys", keys.join(", "));
  console.log(
    "right sections",
    layout.columns[1]?.sections?.map((s) => s.id).join(",") ?? "none",
  );
  console.log("field count", fields.length);
  const cols = accountsListColumnsFromLayout(layout, fields);
  const extras = cols.filter((c) => !["pick", "business", "status", "industry", "source", "linkedContacts", "policies", "lastActivity"].includes(c.id));
  console.log("list column extras", extras.map((c) => c.id).join(", "));
  console.log("picker covers all layout keys", keys.every((k) => cols.some((c) => c.id === k || ["business_name", "name", "dba", "industry", "source", "status"].includes(k))));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
