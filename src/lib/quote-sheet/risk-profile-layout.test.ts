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
  RISK_PROFILE_DENSITIES,
  defaultRiskProfileSectionDensity,
  isShortSheetValue,
  riskProfileDensityOf,
  riskProfileSectionDensityId,
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

describe("Risk Profile per-section density + full labels", () => {
  it("defaults short-field sections to 4–5 columns and keeps 1–5 per section", () => {
    expect(DEFAULT_RISK_PROFILE_DENSITY).toBe(3);
    expect(RISK_PROFILE_DENSITIES).toEqual([1, 2, 3, 4, 5]);
    expect(defaultRiskProfileSectionDensity("Property")).toBe(5);
    expect(defaultRiskProfileSectionDensity("Dwelling")).toBe(5);
    expect(defaultRiskProfileSectionDensity("Vehicles")).toBe(5);
    expect(defaultRiskProfileSectionDensity("Applicant")).toBe(4);
    expect(defaultRiskProfileSectionDensity("Coverages")).toBe(4);
    expect(defaultRiskProfileSectionDensity("Current policy")).toBe(3);
    expect(riskProfileDensityOf(undefined)).toBe(3);
    expect(riskProfileDensityOf(5)).toBe(5);
    expect(riskProfileDensityOf("4")).toBe(4);
    expect(riskProfileSectionDensityId("Property")).toBe("Property");

    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(sheet).toMatch(/RiskProfileSectionBar/);
    expect(sheet).toMatch(/useRiskProfileSectionDensity/);
    expect(sheet).toMatch(/data-ff-risk-profile-density="per-section"/);
    expect(sheet).not.toMatch(/RISK_PROFILE_DENSITY_CONTROL_ID/);
    expect(sheet).not.toMatch(/sm:grid-cols-2/);
    expect(sheet).not.toMatch(/minmax\(0,7\.5rem\)/);
    expect(source("src/components/deal/risk-profile-section-header.tsx")).toMatch(
      /SectionDensityControl/,
    );
    expect(source("src/components/custom-fields/section-density-control.tsx")).toMatch(
      /data-ff-section-density-control/,
    );
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
    expect(html).toMatch(/data-ff-section-density="5"/);
    expect(html).toMatch(/data-ff-section-density-control="Property"/);
    expect(html).toMatch(/data-ff-section-density-control="Dwelling"/);
    expect(html).toMatch(/data-ff-density-choice="1"/);
    expect(html).toMatch(/data-ff-density-choice="4"/);
    expect(html).toMatch(/data-ff-density-choice="5"/);
    expect(html).toMatch(/grid-cols-\[repeat\(5,minmax\(0,1fr\)\)\]/);
    expect(html).toMatch(/data-ff-compact-row/);
    expect(html).not.toMatch(/data-ff-section-density-control="risk-profile"/);
    expect(html).not.toMatch(/Reside at risk address…/);
    expect(html).not.toMatch(/When Met inspector/);
  });

  it("renders per-section density on Auto, Flood, Life, Health, and Commercial", () => {
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
      expect(html, line).toMatch(/data-ff-section-density-control=/);
      expect(html, line).toMatch(/data-ff-density-choice="5"/);
      expect(html, line).toMatch(/data-ff-risk-profile-density="per-section"/);
      expect(html, line).not.toMatch(/data-ff-section-density-control="risk-profile"/);
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
    expect(sheetFieldLayoutHint(byKey.address1).type).toBe("address");
    expect(sheetFieldLayoutHint(byKey.mailing_address).type).toBe("address");
    expect(sheetFieldLayoutHint(byKey.pool).type).toBe("picklist");
  });
});
