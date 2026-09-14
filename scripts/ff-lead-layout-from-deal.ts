import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskCustomFields, deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { parseLayout, type FieldLayout } from "../src/lib/custom-fields/types";
import { upsertFieldDef } from "../src/lib/custom-fields/store";
import { isLeadDealParityLayout } from "../src/lib/custom-fields/migrate-lead-layout";

function cloneLayout(layout: FieldLayout): FieldLayout {
  return JSON.parse(JSON.stringify(layout)) as FieldLayout;
}

async function main() {
  const [dealRow] = await db
    .select()
    .from(deskFieldLayouts)
    .where(
      and(
        eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID),
        eq(deskFieldLayouts.module, "deals"),
        eq(deskFieldLayouts.lineOfBusiness, "HO"),
      ),
    );
  if (!dealRow) throw new Error("No HO deal layout");
  const dealLayout = parseLayout(dealRow.columns);
  const leadLayout = cloneLayout(dealLayout);
  if (!isLeadDealParityLayout(leadLayout)) {
    throw new Error("Cloned layout is not deal-parity — abort");
  }

  const keys = [
    ...new Set(leadLayout.columns.flatMap((c) => c.sections.flatMap((s) => s.fieldKeys))),
  ];
  const dealDefs = await db
    .select()
    .from(deskCustomFields)
    .where(and(eq(deskCustomFields.tenantId, DEFAULT_TENANT_ID), eq(deskCustomFields.module, "deals")));
  const byKey = new Map(dealDefs.map((d) => [d.key, d]));
  let ensured = 0;
  for (const key of keys) {
    const def = byKey.get(key);
    if (!def) {
      console.log("skip missing deal def", key);
      continue;
    }
    await upsertFieldDef(
      {
        key: def.key,
        label: def.label,
        type: def.type as any,
        options: (def.options as string[]) ?? [],
        formula: def.formula,
        lookupModule: def.lookupModule,
        systemKey: def.systemKey,
        required: def.required,
        defaultValue: def.defaultValue ?? undefined,
        picklistId: def.picklistId,
        permissions: def.permissions as any,
      },
      "leads",
    );
    ensured += 1;
  }
  console.log("ensured", ensured, "lead field defs from deal");

  await db
    .insert(deskFieldLayouts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      module: "leads",
      lineOfBusiness: "ALL",
      columns: leadLayout,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [deskFieldLayouts.tenantId, deskFieldLayouts.module, deskFieldLayouts.lineOfBusiness],
      set: { columns: leadLayout, updatedAt: new Date() },
    });

  console.log("saved leads layout = HO deal layout");
  for (const [ci, col] of leadLayout.columns.entries()) {
    console.log(ci === 0 ? "COL left" : "COL right");
    for (const s of col.sections) {
      console.log(`  ${s.id} | ${s.label} => ${s.fieldKeys.join(", ")}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
