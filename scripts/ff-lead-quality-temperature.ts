import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { parseLayout } from "../src/lib/custom-fields/types";

/** Put Temperature under Cadence in Lead Quality (Javy 2026-09-11). */
async function main() {
  const [row] = await db
    .select()
    .from(deskFieldLayouts)
    .where(and(eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID), eq(deskFieldLayouts.module, "leads")));
  if (!row) throw new Error("no leads layout");
  const layout = parseLayout(row.columns);
  let found = false;

  for (const col of layout.columns) {
    for (const section of col.sections) {
      const isQuality =
        /^lead[- ]?quality$/i.test(section.label.trim()) || section.id.includes("quality");
      if (!isQuality) continue;
      found = true;
      const withoutTemp = section.fieldKeys.filter((k) => k !== "temperature");
      const cadenceIdx = withoutTemp.indexOf("cadence");
      if (cadenceIdx >= 0) {
        withoutTemp.splice(cadenceIdx + 1, 0, "temperature");
      } else {
        withoutTemp.unshift("cadence", "temperature");
      }
      // de-dupe while keeping order
      const seen = new Set<string>();
      section.fieldKeys = withoutTemp.filter((k) => {
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      console.log("Lead Quality =>", section.fieldKeys.join(", "));
    }
  }

  if (!found) {
    const right = layout.columns[1] ?? layout.columns[0];
    right.sections.unshift({
      id: "lead_quality",
      label: "Lead Quality",
      fieldKeys: ["cadence", "temperature"],
    });
    console.log("created Lead Quality with cadence + temperature");
  }

  // Drop duplicate temperature from other sections (keep Lead Quality as source of truth)
  for (const col of layout.columns) {
    for (const section of col.sections) {
      const isQuality =
        /^lead[- ]?quality$/i.test(section.label.trim()) || section.id.includes("quality");
      if (isQuality) continue;
      if (section.fieldKeys.includes("temperature")) {
        section.fieldKeys = section.fieldKeys.filter((k) => k !== "temperature");
        console.log("removed temperature from", section.label);
      }
    }
  }

  await db
    .update(deskFieldLayouts)
    .set({ columns: layout, updatedAt: new Date() })
    .where(eq(deskFieldLayouts.id, row.id));
  console.log("saved leads layout");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
