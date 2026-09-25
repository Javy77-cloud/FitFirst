import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeInspectionSections } from "@/components/policy/home-inspection-sections";
import {
  NOT_FROM_INSPECTION_NOTE,
  buildHomeOverviewInspections,
  type HomeInspectionSection,
} from "./home-overview-inspections";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const nowYear = 2026;

describe("home overview inspections", () => {
  it("uses one collapsed combined section when the deal has no inspection docs", () => {
    const sections = buildHomeOverviewInspections({
      nowYear,
      risk: { roofYear: 2018, roofCovering: "Shingle", openingProtection: "Shutters" },
      sheet: { hvac_year: { value: "2016" }, water_heater_year: { value: "2014" } },
      protection: {
        electrical_circuit_amps: "200",
        central_alarm: "Yes",
        opening_protection: "Impact glass",
        plumbing_year: "2008",
      },
    });
    expect(sections).toHaveLength(1);
    const combined = sections[0];
    expect(combined).toMatchObject({
      id: "roof_and_four_point",
      title: "Roof & four-point",
      note: NOT_FROM_INSPECTION_NOTE,
      document: null,
    });
    expect(combined.fields.map((field) => field.key)).toEqual([
      "roof_year",
      "roof_year_age",
      "roof_covering",
      "hvac_year",
      "hvac_year_age",
      "water_heater_year",
      "water_heater_year_age",
      "plumbing_year",
      "plumbing_year_age",
    ]);
    expect(combined.fields.find((field) => field.key === "roof_year_age")?.value).toBe("8 yrs");
    expect(combined.fields.some((field) => field.key === "opening_protection")).toBe(false);
    expect(combined.fields.some((field) => field.key === "central_alarm")).toBe(false);
    expect(combined.fields.some((field) => field.key === "electrical_circuit_amps")).toBe(false);
  });

  it("stays collapsed and empty when nothing is on file", () => {
    const sections = buildHomeOverviewInspections({ documents: [], nowYear });
    expect(sections[0]?.fields).toEqual([]);
    expect(sections[0]?.note).toBe(NOT_FROM_INSPECTION_NOTE);
  });

  it("splits roof details and four-point when those deal documents exist", () => {
    const sections = buildHomeOverviewInspections({
      nowYear,
      documents: [
        { id: "dec-1", docType: "dec", filename: "rosa-dec.pdf", createdAt: "2026-01-01" },
        { id: "wind-old", docType: "wind_mit", filename: "old-mit.pdf", createdAt: "2026-02-01" },
        { id: "wind-new", docType: "wind_mit", filename: "new-mit.pdf", mimeType: "application/pdf", createdAt: "2026-08-01" },
        { id: "four-1", docType: "four_point", filename: "four-point.pdf", createdAt: "2026-07-01" },
      ],
      risk: { roofYear: 2018, openingProtection: "Shutters" },
      sheet: {
        hvac_year: { value: "2016" },
        water_heater_year: { value: "12 years" },
        roof_deck_attachment: { value: "8d nails" },
      },
      protection: { central_alarm: "Yes", four_point_date: "2024-01-15" },
      roofInstallDate: "2018-06-01",
    });
    expect(sections.map((section) => section.id)).toEqual(["roof", "four_point"]);
    expect(sections.every((section) => section.note == null)).toBe(true);
    const roof = sections[0];
    const four = sections[1];
    expect(roof.document).toEqual({
      id: "wind-new",
      filename: "new-mit.pdf",
      mimeType: "application/pdf",
    });
    expect(roof.document && "storagePath" in roof.document).toBe(false);
    expect(roof.fields.map((field) => field.key)).toEqual([
      "roof_year",
      "roof_year_age",
      "roof_deck_attachment",
      "opening_protection",
      "roof_install_date",
    ]);
    expect(four.document?.id).toBe("four-1");
    expect(four.fields.map((field) => field.key)).toEqual([
      "four_point_date",
      "water_heater_year",
      "hvac_year",
      "hvac_year_age",
    ]);
    expect(four.fields.find((field) => field.key === "water_heater_year")?.value).toBe("12 years");
    expect(four.fields.some((field) => field.key === "water_heater_year_age")).toBe(false);
    expect(four.fields.some((field) => field.key === "central_alarm")).toBe(false);
  });

  it("shows only the section for the inspection document on the deal", () => {
    const windOnly = buildHomeOverviewInspections({
      documents: [{ id: "wind-1", filename: "wind mit.pdf", docType: "other" }],
      sheet: { roof_year: { value: "2019" }, hvac_year: { value: "2011" } },
      nowYear,
    });
    expect(windOnly.map((section) => section.title)).toEqual(["Roof details"]);
    expect(windOnly[0]?.document?.id).toBe("wind-1");
    expect(windOnly[0]?.fields.some((field) => field.key === "hvac_year")).toBe(false);

    const fourOnly = buildHomeOverviewInspections({
      documents: [{ id: "four-1", docType: "four_point", filename: "inspection.pdf" }],
      risk: { roofYear: 2010 },
      sheet: { electrical_year: { value: "2005" } },
      nowYear,
    });
    expect(fourOnly.map((section) => section.title)).toEqual(["Four-point"]);
    expect(fourOnly[0]?.fields.map((field) => field.key)).toEqual(["electrical_year", "electrical_year_age"]);
    expect(fourOnly[0]?.fields.some((field) => field.key === "roof_year")).toBe(false);
  });

  it("renders collapsed, with the note or the deal-document eye, and does not inline a PDF", () => {
    const combined = buildHomeOverviewInspections({
      nowYear,
      risk: { roofYear: 2018 },
    });
    const collapsed = renderToString(
      createElement(HomeInspectionSections, { sections: combined }),
    );
    expect(collapsed).toContain("Roof &amp; four-point");
    expect(collapsed).toContain(NOT_FROM_INSPECTION_NOTE);
    expect(collapsed).toContain('aria-expanded="false"');
    expect(collapsed).not.toContain("2018");
    expect(collapsed).not.toContain("data-ff-home-inspection-eye");

    const linked: HomeInspectionSection[] = [
      {
        id: "roof",
        title: "Roof details",
        document: { id: "wind-new", filename: "new-mit.pdf", mimeType: "application/pdf" },
        fields: [{ key: "roof_year", label: "Roof year", value: "2018" }],
      },
      {
        id: "four_point",
        title: "Four-point",
        document: { id: "four-1", filename: "four-point.pdf", mimeType: "application/pdf" },
        fields: [],
      },
    ];
    const withDocs = renderToString(createElement(HomeInspectionSections, { sections: linked }));
    expect(withDocs).toContain("data-ff-home-inspection-eye=\"wind-new\"");
    expect(withDocs).toContain("data-ff-home-inspection-eye=\"four-1\"");
    expect(withDocs).toContain("View wind mitigation");
    expect(withDocs).toContain("View four-point inspection");
    expect(withDocs).toContain("data-ff-document-view");
    expect(withDocs).not.toContain("2018");
    expect(withDocs).not.toContain("storagePath");
    expect(withDocs).not.toContain(NOT_FROM_INSPECTION_NOTE);

    const overview = source("src/components/policy/tabs/overview-tab.tsx");
    expect(overview).toMatch(/HomeInspectionSections/);
    expect(overview).toMatch(/buildHomeOverviewInspections/);
    expect(overview).not.toMatch(/PropertyProtectionSection/);
    const sections = source("src/components/policy/home-inspection-sections.tsx");
    expect(sections).toMatch(/DocumentViewButton/);
    expect(sections).toMatch(/defaultOpen=\{false\}/);
    const page = source("src/app/policies/[id]/page.tsx");
    expect(page).toMatch(/listDealInspectionDocuments/);
  });
});
