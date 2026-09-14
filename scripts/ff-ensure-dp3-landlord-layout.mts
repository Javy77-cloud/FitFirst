/**
 * Add landlord Deal Details fields onto HO deals layout (empty-only append).
 * Does NOT touch column_layouts / list prefs.
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
import { ensureModuleFieldCatalog, listFieldDefs, saveLayoutForLine } from "../src/lib/custom-fields/store";
import { parseLayout, allLayoutFieldKeys } from "../src/lib/custom-fields/types";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";

const ADD_KEYS = [
  "lease_term",
  "tenant_name",
  "landlord_liability",
  "loss_of_rents",
  "animals",
  "primary_heat",
  "business_on_premises",
] as const;

async function main() {
  await ensureModuleFieldCatalog("deals");
  const defs = await listFieldDefs("deals");
  for (const key of ADD_KEYS) {
    const found = defs.find((d) => d.key === key);
    console.log("def", key, found ? "ok" : "MISSING");
  }

  const rows = await db.execute(sql`
    select id, columns from desk_field_layouts
    where tenant_id = ${DEFAULT_TENANT_ID}
      and module = 'deals'
      and line_of_business = 'HO'
    limit 1
  `);
  const row = (rows as any[])[0];
  if (!row) throw new Error("No HO deals layout");
  const raw = row.columns;
  // columns column may store {columns:[...]} or the array itself
  const layout = parseLayout(
    raw?.columns ? raw : { columns: Array.isArray(raw) ? raw : raw?.columns },
  );
  const before = allLayoutFieldKeys(layout);
  console.log("before keys", before.length, before.join(","));

  // Find or create a Landlord section on the right column
  let right = layout.columns.find((c) => c.id === "right") ?? layout.columns[1] ?? layout.columns[0];
  if (!right) throw new Error("no columns");
  let section = right.sections.find((s) => s.id === "landlord" || s.label.toLowerCase().includes("landlord"));
  if (!section) {
    section = { id: "landlord", label: "Landlord / rental", fieldKeys: [] };
    right.sections.push(section);
  }
  const existing = new Set(allLayoutFieldKeys(layout));
  for (const key of ADD_KEYS) {
    if (existing.has(key)) continue;
    section.fieldKeys.push(key);
    existing.add(key);
  }

  await saveLayoutForLine("HO", layout);
  const after = allLayoutFieldKeys(layout);
  console.log("after keys", after.length, after.join(","));
  console.log("landlord section", section.fieldKeys.join(","));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
