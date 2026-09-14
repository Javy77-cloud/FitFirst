import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { parseLayout } from "../src/lib/custom-fields/types";

async function main() {
  const rows = await db
    .select()
    .from(deskFieldLayouts)
    .where(
      and(
        eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID),
        eq(deskFieldLayouts.module, "deals"),
        eq(deskFieldLayouts.lineOfBusiness, "HO"),
      ),
    );
  const layout = parseLayout(rows[0]?.columns);
  for (const col of layout.columns) {
    console.log("COL", col.id);
    for (const s of col.sections) {
      console.log(" ", s.id, "|", s.label, "=>", s.fieldKeys.join(", "));
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
