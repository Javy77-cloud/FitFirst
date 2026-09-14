import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { CO_APPLICANT_SECTION_FIELD_KEYS } from "../src/lib/custom-fields/co-applicant-fields";
import { parseLayout, type LayoutSection } from "../src/lib/custom-fields/types";

function isCoApp(s: LayoutSection): boolean {
  return (
    s.id === "co_applicant" ||
    /^co[- ]?applicant/i.test(s.label.trim()) ||
    s.fieldKeys.some((k) => k.startsWith("co_applicant_"))
  );
}

function isExactDefaultSeed(s: LayoutSection): boolean {
  if (s.fieldKeys.length !== CO_APPLICANT_SECTION_FIELD_KEYS.length) return false;
  const a = [...s.fieldKeys].sort().join(",");
  const b = [...CO_APPLICANT_SECTION_FIELD_KEYS].sort().join(",");
  return a === b;
}

function dedupe(sections: LayoutSection[]): LayoutSection[] {
  const coIndexes = sections.map((s, i) => (isCoApp(s) ? i : -1)).filter((i) => i >= 0);
  if (coIndexes.length <= 1) return sections;
  // Prefer keeping non-exact-default (user-edited). Drop exact default seeds.
  const drop = new Set<number>();
  const seeds = coIndexes.filter((i) => isExactDefaultSeed(sections[i]!));
  const customs = coIndexes.filter((i) => !isExactDefaultSeed(sections[i]!));
  if (customs.length >= 1 && seeds.length >= 1) {
    for (const i of seeds) drop.add(i);
  } else {
    // Keep first, drop the rest
    for (const i of coIndexes.slice(1)) drop.add(i);
  }
  return sections.filter((_, i) => !drop.has(i));
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
      const next = dedupe(col.sections);
      if (next.length !== col.sections.length) {
        col.sections = next;
        changed = true;
      }
    }
    // Also dedupe across columns: if left and right both have co-app, keep left's preferred / first custom
    const allCo: { col: number; idx: number; s: LayoutSection }[] = [];
    layout.columns.forEach((col, ci) => {
      col.sections.forEach((s, si) => {
        if (isCoApp(s)) allCo.push({ col: ci, idx: si, s });
      });
    });
    if (allCo.length > 1) {
      const customs = allCo.filter((x) => !isExactDefaultSeed(x.s));
      const seeds = allCo.filter((x) => isExactDefaultSeed(x.s));
      const remove = new Set<string>();
      if (customs.length >= 1 && seeds.length >= 1) {
        for (const x of seeds) remove.add(`${x.col}:${x.idx}`);
      } else {
        for (const x of allCo.slice(1)) remove.add(`${x.col}:${x.idx}`);
      }
      if (remove.size) {
        layout.columns = layout.columns.map((col, ci) => ({
          ...col,
          sections: col.sections.filter((_, si) => !remove.has(`${ci}:${si}`)),
        }));
        changed = true;
      }
    }

    if (changed) {
      await db
        .update(deskFieldLayouts)
        .set({ columns: layout, updatedAt: new Date() })
        .where(eq(deskFieldLayouts.id, row.id));
      console.log("deduped", row.lineOfBusiness);
      for (const col of layout.columns) {
        for (const s of col.sections) {
          if (isCoApp(s)) console.log("  keep", col.id, s.id, s.label, s.fieldKeys.length, "fields");
        }
      }
    } else {
      console.log("ok", row.lineOfBusiness);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
