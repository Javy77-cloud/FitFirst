import { describe, expect, it } from "vitest";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { extractFieldsFromText } from "./extract";
import {
  FIELD_MAPS,
  lookupSheetField,
  requiredMapPairs,
} from "./field-maps";

describe("per-form field maps", () => {
  it("maps the required OIR-B1-1802 wind mit labels onto sheet fields", () => {
    for (const [label, field] of requiredMapPairs("wind_mit")) {
      expect(lookupSheetField("wind_mit", label)).toBe(field);
    }
    expect(lookupSheetField("wind_mit", "Roof deck attachment")).toBe("roof_deck");
    expect(lookupSheetField("wind_mit", "Secondary water resistance")).toBe("swr");
    expect(FIELD_MAPS.wind_mit.length).toBeGreaterThanOrEqual(6);
  });

  it("maps the required four-point labels onto sheet fields", () => {
    for (const [label, field] of requiredMapPairs("four_point")) {
      expect(lookupSheetField("four_point", label)).toBe(field);
    }
    expect(lookupSheetField("four_point", "Actual year built")).toBe("year_built");
    expect(FIELD_MAPS.four_point.length).toBeGreaterThanOrEqual(6);
  });

  it("maps reasonable HO3 dec-page labels onto sheet fields", () => {
    expect(lookupSheetField("dec", "Coverage A")).toBe("coverage_a");
    expect(lookupSheetField("dec", "Named insured")).toBe("named_insured");
    expect(lookupSheetField("dec", "Residence premises")).toBe("address");
    expect(lookupSheetField("dec", "Hurricane deductible")).toBe("hurricane_deductible");
    expect(lookupSheetField("dec", "Zestimate")).toBeNull();
    expect(lookupSheetField("dec", "List price")).toBeNull();
  });

  it("extracts wind mit labels through the map and leaves unmapped blank", () => {
    const text = `WIND MITIGATION INSPECTION
OIR-B1-1802
Roof covering: Concrete tile
Roof deck attachment: 8d @ 6"
Roof-to-wall connection: Clips
Opening protection: None
Roof geometry: Hip
Secondary water resistance: Yes
Mystery scribble: invent-me
`;
    const result = extractFieldsFromText(text, "wind_mit");
    expect(result.fieldMapDocType).toBe("wind_mit");
    const byKey = Object.fromEntries(result.fields.map((field) => [field.fieldKey, field]));
    expect(byKey.roof_covering.normalizedValue.toLowerCase()).toContain("tile");
    expect(byKey.roof_deck.normalizedValue).toMatch(/8d/i);
    expect(byKey.roof_to_wall.normalizedValue.toLowerCase()).toContain("clip");
    expect(byKey.opening_protection.normalizedValue).toBe("none");
    expect(byKey.roof_shape.normalizedValue).toBe("hip");
    expect(byKey.swr.normalizedValue).toBe("yes");
    expect(result.fields.some((field) => field.normalizedValue === "invent-me")).toBe(false);
    expect(result.unmappedLabels.some((row) => /mystery/i.test(row.sourceLabel))).toBe(true);

    const applied = applyExtractedToSheet("home", emptySheetValues("home"), result.fields);
    expect(applied.values.roof_covering.value.toLowerCase()).toContain("tile");
    expect(applied.values.roof_deck.value).toMatch(/8d/i);
    expect(applied.values.roof_to_wall.value.toLowerCase()).toContain("clip");
    expect(applied.values.roof_shape.value).toBe("hip");
    expect(applied.values.secondary_water.value).toBe("yes");
    expect(applied.values.opening_protection.status).toBe("check");
    expect(applied.values.coverage_a.value).toBe("");
    expect(applied.values.coverage_a.status).toBe("missing");
  });

  it("extracts four-point labels through the map", () => {
    const text = `FOUR POINT INSPECTION
Age of electrical panel: 2008
Year last updated: 2019
Age of piping supply system: 2008
Age of water heater: 2016
HVAC year: 2015
Actual year built: 1998
Unknown inspector code: ZZ-99
`;
    const result = extractFieldsFromText(text, "four_point");
    const byKey = Object.fromEntries(result.fields.map((field) => [field.fieldKey, field]));
    expect(byKey.electrical_year.normalizedValue).toBe("2008");
    // sep7ch: "Year last updated" maps to hvac_year (not electrical_updated).
    expect(byKey.hvac_year.normalizedValue).toBe("2019");
    expect(byKey.plumbing_year.normalizedValue).toBe("2008");
    expect(byKey.water_heater_year.normalizedValue).toBe("2016");
    expect(byKey.year_built.normalizedValue).toBe("1998");
    expect(result.fields.some((field) => field.normalizedValue === "ZZ-99")).toBe(false);
    expect(result.unmappedLabels.some((row) => /unknown inspector/i.test(row.sourceLabel))).toBe(true);

    const applied = applyExtractedToSheet("home", emptySheetValues("home"), result.fields);
    expect(applied.values.electrical_year.value).toBe("2008");
    expect(applied.values.hvac_year.value).toBe("2019");
    expect(applied.values.plumbing_year.value).toBe("2008");
    expect(applied.values.water_heater_year.value).toBe("2016");
    expect(applied.values.year_built.status).toBe("check");
  });

  it("does not invent a sheet value for an unmapped labeled line", () => {
    const result = extractFieldsFromText(
      `HOMEOWNERS DECLARATIONS
Named Insured: Test Owner
Zestimate: $410,000
List price: $399,000
Neighbor opinion: brick
`,
      "dec",
    );
    expect(result.fields.find((field) => field.fieldKey === "named_insured")?.normalizedValue).toBe(
      "Test Owner",
    );
    expect(result.fields.some((field) => field.normalizedValue === "410000")).toBe(false);
    expect(result.fields.some((field) => /410,000|399,000|brick/.test(field.normalizedValue))).toBe(
      false,
    );
    expect(result.unmappedLabels.map((row) => row.sourceLabel.toLowerCase())).toEqual(
      expect.arrayContaining(["zestimate", "list price", "neighbor opinion"]),
    );
    const applied = applyExtractedToSheet("home", emptySheetValues("home"), result.fields);
    expect(applied.values.coverage_a.value).toBe("");
    expect(applied.values.construction.value).toBe("");
  });
});
