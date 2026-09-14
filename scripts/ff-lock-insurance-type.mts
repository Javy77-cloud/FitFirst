import { and, eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskCustomFields } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { LEAD_INSURANCE_TYPE_OPTIONS } from "../src/lib/custom-fields/lead-picklist-options";
import { upsertFieldDef, listFieldDefs } from "../src/lib/custom-fields/store";

const LOCKED = [...LEAD_INSURANCE_TYPE_OPTIONS];

async function main() {
  console.log("LOCKED", LOCKED);
  for (const module of ["leads", "deals"] as const) {
    await upsertFieldDef(
      { key: "insurance_type", label: "Insurance Type", type: "picklist", options: LOCKED },
      module,
    );
  }

  const rows = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.key, "insurance_type")));
  for (const row of rows) {
    console.log("ROW", row.module, row.options, "picklistId", row.picklistId);
  }

  for (const module of ["leads", "deals"] as const) {
    const fields = await listFieldDefs(module);
    const t = fields.find((f) => f.key === "insurance_type");
    console.log("LIST", module, t?.options);
  }

  const deals = await db.execute(sql`
    SELECT d.id, d.title, d.line_of_business
    FROM desk_deals d
    WHERE d.title ILIKE ${"%Bhattel%"}
    ORDER BY d.updated_at DESC NULLS LAST
    LIMIT 8
  `);
  console.log("Tyler deals", deals);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
