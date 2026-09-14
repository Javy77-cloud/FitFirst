import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskCustomFields, deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { parseLayout } from "../src/lib/custom-fields/types";
import { upsertFieldDef } from "../src/lib/custom-fields/store";
import { ensureDefaultFieldPicklists } from "../src/lib/custom-fields/picklist-store";
import { LEAD_CADENCE_OPTIONS } from "../src/lib/custom-fields/lead-picklist-options";
import { STARTER_PICKLIST_LEAD_CADENCE } from "../src/lib/custom-fields/starter-picklists";

async function main() {
  const lists = await ensureDefaultFieldPicklists();
  const cadenceList = lists.find(
    (l) => l.name.trim().toLowerCase() === STARTER_PICKLIST_LEAD_CADENCE.toLowerCase(),
  );
  if (!cadenceList) throw new Error("Lead cadence picklist missing after ensure");
  console.log("picklist", cadenceList.id, cadenceList.name, cadenceList.options.length);

  await upsertFieldDef(
    {
      key: "cadence",
      label: "Cadence",
      type: "picklist",
      options: [...LEAD_CADENCE_OPTIONS],
      systemKey: "cadence",
      picklistId: cadenceList.id,
    },
    "leads",
  );
  // force picklistId even if upsert conflict didn't set it when options-only
  await db
    .update(deskCustomFields)
    .set({
      picklistId: cadenceList.id,
      type: "picklist",
      label: "Cadence",
      options: [...LEAD_CADENCE_OPTIONS],
      systemKey: "cadence",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID),
        eq(deskCustomFields.module, "leads"),
        eq(deskCustomFields.key, "cadence"),
      ),
    );
  console.log("linked cadence field → Lead cadence picklist");

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
      if (!section.fieldKeys.includes("cadence")) {
        const keys = ["cadence", ...section.fieldKeys.filter((k) => k !== "cadence" && k !== "temperature")];
        const c = keys.indexOf("cadence");
        keys.splice(c + 1, 0, "temperature");
        section.fieldKeys = keys;
      }
      console.log("Lead Quality =>", section.fieldKeys.join(", "));
    }
  }
  if (!found) {
    // create Lead Quality on right column top
    const right = layout.columns[1] ?? layout.columns[0];
    right.sections.unshift({
      id: "lead_quality",
      label: "Lead Quality",
      fieldKeys: ["cadence", "temperature"],
    });
    console.log("created Lead Quality section with cadence");
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
