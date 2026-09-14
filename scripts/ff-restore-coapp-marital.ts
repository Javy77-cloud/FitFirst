import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskCustomFields, deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { CO_APPLICANT_CRM_FIELDS } from "../src/lib/custom-fields/co-applicant-fields";
import { parseLayout } from "../src/lib/custom-fields/types";
import { upsertFieldDef } from "../src/lib/custom-fields/store";

const KEY = "co_applicant_marital_status";

async function main() {
  const def = CO_APPLICANT_CRM_FIELDS.find((f) => f.key === KEY)!;
  await upsertFieldDef(def, "deals");
  console.log("ensured field def", KEY);

  const rows = await db
    .select()
    .from(deskFieldLayouts)
    .where(and(eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID), eq(deskFieldLayouts.module, "deals")));

  for (const row of rows) {
    const layout = parseLayout(row.columns);
    let changed = false;
    for (const col of layout.columns) {
      for (const section of col.sections) {
        if (section.id !== "co_applicant" && !/^co[- ]?applicant$/i.test(section.label.trim())) continue;
        if (!section.fieldKeys.includes(KEY)) {
          // Insert after relationship if present, else after dob, else append
          const after = ["co_applicant_relationship_to_insured", "co_applicant_dob", "co_applicant_phone"];
          let at = -1;
          for (const a of after) {
            const i = section.fieldKeys.indexOf(a);
            if (i >= 0) {
              at = i;
              break;
            }
          }
          if (at >= 0) section.fieldKeys.splice(at + 1, 0, KEY);
          else section.fieldKeys.push(KEY);
          changed = true;
        }
      }
    }
    if (changed) {
      await db
        .update(deskFieldLayouts)
        .set({ columns: layout, updatedAt: new Date() })
        .where(eq(deskFieldLayouts.id, row.id));
      console.log("restored on layout", row.lineOfBusiness, row.id);
    } else {
      console.log("already present", row.lineOfBusiness);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
