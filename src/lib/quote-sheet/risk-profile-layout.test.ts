import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import { isCompactLayoutField } from "@/lib/custom-fields/section-density";
import { emptySheetValues, fieldsForLine } from "./catalog";
import {
  DEFAULT_RISK_PROFILE_DENSITY,
  RISK_PROFILE_DENSITY_CONTROL_ID,
  isShortSheetValue,
  riskProfileDensityOf,
  sheetFieldLayoutHint,
} from "./risk-profile-layout";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const RISK_PROFILE_SURFACES = [
  "src/components/deal/master-sheet-compare.tsx",
  "src/components/deal/applicant-household.tsx",
  "src/components/deal/co-applicant-block.tsx",
  "src/components/deal/repeatable-unit-blocks.tsx",
];

describe("Risk Profile 3-col density + full labels", () => {
  it("defaults to Deal Details-style 3 columns and keeps 1/2/3 control", () => {
    expect(DEFAULT_RISK_PROFILE_DENSITY).toBe(3);
    expect(riskProfileDensityOf(undefined)).toBe(3);
    expect(riskProfileDensityOf(2)).toBe(2);
    expect(riskProfileDensityOf("1")).toBe(1);

    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(sheet).toMatch(/SectionDensityControl/);
    expect(sheet).toMatch(/DEFAULT_RISK_PROFILE_DENSITY/);
    expect(sheet).toMatch(/RISK_PROFILE_DENSITY_CONTROL_ID/);
    expect(RISK_PROFILE_DENSITY_CONTROL_ID).toBe("risk-profile");
    expect(sheet).not.toMatch(/sm:grid-cols-2/);
    expect(sheet).not.toMatch(/minmax\(0,7\.5rem\)/);
  });

  it("does not truncate labels on Home / Auto / Flood / Life / Health / Commercial surfaces", () => {
    for (const file of RISK_PROFILE_SURFACES) {
      const text = source(file);
      expect(text).not.toMatch(/truncate text-\[11px\]/);
      expect(text).not.toMatch(/minmax\(0,7\.5rem\)/);
    }

    const home = fieldsForLine("home", "homeowners");
    const byKey = Object.fromEntries(home.map((field) => [field.key, field]));
    expect(byKey.improvement_value.label).toBe("Improvement value");
    expect(byKey.number_of_families.label).toBe("Number of families");
    expect(byKey.resided_under_2_years.label).toBe("Resided at risk address under 2 years?");
    expect(byKey.roof_deck_attachment.label).toBe("Roof deck attachment");
    expect(byKey.wind_mit_inspector.label).toBe("Wind mit inspector");

    const html = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-home",
        line: "home",
        fields: [],
        values: emptySheetValues("home", "homeowners"),
        product: "homeowners",
      }),
    );
    expect(html).toContain("Improvement value");
    expect(html).toContain("Number of families");
    expect(html).toContain("Resided at risk address under 2 years?");
    expect(html).toContain("Roof deck attachment");
    expect(html).toContain("Wind mit inspector");
    expect(html).toMatch(/data-ff-section-density="3"/);
    expect(html).toMatch(/data-ff-section-density-control="risk-profile"/);
    expect(html).toMatch(/data-ff-density-choice="1"/);
    expect(html).toMatch(/data-ff-density-choice="2"/);
    expect(html).toMatch(/data-ff-density-choice="3"/);
    expect(html).toMatch(/grid-cols-\[repeat\(3,minmax\(0,1fr\)\)\]/);
    expect(html).not.toMatch(/Reside at risk address…/);
    expect(html).not.toMatch(/When Met inspector/);
  });

  it("renders 3-col density on Auto, Flood, Life, Health, and Commercial", () => {
    const lines = [
      ["auto", "auto"],
      ["flood", "flood"],
      ["life", "life"],
      ["health", "health"],
      ["bop", "bop"],
    ] as const;
    for (const [line, product] of lines) {
      const html = renderToString(
        createElement(MasterSheetCompare, {
          dealId: `deal-${line}`,
          line,
          fields: [],
          values: emptySheetValues(line, product),
          product,
        }),
      );
      expect(html, line).toMatch(/data-ff-section-density="3"/);
      expect(html, line).toMatch(/data-ff-section-density-control="risk-profile"/);
      expect(html, line).toMatch(/data-ff-risk-profile-density="3"/);
    }
  });

  it("reorders fill where city/state/zip, 4-point, wind mit, and garaging were clearly wrong", () => {
    const homeKeys = fieldsForLine("home", "homeowners").map((field) => field.key);
    expect(homeKeys.indexOf("city")).toBeLessThan(homeKeys.indexOf("state"));
    expect(homeKeys.indexOf("state")).toBeLessThan(homeKeys.indexOf("zip"));
    expect(homeKeys.indexOf("zip")).toBeLessThan(homeKeys.indexOf("county"));
    expect(homeKeys.indexOf("county") - homeKeys.indexOf("city")).toBe(3);

    expect(homeKeys.indexOf("date_inspected")).toBeLessThan(homeKeys.indexOf("four_point_date"));
    expect(homeKeys.indexOf("four_point_date") - homeKeys.indexOf("date_inspected")).toBe(1);

    expect(homeKeys.indexOf("wind_mit_inspector")).toBeLessThan(homeKeys.indexOf("inspection_company"));
    expect(homeKeys.indexOf("inspection_company")).toBeLessThan(
      homeKeys.indexOf("license_or_certificate_number"),
    );
    expect(homeKeys.indexOf("license_or_certificate_number")).toBeLessThan(
      homeKeys.indexOf("building_code"),
    );
    expect(homeKeys.indexOf("license_or_certificate_number") - homeKeys.indexOf("wind_mit_inspector")).toBe(
      2,
    );

    const floodKeys = fieldsForLine("flood").map((field) => field.key);
    expect(floodKeys.indexOf("city")).toBeLessThan(floodKeys.indexOf("state"));
    expect(floodKeys.indexOf("state")).toBeLessThan(floodKeys.indexOf("zip"));
    expect(floodKeys.indexOf("zip")).toBeLessThan(floodKeys.indexOf("county"));

    const autoKeys = fieldsForLine("auto").map((field) => field.key);
    expect(autoKeys.indexOf("garaging_address")).toBeLessThan(autoKeys.indexOf("garaging_zip"));
    expect(autoKeys.indexOf("garaging_zip") - autoKeys.indexOf("garaging_address")).toBe(1);
  });

  it("marks yes/no, year, and city/state/zip as short/compact values", () => {
    const home = fieldsForLine("home", "homeowners");
    const byKey = Object.fromEntries(home.map((field) => [field.key, field]));
    expect(isShortSheetValue(byKey.year_built)).toBe(true);
    expect(isShortSheetValue(byKey.zip)).toBe(true);
    expect(isShortSheetValue(byKey.pool)).toBe(true);
    expect(isShortSheetValue(byKey.address1)).toBe(false);
    expect(isCompactLayoutField("zip", sheetFieldLayoutHint(byKey.zip))).toBe(true);
    expect(sheetFieldLayoutHint(byKey.notes).type).toBe("multi_line");
    expect(sheetFieldLayoutHint(byKey.pool).type).toBe("picklist");
  });
});
