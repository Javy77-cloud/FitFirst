import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskCustomFieldValues } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { listFieldDefs } from "../src/lib/custom-fields/store";
import { INSURANCE_TYPE_OPTIONS } from "../src/lib/deals/insurance-cascade";

async function main() {
  console.log("UI cascade parent labels:", INSURANCE_TYPE_OPTIONS.map((r) => r.label).join(" | "));
  for (const module of ["leads", "deals"] as const) {
    const fields = await listFieldDefs(module);
    console.log(module, "DB insurance_type:", fields.find((f) => f.key === "insurance_type")?.options?.join(" | "));
  }
  const tylerId = "9e9c9347-64ae-4c77-a76d-13a6a999df25";
  const rows = await db
    .select()
    .from(deskCustomFieldValues)
    .where(
      and(
        eq(deskCustomFieldValues.tenantId, DEFAULT_TENANT_ID),
        eq(deskCustomFieldValues.module, "deals"),
        eq(deskCustomFieldValues.recordId, tylerId),
        eq(deskCustomFieldValues.fieldKey, "insurance_type"),
      ),
    );
  console.log("Tyler deal insurance_type value:", rows.map((r) => r.value));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
