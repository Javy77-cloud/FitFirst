import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { parseLayout } from "../src/lib/custom-fields/types";

function isJunk(section: { id: string; label: string; fieldKeys: string[] }) {
  if (section.id === "co_applicant") return false;
  const label = section.label.trim();
  if (!/^co[- ]?applicant/i.test(label)) return false;
  // Junk if it carries primary applicant_* keys (not co_applicant_*)
  return section.fieldKeys.some(
    (k) => k.startsWith("applicant_") && !k.startsWith("co_applicant_"),
  );
}

async function main() {
  const rows = await db
    .select()
    .from(deskFieldLayouts)
    .where(and(eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID), eq(deskFieldLayouts.module, "deals")));
  for (const row of rows) {
    const layout = parseLayout(row.columns);
    let changed = false;
    for (const col of layout.columns) {
      const next = col.sections.filter((s) => {
        if (isJunk(s)) {
          console.log("drop", row.lineOfBusiness, s.id, s.label, s.fieldKeys.join(","));
          changed = true;
          return false;
        }
        return true;
      });
      col.sections = next;
    }
    if (changed) {
      await db
        .update(deskFieldLayouts)
        .set({ columns: layout, updatedAt: new Date() })
        .where(eq(deskFieldLayouts.id, row.id));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
