import { ensureDefaultFieldPicklists } from "../src/lib/custom-fields/picklist-store.ts";
import { ensureContactDetailPicklists } from "../src/lib/contacts/contact-detail-picklists.ts";
import {
  ensureModuleFieldCatalog,
  ensureContactDetailLayout,
  listFieldDefs,
} from "../src/lib/custom-fields/store.ts";
import { allLayoutFieldKeys } from "../src/lib/custom-fields/types.ts";

async function main() {
  const lists = await ensureDefaultFieldPicklists();
  console.log("picklists", lists.map((l) => l.name).join(", "));
  const ids = await ensureContactDetailPicklists();
  console.log("contact detail picklist ids", ids);
  await ensureModuleFieldCatalog("contacts");
  const layout = await ensureContactDetailLayout();
  const fields = await listFieldDefs("contacts");
  console.log("layout keys", allLayoutFieldKeys(layout).join(", "));
  console.log("right sections", layout.columns[1]?.sections?.map((s) => s.id).join(",") ?? "none");
  console.log("field count", fields.length);
  console.log("has marital", fields.some((f) => f.key === "marital_status"));
  console.log("has existing_coverage", fields.some((f) => f.key === "existing_coverage_types"));
  console.log("has life events", fields.some((f) => f.key === "recent_life_events"));
  for (const key of [
    "marital_status",
    "source",
    "recent_life_events",
    "existing_coverage_types",
    "education_level",
    "employment_status",
  ]) {
    const field = fields.find((f) => f.key === key);
    console.log(
      "field",
      key,
      field
        ? `type=${field.type} picklistId=${field.picklistId ?? "none"} options=${(field.options ?? []).length}`
        : "MISSING",
    );
  }
}


main().catch((err) => {
  console.error(err);
  process.exit(1);
});
