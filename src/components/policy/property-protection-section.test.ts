import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildPropertyProtectionDisplay,
  propertyProtectionHasData,
} from "@/lib/policy/property-protection";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Property & protection section wiring", () => {
  it("is collapsed by default and only mounts for homeowners with snapshot data", () => {
    const section = source("src/components/policy/property-protection-section.tsx");
    expect(section).toMatch(/Property & protection/);
    expect(section).toMatch(/defaultOpen=\{false\}/);
    expect(section).toMatch(/data-ff="policy-property-protection"/);
    expect(section).toMatch(/if \(!groups\.length\) return null/);

    const overview = source("src/components/policy/tabs/overview-tab.tsx");
    expect(overview).toMatch(/PropertyProtectionSection/);
    expect(overview).toMatch(/family === "homeowners"/);
    expect(overview).toMatch(/parsePropertyProtectionSnapshot\(policy\.propertyProtection\)/);
  });

  it("mint copies sheet + Gemini property details into policies.propertyProtection", () => {
    const mint = source("src/app/actions/policy-mint.ts");
    expect(mint).toMatch(/buildPropertyProtectionSnapshot/);
    expect(mint).toMatch(/def\.shopLine === "home"/);
    expect(mint).toMatch(/propertyProtection/);
    expect(mint).toMatch(/source: "mint"/);

    const schema = source("src/lib/db/schema.ts");
    expect(schema).toMatch(/propertyProtection: jsonb\("property_protection"\)/);
  });

  it("hides the section when snapshot is empty and shows groups when data exists", () => {
    expect(propertyProtectionHasData({ values: {} })).toBe(false);
    expect(buildPropertyProtectionDisplay({ values: {} })).toEqual([]);
    const groups = buildPropertyProtectionDisplay({
      values: { roof_year: "2020", electrical_year: "2010", smoke_detectors: "Yes" },
    });
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.some((g) => g.id === "wind")).toBe(true);
    expect(groups.some((g) => g.id === "four_point")).toBe(true);
    expect(groups.some((g) => g.id === "protection")).toBe(true);
  });
});
