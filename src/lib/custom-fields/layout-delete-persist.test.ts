import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultLayoutForLine } from "./defaults";
import { addFieldToSection, moveField, removeFieldFromLayout } from "./layout";
import {
  isLegacyDealPersonalLayout,
  migrateDealLayoutParity,
  needsDealLayoutParity,
} from "./migrate-deal-layout-parity";
import { pickSavedModuleLayout } from "./resolve-layout";
import {
  AGENCY_LAYOUT_REVISION,
  allLayoutFieldKeys,
  parseLayout,
  withLayoutRevision,
} from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal layout delete persists on Save", () => {
  it("keeps a trashed field removed after parse + migrate (the load path after Save)", () => {
    const start = defaultLayoutForLine("HO");
    const deleted = removeFieldFromLayout(start, "applicant_education_level");
    const saved = withLayoutRevision(deleted, AGENCY_LAYOUT_REVISION);
    const reloaded = parseLayout(JSON.parse(JSON.stringify(saved)));
    expect(reloaded.revision).toBe(AGENCY_LAYOUT_REVISION);
    expect(allLayoutFieldKeys(reloaded)).not.toContain("applicant_education_level");
    expect(needsDealLayoutParity(reloaded)).toBe(false);
    expect(allLayoutFieldKeys(migrateDealLayoutParity(reloaded))).not.toContain(
      "applicant_education_level",
    );
    const withDensity = {
      ...saved,
      columns: [
        {
          ...saved.columns[0],
          sections: saved.columns[0].sections.map((section) =>
            section.id === "applicant" ? { ...section, density: 3 as const } : section,
          ),
        },
        saved.columns[1],
      ],
    };
    const densityReload = parseLayout(JSON.parse(JSON.stringify(withLayoutRevision(withDensity, AGENCY_LAYOUT_REVISION))));
    expect(densityReload.revision).toBe(AGENCY_LAYOUT_REVISION);
    expect(densityReload.columns[0].sections.find((section) => section.id === "applicant")?.density).toBe(3);
    expect(allLayoutFieldKeys(densityReload)).not.toContain("applicant_education_level");
  });

  it("does not treat an already-personal layout as legacy after one field is removed", () => {
    const deleted = removeFieldFromLayout(defaultLayoutForLine("HO"), "middle_name");
    expect(isLegacyDealPersonalLayout(deleted)).toBe(false);
    expect(needsDealLayoutParity(deleted)).toBe(false);
  });

  it("still adds and reorders fields without bringing back a deleted key", () => {
    const start = removeFieldFromLayout(defaultLayoutForLine("HO"), "applicant_education_level");
    const added = addFieldToSection(start, "contact", "preferred_language");
    const moved = moveField(added, "phone", { columnId: "right", sectionId: "mailing_address" });
    const keys = allLayoutFieldKeys(moved);
    expect(keys).toContain("preferred_language");
    expect(keys).toContain("phone");
    expect(keys).not.toContain("applicant_education_level");
    expect(moved.columns[1].sections.some((section) => section.fieldKeys.includes("phone"))).toBe(
      true,
    );
    expect(needsDealLayoutParity(moved)).toBe(false);
  });

  it("save stamps agency revision so the next load cannot re-merge starter fields", () => {
    const store = source("src/lib/custom-fields/store.ts");
    expect(store).toMatch(/withLayoutRevision\(layout, AGENCY_LAYOUT_REVISION\)/);
    expect(store).toMatch(/one-time for pre-personal layouts only/);
    expect(store).toMatch(/migrateDealLandlordStrip/);
    expect(store).toMatch(/stripDealDetailsLandlordFields/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/saveDealFieldLayout/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/saveLayoutForEveryLine/);
    expect(source("src/components/custom-fields/field-builder.tsx")).toMatch(
      /onRemove=\{\(\) => removeField\(key, section\.id\)\}/,
    );
  });

  it("picks the saved removal when a stale fuller line still exists", () => {
    const fuller = defaultLayoutForLine("HO");
    const smaller = removeFieldFromLayout(fuller, "epolicy");
    const picked = pickSavedModuleLayout(
      [
        { lineOfBusiness: "AUTO", columns: fuller, updatedAt: new Date("2026-01-01") },
        { lineOfBusiness: "HO", columns: smaller, updatedAt: new Date("2026-09-17") },
      ],
      "deals",
      "HO",
    );
    expect(allLayoutFieldKeys(picked!)).not.toContain("epolicy");
  });
});
