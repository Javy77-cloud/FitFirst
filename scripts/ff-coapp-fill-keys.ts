import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import {
  CO_APPLICANT_CRM_FIELDS,
  CO_APPLICANT_SECTION_FIELD_KEYS,
} from "../src/lib/custom-fields/co-applicant-fields";
import { upsertFieldDef } from "../src/lib/custom-fields/store";
import { parseLayout } from "../src/lib/custom-fields/types";

async function main() {
  for (const field of CO_APPLICANT_CRM_FIELDS) {
    await upsertFieldDef(field, "deals");
  }
  console.log("ensured", CO_APPLICANT_CRM_FIELDS.length, "co-applicant field defs");

  const rows = await db
    .select()
    .from(deskFieldLayouts)
    .where(and(eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID), eq(deskFieldLayouts.module, "deals")));

  for (const row of rows) {
    const layout = parseLayout(row.columns);
    let changed = false;
    for (const col of layout.columns) {
      for (const section of col.sections) {
        const isCo =
          section.id === "co_applicant" ||
          /^co[- ]?applicant/i.test(section.label.trim()) ||
          section.fieldKeys.some((k) => k.startsWith("co_applicant_"));
        if (!isCo) continue;
        for (const key of CO_APPLICANT_SECTION_FIELD_KEYS) {
          if (!section.fieldKeys.includes(key)) {
            section.fieldKeys.push(key);
            changed = true;
          }
        }
      }
    }
    if (changed) {
      await db
        .update(deskFieldLayouts)
        .set({ columns: layout, updatedAt: new Date() })
        .where(eq(deskFieldLayouts.id, row.id));
      console.log("appended missing co-app keys", row.lineOfBusiness);
    } else {
      console.log("ok", row.lineOfBusiness);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
