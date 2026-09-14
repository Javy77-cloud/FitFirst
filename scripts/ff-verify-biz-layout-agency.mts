import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import {
  ensureBusinessDetailLayout,
  saveLayoutForModule,
} from "../src/lib/custom-fields/store";
import { allLayoutFieldKeys, parseLayout, type FieldLayout } from "../src/lib/custom-fields/types";

async function dump(label: string, layout: FieldLayout) {
  console.log(`\n=== ${label} ===`);
  for (const col of layout.columns) {
    console.log(`COL ${col.id}`);
    for (const s of col.sections) {
      console.log(`  ${s.id} | ${s.label} => ${s.fieldKeys.join(", ")}`);
    }
  }
  console.log("has crm_notes", layout.columns.some((c) => c.sections.some((s) => s.id === "crm_notes")));
  console.log("has notes field", allLayoutFieldKeys(layout).includes("notes"));
  const left = new Set(layout.columns[0]?.sections.flatMap((s) => s.fieldKeys) ?? []);
  const right = new Set(layout.columns[1]?.sections.flatMap((s) => s.fieldKeys) ?? []);
  console.log("name left", left.has("business_name"), "phone left", left.has("phone"), "phone right", right.has("phone"));
}

async function main() {
  const before = await ensureBusinessDetailLayout(false);
  await dump("after ensure (agency-safe)", before);

  // Simulate Javy: move notes into Operations, delete CRM Notes, Save.
  const edited: FieldLayout = {
    columns: before.columns.map((col) => ({
      id: col.id,
      sections: col.sections
        .filter((s) => s.id !== "crm_notes")
        .map((s) => {
          if (s.id === "operations") {
            const keys = s.fieldKeys.filter((k) => k !== "notes");
            keys.push("notes");
            return { ...s, fieldKeys: keys };
          }
          return { ...s, fieldKeys: s.fieldKeys.filter((k) => !["life_notes", "health_notes", "pc_notes", "notes"].includes(k)) };
        }),
    })),
  };
  await saveLayoutForModule("businesses", edited);
  await dump("after agency save (CRM Notes deleted)", edited);

  const afterLoad = await ensureBusinessDetailLayout(false);
  await dump("after ensure reload (must NOT restore CRM Notes)", afterLoad);

  if (afterLoad.columns.some((c) => c.sections.some((s) => s.id === "crm_notes"))) {
    throw new Error("FAIL: CRM Notes came back after ensure");
  }
  if (!allLayoutFieldKeys(afterLoad).includes("notes")) {
    throw new Error("FAIL: notes missing from Operations");
  }
  const left = new Set(afterLoad.columns[0].sections.flatMap((s) => s.fieldKeys));
  const right = new Set(afterLoad.columns[1].sections.flatMap((s) => s.fieldKeys));
  if (left.has("business_name") && left.has("phone")) {
    throw new Error("FAIL: name and phone still same column");
  }
  if (!right.has("phone")) {
    throw new Error("FAIL: phone not on opposite column");
  }
  console.log("\nOK agency layout preserved; name/phone opposite.");

  // Restore a clean stock-ish layout for the desk (with opposite phone) so feel-pass isn't left without notes sections unless intended.
  // Keep agency-deleted state? User may want CRM Notes gone for testing — restore stock default via force for a clean desk baseline with fixed columns.
  const restored = await ensureBusinessDetailLayout(true);
  await dump("restored stock default via force for clean feel-pass baseline", restored);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
