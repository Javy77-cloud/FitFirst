import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import { RiskProfileFieldsGrid } from "@/components/deal/risk-profile-field-grid";
import {
  compactRowClass,
  isCompactLayoutField,
  readRenderedColumnCount,
  sectionFieldGridClass,
} from "@/lib/custom-fields/section-density";
import { AUTO_FIELDS, emptySheetValues, fieldsForLine } from "./catalog";
import { fieldsForUnit } from "./repeatable-units";
import {
  COMMERCIAL_COVERAGE_KEY,
  COMMERCIAL_COVERAGE_OPTIONS,
} from "./commercial-risk-profile";
import {
  DEFAULT_RISK_PROFILE_DENSITY,
  RISK_PROFILE_DENSITIES,
  RISK_PROFILE_DENSITY_ANON_USER,
  RISK_PROFILE_DENSITY_STORAGE_KEY,
  RISK_PROFILE_LONG_TEXT_MAX,
  RISK_PROFILE_SHORT_FIELD_MAX,
  clampRiskProfileDensity,
  defaultRiskProfileSectionDensity,
  isShortSheetValue,
  readStoredRiskProfileDensity,
  shortSheetControlClass,
  riskProfileDensityOf,
  riskProfileDensityStorageKey,
  riskProfileDensityUserKey,
  riskProfileSectionChoices,
  riskProfileSectionDensityId,
  riskProfileSectionMaxColumns,
  sheetFieldLayoutHint,
  writeStoredRiskProfileDensity,
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
    expect(defaultRiskProfileSectionDensity("Location / premises")).toBe(5);
    expect(defaultRiskProfileSectionDensity("Commercial Property")).toBe(5);
    expect(defaultRiskProfileSectionDensity("Commercial Auto")).toBe(5);
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
    const persist = source("src/lib/quote-sheet/risk-profile-layout.ts");
    expect(persist).toMatch(/window\.localStorage/);
    expect(persist).toMatch(/riskProfileDensityStorageKey/);
    expect(persist).toMatch(/data-ff-user-id/);
    expect(source("src/app/layout.tsx")).toMatch(/data-ff-user-id=\{userId\}/);
    expect(source("src/components/deal/risk-profile-section-header.tsx")).toMatch(
      /readStoredRiskProfileDensity/,
    );
    expect(source("src/components/deal/risk-profile-section-header.tsx")).toMatch(
      /writeStoredRiskProfileDensity/,
    );
    expect(sheet).not.toMatch(/sm:grid-cols-2/);
    expect(sheet).not.toMatch(/minmax\(0,7\.5rem\)/);
    expect(source("src/components/deal/risk-profile-section-header.tsx")).toMatch(
      /SectionDensityControl/,
    );
    expect(source("src/components/deal/risk-profile-section-header.tsx")).toMatch(
      /label="Columns"/,
    );
    expect(source("src/components/custom-fields/section-density-control.tsx")).toMatch(
      /data-ff-section-density-control/,
    );

    expect(riskProfileSectionChoices(4)).toEqual([1, 2, 3, 4]);
    expect(riskProfileSectionChoices(5)).toEqual([1, 2, 3, 4, 5]);
    expect(clampRiskProfileDensity(5, 4)).toBe(4);
    expect(riskProfileSectionMaxColumns("Property")).toBe(RISK_PROFILE_SHORT_FIELD_MAX);
    expect(riskProfileSectionMaxColumns("Dwelling")).toBe(RISK_PROFILE_SHORT_FIELD_MAX);
    expect(riskProfileSectionMaxColumns("Location / premises")).toBe(RISK_PROFILE_SHORT_FIELD_MAX);
    expect(riskProfileSectionMaxColumns("Commercial Property")).toBe(RISK_PROFILE_SHORT_FIELD_MAX);
    expect(riskProfileSectionMaxColumns("Applicant")).toBe(RISK_PROFILE_LONG_TEXT_MAX);
    expect(riskProfileSectionMaxColumns("Coverages")).toBe(RISK_PROFILE_LONG_TEXT_MAX);
    expect(
      riskProfileSectionMaxColumns("Health", [
        { key: "notes", label: "Health notes", group: "Health", input: "textarea" },
        {
          key: "medical_conditions",
          label: "Medical conditions",
          group: "Health",
          input: "multiselect",
        },
      ]),
    ).toBe(RISK_PROFILE_LONG_TEXT_MAX);
    expect(
      riskProfileSectionMaxColumns("Coverage", [
        { key: "coverage_lines", label: "Coverage lines", group: "Coverage", input: "chips" },
      ]),
    ).toBe(RISK_PROFILE_LONG_TEXT_MAX);
    expect(
      riskProfileSectionMaxColumns("General Liability", [
        { key: "products_services", label: "Products / services", group: "General Liability", input: "textarea" },
        { key: "annual_sales", label: "Annual sales", group: "General Liability", input: "number" },
        {
          key: "premises_open_to_public",
          label: "Premises open to public",
          group: "General Liability",
          input: "select",
          options: ["Yes", "No"],
        },
        {
          key: "liquor_liability",
          label: "Liquor liability",
          group: "General Liability",
          input: "select",
          options: ["Yes", "No"],
        },
      ]),
    ).toBe(RISK_PROFILE_LONG_TEXT_MAX);
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
    expect(html).toMatch(/>Columns</);
    expect(html).toMatch(/aria-label="Columns — fields per row"/);
    expect(html).not.toMatch(/>Density</);
    expect(html).toMatch(/data-ff-section-density-control="Property"/);
    expect(html).toMatch(/data-ff-section-density-control="Dwelling"/);
    expect(html).toMatch(/data-ff-density-choice="1"/);
    expect(html).toMatch(/data-ff-density-choice="4"/);
    expect(html).toMatch(/data-ff-density-choice="5"/);
    expect(html).toMatch(/grid-cols-5/);
    expect(html).toMatch(/grid-template-columns:repeat\(5/);
    expect(html).not.toMatch(/data-ff-compact-row/);
    expect(html).not.toMatch(/data-ff-section-density-control="risk-profile"/);
    expect(html).not.toMatch(/Reside at risk address…/);
    expect(html).not.toMatch(/When Met inspector/);
  });

  it("renders per-section density on Home, Auto, Flood, Life, Health, and Commercial", () => {
    const lines = [
      ["home", "homeowners"],
      ["auto", "auto"],
      ["flood", "flood"],
      ["life", "life"],
      ["health", "health"],
      ["workers_comp", "workers_comp"],
      ["general_liability", "gl"],
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
      expect(html, line).toMatch(/data-ff-density-choice="1"/);
      expect(html, line).toMatch(/data-ff-density-choice="2"/);
      expect(html, line).toMatch(/data-ff-density-choice="3"/);
      expect(html, line).toMatch(/data-ff-density-choice="4"/);
      expect(html, line).toMatch(/data-ff-risk-profile-density="per-section"/);
      expect(html, line).not.toMatch(/data-ff-section-density-control="risk-profile"/);
    }

    const shortFieldSheets = [
      ["home", "homeowners", "Property"],
      ["auto", "auto", "Vehicles"],
      ["flood", "flood", "Property"],
    ] as const;
    for (const [line, product, section] of shortFieldSheets) {
      const html = renderToString(
        createElement(MasterSheetCompare, {
          dealId: `deal-${line}-short`,
          line,
          fields: [],
          values: emptySheetValues(line, product),
          product,
        }),
      );
      expect(html, line).toMatch(new RegExp(`data-ff-section-density-control="${section}"`));
      expect(html, line).toMatch(/data-ff-density-choice="5"/);
    }

    const life = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-life-long",
        line: "life",
        fields: [],
        values: emptySheetValues("life", "life"),
        product: "life",
      }),
    );
    expect(life).toMatch(/data-ff-section-density-control="Health"/);
    const healthControl = life.slice(life.indexOf('data-ff-section-density-control="Health"'));
    const healthChunk = healthControl.slice(0, healthControl.indexOf("</div>") + 6);
    expect(healthChunk).toMatch(/data-ff-density-choice="4"/);
    expect(healthChunk).not.toMatch(/data-ff-density-choice="5"/);
    for (const section of ["Product", "Build &amp; tobacco", "Existing coverage", "Beneficiaries"]) {
      expect(life).toMatch(new RegExp(`data-ff-section-density-control="${section}"`));
    }

    const health = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-health-retrofit",
        line: "health",
        fields: [],
        values: emptySheetValues("health", "health"),
        product: "health",
      }),
    );
    expect(health).toMatch(/data-ff-section-density-control="Coverage"/);
    expect(health).toMatch(/data-ff-section-density-control="Household"/);
    const coverageControl = health.slice(health.indexOf('data-ff-section-density-control="Coverage"'));
    const coverageChunk = coverageControl.slice(0, coverageControl.indexOf("</div>") + 6);
    expect(coverageChunk).toMatch(/data-ff-density-choice="4"/);
    expect(coverageChunk).not.toMatch(/data-ff-density-choice="5"/);
  });

  it("uses the shared MasterSheetCompare panel for Commercial WC / GL / BOP plus Property and Auto stubs", () => {
    expect(source("src/components/deal/documents-panel.tsx")).toMatch(/MasterSheetWorkspace/);
    expect(source("src/lib/quote-sheet/catalog.ts")).toMatch(/COMMERCIAL_RISK_PROFILE_FIELDS/);
    for (const file of RISK_PROFILE_SURFACES) {
      expect(source(file)).toMatch(/useRiskProfileSectionDensity/);
      expect(source(file)).toMatch(/choices=\{choices\}/);
    }

    const values = {
      ...emptySheetValues("bop", "bop"),
      [COMMERCIAL_COVERAGE_KEY]: {
        value: COMMERCIAL_COVERAGE_OPTIONS.join(","),
        status: "confirmed" as const,
        source: "agent" as const,
      },
    };
    const html = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-commercial-stubs",
        line: "bop",
        fields: [],
        values,
        product: "bop",
      }),
    );
    expect(html).toMatch(/data-ff-section-density-control="Location \/ premises"/);
    expect(html).toMatch(/data-ff-section-density-control="Workers(?:'|&#x27;) Comp"/);
    expect(html).toMatch(/data-ff-section-density-control="General Liability"/);
    expect(html).toMatch(/data-ff-section-density-control="BOP"/);
    expect(html).toMatch(/data-ff-section-density-control="Commercial Property"/);
    expect(html).toMatch(/data-ff-section-density-control="Commercial Auto"/);
    expect(html).toMatch(/data-ff-density-choice="5"/);
    expect(html).toMatch(/grid-cols-5/);
    expect(html).toMatch(/grid-template-columns:repeat\(5/);
    const glControl = html.slice(html.indexOf('data-ff-section-density-control="General Liability"'));
    const glChunk = glControl.slice(0, glControl.indexOf("</div>") + 6);
    expect(glChunk).toMatch(/data-ff-density-choice="4"/);
    expect(glChunk).not.toMatch(/data-ff-density-choice="5"/);

    for (const [line, product] of [
      ["workers_comp", "workers_comp"],
      ["general_liability", "gl"],
      ["bop", "bop"],
    ] as const) {
      const lineHtml = renderToString(
        createElement(MasterSheetCompare, {
          dealId: `deal-${line}-location`,
          line,
          fields: [],
          values: emptySheetValues(line, product),
          product,
        }),
      );
      expect(lineHtml, line).toMatch(/data-ff-section-density-control="Location \/ premises"/);
      expect(lineHtml, line).toMatch(/data-ff-density-choice="5"/);
    }

    const commercialAuto = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-commercial-auto",
        line: "auto",
        fields: [],
        values: emptySheetValues("auto", "commercial_auto"),
        product: "commercial_auto",
      }),
    );
    expect(commercialAuto).toMatch(/data-ff-section-density-control="Commercial auto"/);
    expect(commercialAuto).toMatch(/data-ff-section-density-control="Vehicles"/);
    expect(commercialAuto).toMatch(/data-ff-density-choice="5"/);
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

  it("changes short-field grid classes and styles from 3 to 4 to 5 columns", () => {
    expect(sectionFieldGridClass(3, { collapse: false })).not.toEqual(
      sectionFieldGridClass(4, { collapse: false }),
    );
    expect(sectionFieldGridClass(4, { collapse: false })).not.toEqual(
      sectionFieldGridClass(5, { collapse: false }),
    );
    expect(compactRowClass(4)).not.toEqual(compactRowClass(5));
    expect(source("src/lib/custom-fields/section-density.ts")).toMatch(/grid-cols-4/);
    expect(source("src/lib/custom-fields/section-density.ts")).toMatch(/grid-cols-5/);
    expect(source("src/app/globals.css")).toMatch(/data-ff-section-density="4"/);
    expect(source("src/app/globals.css")).toMatch(/data-ff-section-density="5"/);

    const dwelling = [
      { key: "year_built", label: "Year built", group: "Dwelling", input: "number" as const },
      { key: "stories", label: "Stories", group: "Dwelling", input: "select" as const, options: ["1", "2"] },
      { key: "beds", label: "Bedrooms", group: "Dwelling", input: "number" as const },
      { key: "baths", label: "Bathrooms", group: "Dwelling", input: "number" as const },
      { key: "square_feet", label: "Square footage", group: "Dwelling", input: "number" as const },
    ];
    const html = [3, 4, 5].map((density) =>
      renderToString(
        createElement(RiskProfileFieldsGrid, {
          density,
          fields: dwelling,
          renderField: (field) => createElement("span", { "data-ff-cell": field.key }, field.label),
        }),
      ),
    );
    const [html3, html4, html5] = html;
    expect(readRenderedColumnCount(html3)).toBe(3);
    expect(readRenderedColumnCount(html4)).toBe(4);
    expect(readRenderedColumnCount(html5)).toBe(5);
    expect(readRenderedColumnCount(html4)).not.toBe(3);
    expect(html3).toMatch(/data-ff-section-density="3"/);
    expect(html4).toMatch(/data-ff-section-density="4"/);
    expect(html5).toMatch(/data-ff-section-density="5"/);
    expect(html3).toMatch(/grid-cols-3/);
    expect(html4).toMatch(/grid-cols-4/);
    expect(html5).toMatch(/grid-cols-5/);
    expect(html4).not.toMatch(/grid-cols-3/);
    expect(html5).not.toMatch(/grid-cols-3/);
    expect(html3).toMatch(/grid-template-columns:repeat\(3/);
    expect(html4).toMatch(/grid-template-columns:repeat\(4/);
    expect(html5).toMatch(/grid-template-columns:repeat\(5/);
    expect(html3).not.toEqual(html4);
    expect(html4).not.toEqual(html5);
  });

  it("marks yes/no, year, and city/state/zip as short/compact values", () => {
    const home = fieldsForLine("home", "homeowners");
    const byKey = Object.fromEntries(home.map((field) => [field.key, field]));
    expect(isShortSheetValue(byKey.year_built)).toBe(true);
    expect(isShortSheetValue(byKey.zip)).toBe(true);
    expect(isShortSheetValue(byKey.pool)).toBe(true);
    expect(isShortSheetValue(byKey.address1)).toBe(false);
    expect(isCompactLayoutField("zip", sheetFieldLayoutHint(byKey.zip))).toBe(true);
    expect(shortSheetControlClass(byKey.zip)).toMatch(/w-full/);
    expect(shortSheetControlClass(byKey.zip)).not.toMatch(/max-w-/);
    expect(sheetFieldLayoutHint(byKey.notes).type).toBe("multi_line");
    expect(sheetFieldLayoutHint(byKey.address1).type).toBe("address");
    expect(sheetFieldLayoutHint(byKey.mailing_address).type).toBe("address");
    expect(sheetFieldLayoutHint(byKey.pool).type).toBe("picklist");
    expect(
      sheetFieldLayoutHint({
        key: "prior_address",
        label: "Prior address (if No)",
        group: "Residence",
      }).type,
    ).toBe("single_line");
    expect(
      sheetFieldLayoutHint({
        key: "years_at_address",
        label: "Years at address",
        group: "Residence",
        input: "number",
      }).type,
    ).toBe("single_line");
    expect(
      sheetFieldLayoutHint({
        key: "address_same_6_months",
        label: "Same address 6+ months?",
        group: "Residence",
        input: "select",
        options: ["Yes", "No"],
      }).type,
    ).toBe("picklist");
  });

  it("packs Auto Residence and Drivers as one cell each — no full-bleed address or nested yes/no row", () => {
    const residence = [
      { key: "own_rent", label: "Own / Rent", group: "Residence", input: "select" as const, options: ["Own", "Rent"] },
      { key: "years_at_address", label: "Years at address", group: "Residence", input: "number" as const },
      {
        key: "address_same_6_months",
        label: "Same address 6+ months?",
        group: "Residence",
        input: "select" as const,
        options: ["Yes", "No"],
      },
      { key: "prior_address", label: "Prior address (if No)", group: "Residence" },
    ];
    const residenceHtml = renderToString(
      createElement(RiskProfileFieldsGrid, {
        density: 4,
        fields: residence,
        renderField: (field) => createElement("span", { "data-ff-cell": field.key }, field.label),
      }),
    );
    expect(readRenderedColumnCount(residenceHtml)).toBe(4);
    expect(residenceHtml).toMatch(/grid-cols-4/);
    expect(residenceHtml).not.toMatch(/data-ff-compact-row/);
    expect(residenceHtml).not.toMatch(/col-span-full/);
    expect(residenceHtml).toMatch(/data-ff-cell="prior_address"/);

    const drivers = [
      { key: "name", label: "Name", group: "Drivers" },
      { key: "dob", label: "DOB", group: "Drivers" },
      { key: "gender", label: "Gender", group: "Drivers", input: "select" as const, options: ["Male", "Female"] },
      { key: "occupation", label: "Occupation", group: "Drivers" },
    ];
    const driverHtml = renderToString(
      createElement(RiskProfileFieldsGrid, {
        density: 5,
        fields: drivers,
        renderField: (field) => createElement("span", { "data-ff-cell": field.key }, field.label),
      }),
    );
    expect(readRenderedColumnCount(driverHtml)).toBe(5);
    expect(driverHtml).toMatch(/grid-cols-5/);
    expect(driverHtml).not.toMatch(/data-ff-compact-row/);
    expect(driverHtml).not.toMatch(/col-span-full/);
    expect(driverHtml.indexOf('data-ff-cell="name"')).toBeLessThan(driverHtml.indexOf('data-ff-cell="dob"'));
    expect(driverHtml.indexOf('data-ff-cell="dob"')).toBeLessThan(driverHtml.indexOf('data-ff-cell="gender"'));
  });

  it("packs live Auto catalog Residence and repeatable Driver/Vehicle units at density 5", () => {
    const residence = AUTO_FIELDS.filter((field) => field.group === "Residence");
    expect(residence.map((field) => field.key)).toEqual([
      "own_rent",
      "years_at_address",
      "address_same_6_months",
      "prior_address",
    ]);
    const residenceHtml = renderToString(
      createElement(RiskProfileFieldsGrid, {
        density: 5,
        fields: residence,
        renderField: (field) => createElement("span", { "data-ff-cell": field.key }, field.label),
      }),
    );
    expect(readRenderedColumnCount(residenceHtml)).toBe(5);
    expect(residenceHtml).toMatch(/grid-cols-5/);
    expect(residenceHtml).not.toMatch(/data-ff-compact-row/);
    expect(residenceHtml).not.toMatch(/col-span-full/);

    const driverFields = fieldsForUnit("driver", 1).map((field) => ({
      key: field.key,
      label: field.label,
      group: "Drivers",
      input: field.input,
      options: field.options ? [...field.options] : undefined,
    }));
    expect(driverFields.map((field) => field.key).slice(0, 3)).toEqual([
      "driver_1_name",
      "driver_1_dob",
      "driver_1_gender",
    ]);
    const driverHtml = renderToString(
      createElement(RiskProfileFieldsGrid, {
        density: 5,
        fields: driverFields,
        renderField: (field) => createElement("span", { "data-ff-cell": field.key }, field.label),
      }),
    );
    expect(readRenderedColumnCount(driverHtml)).toBe(5);
    expect(driverHtml).not.toMatch(/data-ff-compact-row/);
    expect(driverHtml).not.toMatch(/col-span-full/);
    expect(driverHtml.indexOf('data-ff-cell="driver_1_name"')).toBeLessThan(
      driverHtml.indexOf('data-ff-cell="driver_1_dob"'),
    );
    expect(driverHtml.indexOf('data-ff-cell="driver_1_dob"')).toBeLessThan(
      driverHtml.indexOf('data-ff-cell="driver_1_gender"'),
    );

    const vehicleFields = fieldsForUnit("vehicle", 1).map((field) => ({
      key: field.key,
      label: field.label,
      group: "Vehicles",
      input: field.input,
      options: field.options ? [...field.options] : undefined,
    }));
    const vehicleHtml = renderToString(
      createElement(RiskProfileFieldsGrid, {
        density: 5,
        fields: vehicleFields,
        renderField: (field) => createElement("span", { "data-ff-cell": field.key }, field.label),
      }),
    );
    expect(readRenderedColumnCount(vehicleHtml)).toBe(5);
    expect(vehicleHtml).not.toMatch(/data-ff-compact-row/);
    expect(vehicleHtml).toMatch(/data-ff-cell="vin"/);
    expect(vehicleHtml).toMatch(/data-ff-cell="vehicle_year"/);
    expect(vehicleHtml).toMatch(/<div class="min-w-0"><span data-ff-cell="garaging_address"/);
  });
});

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key) {
      return data.has(key) ? data.get(key)! : null;
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key) {
      data.delete(key);
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

function installBrowserStorage() {
  const local = memoryStorage();
  const session = memoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: local, sessionStorage: session },
  });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: local });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: session });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement: { dataset: {} as Record<string, string> },
      querySelector: () => null,
    },
  });
  return { local, session };
}

describe("Risk Profile density persistence", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    delete (globalThis as { document?: unknown }).document;
  });

  it("keys localStorage by signed-in user and leaves the default unset until a change", () => {
    expect(riskProfileDensityUserKey(null)).toBe(RISK_PROFILE_DENSITY_ANON_USER);
    expect(riskProfileDensityUserKey("  user-javy  ")).toBe("user-javy");
    expect(riskProfileDensityStorageKey("user-javy")).toBe(
      `${RISK_PROFILE_DENSITY_STORAGE_KEY}:user-javy`,
    );
    expect(riskProfileDensityStorageKey("user-javy")).not.toBe(
      riskProfileDensityStorageKey("user-javier"),
    );

    const { local, session } = installBrowserStorage();
    expect(readStoredRiskProfileDensity("Property", "user-javy")).toBeUndefined();
    expect(DEFAULT_RISK_PROFILE_DENSITY).toBe(3);

    writeStoredRiskProfileDensity("Property", 5, "user-javy");
    writeStoredRiskProfileDensity("Residence", 4, "user-javy");
    writeStoredRiskProfileDensity("Property", 2, "user-javier");

    expect(readStoredRiskProfileDensity("Property", "user-javy")).toBe(5);
    expect(readStoredRiskProfileDensity("Residence", "user-javy")).toBe(4);
    expect(readStoredRiskProfileDensity("Property", "user-javier")).toBe(2);
    expect(readStoredRiskProfileDensity("Residence", "user-javier")).toBeUndefined();
    expect(local.getItem(riskProfileDensityStorageKey("user-javy"))).toContain('"Property":5');
    expect(session.getItem(RISK_PROFILE_DENSITY_STORAGE_KEY)).toBeNull();
  });

  it("reads the layout user stamp when no userId is passed", () => {
    const { local } = installBrowserStorage();
    (globalThis.document.documentElement.dataset as Record<string, string>).ffUserId = "user-maya";
    writeStoredRiskProfileDensity("Drivers", 4);
    expect(riskProfileDensityUserKey()).toBe("user-maya");
    expect(readStoredRiskProfileDensity("Drivers")).toBe(4);
    expect(local.getItem(`${RISK_PROFILE_DENSITY_STORAGE_KEY}:user-maya`)).toContain('"Drivers":4');
    expect(local.getItem(`${RISK_PROFILE_DENSITY_STORAGE_KEY}:anon`)).toBeNull();
  });

  it("migrates unscoped sessionStorage leftovers into the user-keyed read", () => {
    const { local, session } = installBrowserStorage();
    session.setItem(RISK_PROFILE_DENSITY_STORAGE_KEY, JSON.stringify({ Vehicles: 5 }));
    expect(readStoredRiskProfileDensity("Vehicles", "user-javy")).toBe(5);
    writeStoredRiskProfileDensity("Vehicles", 5, "user-javy");
    expect(local.getItem(riskProfileDensityStorageKey("user-javy"))).toContain('"Vehicles":5');
  });
});
