/**
 * Ensure Insurance Category (middle cascade) exists on Lead + Deal field defs + layouts.
 * Restores Type → Category → Form after Type was locked to PC/Life/Health.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import {
  ensureFieldsForModule,
  listFieldDefs,
  loadLayoutForModule,
  saveLayoutForModule,
  upsertFieldDef,
} from "../src/lib/custom-fields/store";
import { allLayoutFieldKeys, parseLayout, type FieldLayout } from "../src/lib/custom-fields/types";
import { LEAD_INSURANCE_CATEGORY_OPTIONS } from "../src/lib/custom-fields/lead-picklist-options";
import { allPcSubtypeLabels } from "../src/lib/deals/insurance-cascade";

function injectCategory(layout: FieldLayout): FieldLayout {
  return {
    columns: layout.columns.map((col) => ({
      ...col,
      sections: col.sections.map((section) => {
        if (!section.fieldKeys.includes("insurance_type")) return section;
        if (section.fieldKeys.includes("insurance_category")) return section;
        const fieldKeys = [...section.fieldKeys];
        const typeIdx = fieldKeys.indexOf("insurance_type");
        fieldKeys.splice(typeIdx + 1, 0, "insurance_category");
        return { ...section, fieldKeys };
      }),
    })),
  };
}

async function ensureModule(module: "leads" | "deals") {
  await upsertFieldDef(
    {
      key: "insurance_type",
      label: "Insurance Type",
      type: "picklist",
      options: ["PC", "Life", "Health"],
    },
    module,
  );
  await upsertFieldDef(
    {
      key: "insurance_category",
      label: "Insurance Category",
      type: "picklist",
      options: [...LEAD_INSURANCE_CATEGORY_OPTIONS],
    },
    module,
  );
  await upsertFieldDef(
    {
      key: "insurance_subtype",
      label: "Insurance Form",
      type: "picklist",
      options: allPcSubtypeLabels(),
      ...(module === "deals" ? { systemKey: "quotingForm" as const } : {}),
    },
    module,
  );

  if (module === "deals") await ensureFieldsForModule("deals", "HO");
  else await ensureFieldsForModule("leads", "ALL");

  // loadLayoutForModule runs migrateDealLayoutParity / migrateLeadLayout and may persist.
  const layout = await loadLayoutForModule(module, module === "deals" ? "HO" : "ALL");
  const keys = allLayoutFieldKeys(parseLayout(layout));
  if (!keys.includes("insurance_category")) {
    const forced = injectCategory(parseLayout(layout));
    await saveLayoutForModule(module, forced);
    console.log(module, "layout force-injected", allLayoutFieldKeys(forced).filter((k) => k.startsWith("insurance_")));
  } else {
    console.log(module, "layout has", keys.filter((k) => k.startsWith("insurance_")));
  }

  const fields = await listFieldDefs(module);
  for (const key of ["insurance_type", "insurance_category", "insurance_subtype"]) {
    const f = fields.find((row) => row.key === key);
    console.log(
      module,
      "field",
      key,
      f
        ? {
            label: f.label,
            options: Array.isArray(f.options) ? f.options.slice(0, 8) : f.options,
            systemKey: f.systemKey,
          }
        : "MISSING",
    );
  }
}

async function main() {
  await ensureModule("deals");
  await ensureModule("leads");

  const rows = await db
    .select()
    .from(deskFieldLayouts)
    .where(and(eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID), eq(deskFieldLayouts.module, "deals")));
  for (const row of rows) {
    const layout = parseLayout(row.columns as unknown);
    const keys = allLayoutFieldKeys(layout);
    if (keys.includes("insurance_type") && !keys.includes("insurance_category")) {
      const next = injectCategory(layout);
      await db
        .update(deskFieldLayouts)
        .set({ columns: next as unknown as typeof row.columns, updatedAt: new Date() })
        .where(eq(deskFieldLayouts.id, row.id));
      console.log("patched deal layout line", row.lineOfBusiness);
    }
  }

  const heather = await db.execute(sql`
    SELECT id, title, quoting_form, quoting_line, policy_sub_type, line_of_business
    FROM deals
    WHERE title ILIKE '%Heather Camirand%'
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 5
  `);
  console.log("HEATHER deals (quoting_line = middle remnant):", heather);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
