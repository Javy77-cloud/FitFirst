import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildPropertyProtectionDisplay,
  propertyProtectionFilledCount,
  propertyProtectionHasData,
} from "@/lib/policy/property-protection";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Property protection snapshot", () => {
  it("stays on the policy record and is no longer dumped open on Overview", () => {
    const overview = source("src/components/policy/tabs/overview-tab.tsx");
    expect(overview).toMatch(/parsePropertyProtectionSnapshot\(policy\.propertyProtection\)/);
    expect(overview).toMatch(/HomeInspectionSections/);
    expect(overview).not.toMatch(/PropertyProtectionSection/);
    expect(overview).not.toMatch(/Property & protection/);

    const mint = source("src/app/actions/policy-mint.ts");
    expect(mint).toMatch(/buildPropertyProtectionSnapshot/);
    expect(mint).toMatch(/def\.shopLine === "home"/);
    expect(mint).toMatch(/propertyProtection/);
    expect(mint).toMatch(/source: "mint"/);

    const schema = source("src/lib/db/schema.ts");
    expect(schema).toMatch(/propertyProtection: jsonb\("property_protection"\)/);
  });

  it("still groups stored wind, four-point, and protection values", () => {
    expect(propertyProtectionHasData({ values: {} })).toBe(false);
    expect(propertyProtectionFilledCount({ values: {} })).toBe(0);
    expect(buildPropertyProtectionDisplay({ values: {} })).toEqual([]);
    const groups = buildPropertyProtectionDisplay({
      values: { roof_year: "2020", electrical_year: "2010", smoke_detectors: "Yes" },
    });
    expect(groups.map((group) => group.id)).toEqual(["wind", "four_point", "protection"]);
  });
});
