/** LEGACY — not imported by Fill. */
import { describe, expect, it } from "vitest";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues, fieldsForLine } from "@/lib/quote-sheet/catalog";
import {
  WIND_MIT_CHECKBOX_MAPS,
  extractWindMitCheckboxes,
  resolveCheckboxOption,
} from "./checkbox-maps";
import { extractFieldsFromText } from "./extract-text";
import { matchSynonymsOnLine } from "./synonyms";

describe("sep7ch wind checkbox maps", () => {
  it("maps checked letters onto sheet values", () => {
    const roofToWall = WIND_MIT_CHECKBOX_MAPS.find((row) => row.fieldKey === "roof_to_wall")!;
    expect(resolveCheckboxOption(roofToWall, "A")).toBe("toenails");
    expect(resolveCheckboxOption(roofToWall, "B")).toBe("clips");
    expect(resolveCheckboxOption(roofToWall, "C")).toBe("single wraps");
    expect(resolveCheckboxOption(roofToWall, "D")).toBe("double wraps");
    expect(resolveCheckboxOption(roofToWall, "H")).toBe("no attic access");

    const region = WIND_MIT_CHECKBOX_MAPS.find((row) => row.fieldKey === "wind_speed")!;
    expect(resolveCheckboxOption(region, "1")).toBe("140");
    expect(resolveCheckboxOption(region, "2")).toBe("130");
    expect(resolveCheckboxOption(region, "3")).toBe("130");

    const shape = WIND_MIT_CHECKBOX_MAPS.find((row) => row.fieldKey === "roof_shape")!;
    expect(resolveCheckboxOption(shape, "A")).toBe("hip");
    expect(resolveCheckboxOption(shape, "Other Roof")).toBe("other");
  });

  it("extracts checked wind-mit sections from OCR text", () => {
    const text = `WIND MITIGATION
OIR-B1-1802
Building Code:
☐ A. 2001 FBC
☑ B. 1994 SFBC
☐ C. Other

Region:
☑ 1. 140 mph
☐ 2. 130 mph
☐ 3. 130 mph

Roof Covering:
☑ Asphalt/Fiberglass Shingle
☐ Metal

Roof Deck Attachment:
☐ A
☑ C. 8d @ 6"
☐ D

Roof to Wall Connection:
☐ A. Toenails
☑ B. Clips
☐ C. Single Wraps

Roof Geometry:
☑ A. Hip
☐ B. Flat

Secondary Water Resistance:
☑ A

Opening Protection:
☐ A
☐ B
☑ N. None
`;
    const hits = extractWindMitCheckboxes(text);
    const byKey = Object.fromEntries(hits.map((h) => [h.fieldKey, h.value]));
    expect(byKey.building_code).toBe("B");
    expect(byKey.wind_speed).toBe("140");
    expect(byKey.roof_covering).toBe("Asphalt/Fiberglass Shingle");
    expect(byKey.roof_deck_attachment).toBe("C");
    expect(byKey.roof_to_wall).toBe("clips");
    expect(byKey.roof_shape).toBe("hip");
    expect(byKey.swr).toBe("A");
    expect(byKey.opening_protection).toBe("N");

    const extracted = extractFieldsFromText(text, "wind_mit");
    const fields = Object.fromEntries(
      extracted.fields.map((field) => [field.fieldKey, field.normalizedValue]),
    );
    expect(fields.building_code).toBe("B");
    expect(fields.wind_speed).toBe("140");
    expect(fields.roof_to_wall).toBe("clips");
    expect(fields.roof_shape).toBe("hip");
    expect(fields.opening_protection).toBe("N");
    expect(extracted.fields.find((f) => f.fieldKey === "building_code")?.sourceDocTag).toBe(
      "wind mitigation",
    );

    const applied = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields);
    expect(applied.values.building_code.value).toBe("B");
    expect(applied.values.wind_speed.value).toBe("140");
    expect(applied.values.roof_to_wall.value).toBe("Clips");
    expect(applied.values.roof_deck_attachment.value).toBe("Level C");
  });
});

describe("sep7ch new synonyms", () => {
  it("maps wind mit owner / inspector / company labels", () => {
    expect(matchSynonymsOnLine("Owner Name: Javy Garcia", "wind_mit")[0]).toMatchObject({
      fieldKey: "applicant_name",
      value: "Javy Garcia",
    });
    expect(
      matchSynonymsOnLine("Qualified Inspector Name: Pat Inspector", "wind_mit")[0],
    ).toMatchObject({ fieldKey: "wind_mit_inspector", value: "Pat Inspector" });
    expect(matchSynonymsOnLine("Inspection Company: Coastal Inspect", "wind_mit")[0]).toMatchObject(
      {
        fieldKey: "inspection_company",
        value: "Coastal Inspect",
      },
    );
    expect(
      matchSynonymsOnLine("License or Certificate #: LIC-99", "wind_mit")[0],
    ).toMatchObject({
      fieldKey: "license_or_certificate_number",
      value: "LIC-99",
    });

    const addressHits = matchSynonymsOnLine("Address Inspected: 100 Palm St", "wind_mit");
    expect(addressHits.map((h) => h.fieldKey).sort()).toEqual(
      ["address", "applicant_address", "mailing_address"].sort(),
    );
  });

  it("maps four-point computed years from ages", () => {
    const year = new Date().getFullYear();
    const text = `FOUR POINT INSPECTION
Insured/Applicant Name: Casey Client
Address Inspected: 12 Ocean Ave
Actual Year Built: 1998
Four-Point Date: 03/15/2026
Panel Age: 15
Year Last Updated: 2019
Age of Water Heater: 8
Original to Home: yes
Covering Material: shingle
Date of Last Roofing Permit: 2018
`;
    const result = extractFieldsFromText(text, "four_point");
    const byKey = Object.fromEntries(result.fields.map((f) => [f.fieldKey, f.normalizedValue]));
    expect(byKey.applicant_name).toBe("Casey Client");
    expect(byKey.year_built).toBe("1998");
    expect(byKey.date_inspected).toBe("03/15/2026");
    expect(byKey.electrical_year).toBe(String(year - 15));
    expect(byKey.hvac_year).toBe("2019");
    expect(byKey.water_heater_year).toBe(String(year - 8));
    expect(byKey.plumbing_year).toBe("1998");
    expect(byKey.roof_covering.toLowerCase()).toContain("shingle");
    expect(byKey.roof_year).toBe("2018");
  });

  it("maps dec Name Insured and Residence Premises without Address collision", () => {
    const name = matchSynonymsOnLine("Name Insured: Elena Ruiz", "dec");
    expect(name.some((h) => h.fieldKey === "current_policy_named_insured")).toBe(true);
    expect(name.some((h) => h.fieldKey === "named_insured")).toBe(true);

    const premises = matchSynonymsOnLine("Residence Premises: 9 Bay Rd", "dec");
    expect(premises.map((h) => h.fieldKey).sort()).toEqual(
      ["address", "applicant_address"].sort(),
    );

    // City label only — never a literal "City: Fort Myers" synonym entry.
    const city = matchSynonymsOnLine("City: Fort Myers", "dec");
    expect(city[0]).toMatchObject({ fieldKey: "city", synonym: "City", value: "Fort Myers" });
  });
});

describe("sep7ch dec blank-only standards", () => {
  it("fills coverage E/F, loss assessment, water backup, and deadbolts only when blank", () => {
    const sparse = extractFieldsFromText(
      `HOMEOWNERS DECLARATIONS
Citizens Property Insurance Corporation
Named Insured: Sparse Owner
Coverage A - Dwelling: $250,000
AOP: $1000
First Mortgagee: Wells Fargo
123 Lender Lane Suite 2
Loan Number: LN-55
`,
      "dec",
    );
    const byKey = Object.fromEntries(sparse.fields.map((f) => [f.fieldKey, f.normalizedValue]));
    expect(byKey.coverage_e).toBe("300000");
    expect(byKey.coverage_f).toBe("1000");
    expect(byKey.loss_assessment).toBe("1000");
    expect(byKey.water_backup).toBe("5000");
    expect(byKey.deadbolts).toBe("yes");
    expect(byKey.current_carrier).toMatch(/Citizens/i);
    expect(byKey.mortgagee_address).toMatch(/123 Lender Lane/i);
    expect(byKey.loan_number).toBe("LN-55");
    expect(byKey.wind_hail_deductible).toBe("1000"); // AOP fallback

    const applied = applyExtractedToSheet("home", emptySheetValues("home"), sparse.fields);
    expect(applied.values.coverage_e.value).toBe("300000");
    expect(applied.values.deadbolts.value).toBe("yes");
    expect(applied.values.mortgagee_address.value).toMatch(/123 Lender Lane/);
    expect(applied.values.mortgagee_name.value).toMatch(/Wells Fargo/i);

    // Existing values are not overwritten by standards.
    const existing = emptySheetValues("home");
    existing.coverage_e = { value: "500000", status: "confirmed", source: "agent" };
    existing.water_backup = { value: "10000", status: "confirmed", source: "agent" };
    const again = applyExtractedToSheet("home", existing, sparse.fields);
    expect(again.values.coverage_e.value).toBe("500000");
    expect(again.values.water_backup.value).toBe("10000");
  });
});

describe("sep7ch master sheet fields", () => {
  it("includes the new home catalog keys", () => {
    const keys = new Set(fieldsForLine("home").map((field) => field.key));
    for (const key of [
      "building_code",
      "inspection_company",
      "license_or_certificate_number",
      "wind_mit_inspector",
      "date_inspected",
      "current_policy_named_insured",
      "wind_speed",
      "stories",
      "structure_type",
      "pool_type",
      "bceg_grade",
      "protection_class",
      "flood_zone",
      "electrical_update_type",
      "plumbing_update_type",
      "heat_update_type",
      "roof_update_type",
      "water_heater_location",
      "electrical_year",
      "hvac_year",
      "water_heater_year",
      "plumbing_year",
      "months_occupied",
      "usage",
      "ordinance_or_law",
      "water_backup",
      "wind_hail_deductible",
      "mortgagee_name",
      "loan_number",
      "mortgagee_address",
      "deadbolts",
    ]) {
      expect(keys.has(key), key).toBe(true);
    }
    const blank = emptySheetValues("home");
    expect(blank.building_code.status).toBe("missing");
    expect(blank.inspection_company.value).toBe("");
  });
});
