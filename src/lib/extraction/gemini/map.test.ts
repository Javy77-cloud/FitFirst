import { describe, expect, it } from "vitest";
import { CONFIDENCE_THRESHOLD } from "@/lib/domain";
import {
  fillableGeminiFields,
  mapGeminiJsonToFields,
  normalizeOirLetterCode,
  parseAddressParts,
  sheetKeysForGeminiKey,
} from "./map";
import { geminiKeysForShopLine } from "./prompt";

describe("gemini map key mapping", () => {
  it("maps Gemini JSON keys onto sheet field keys", () => {
    expect(sheetKeysForGeminiKey("property_address")).toEqual([
      "address",
      "address1",
      "applicant_address",
    ]);
    expect(sheetKeysForGeminiKey("license_number")).toEqual([
      "license_or_certificate_number",
    ]);
    expect(sheetKeysForGeminiKey("construction_type")).toEqual(["construction"]);
    expect(sheetKeysForGeminiKey("ordinance_law")).toEqual(["ordinance_or_law"]);
    expect(sheetKeysForGeminiKey("current_policy_name_insured")).toEqual([
      "named_insured",
      "current_policy_named_insured",
    ]);
    expect(sheetKeysForGeminiKey("roof_deck_attachment")).toEqual([
      "roof_deck_attachment",
      "roof_deck",
    ]);
    expect(sheetKeysForGeminiKey("design_wind_speed")).toEqual([
      "wind_speed",
      "design_wind_speed",
    ]);
    expect(sheetKeysForGeminiKey("wind_mit_form")).toEqual(["wind_mit_form"]);
    expect(sheetKeysForGeminiKey("wind_mit_date")).toEqual(["wind_mit_date"]);
    expect(sheetKeysForGeminiKey("terrain")).toEqual(["terrain"]);
    expect(sheetKeysForGeminiKey("swr")).toEqual(["swr", "secondary_water"]);
    expect(sheetKeysForGeminiKey("roof_year")).toEqual(["roof_year"]);
    expect(sheetKeysForGeminiKey("electrical_year")).toEqual(["electrical_year"]);
    expect(sheetKeysForGeminiKey("plumbing_year")).toEqual(["plumbing_year"]);
    expect(sheetKeysForGeminiKey("hvac_year")).toEqual(["hvac_year"]);
    expect(sheetKeysForGeminiKey("water_heater_year")).toEqual(["water_heater_year"]);
    expect(sheetKeysForGeminiKey("electrical_updated")).toEqual(["electrical_updated"]);
    expect(sheetKeysForGeminiKey("roof_condition")).toEqual(["roof_condition"]);
    expect(sheetKeysForGeminiKey("four_point_date")).toEqual(["four_point_date"]);
    expect(sheetKeysForGeminiKey("date_inspected")).toEqual(["date_inspected"]);
    expect(sheetKeysForGeminiKey("inspection_date")).toEqual(["date_inspected"]);
    expect(sheetKeysForGeminiKey("date_of_inspection")).toEqual(["date_inspected"]);
    expect(sheetKeysForGeminiKey("current_carrier")).toEqual(["current_carrier"]);
    expect(sheetKeysForGeminiKey("mortgagee_address")).toEqual(["mortgagee_address"]);
    expect(sheetKeysForGeminiKey("occupancy")).toEqual(["occupancy"]);
    expect(sheetKeysForGeminiKey("months_occupied")).toEqual(["months_occupied"]);
    expect(sheetKeysForGeminiKey("stories")).toEqual(["stories"]);
    expect(sheetKeysForGeminiKey("form")).toEqual(["form"]);
    expect(sheetKeysForGeminiKey("sprinkler")).toEqual(["sprinkler"]);
    expect(sheetKeysForGeminiKey("fire_alarm")).toEqual(["central_alarm", "fire_alarm"]);
    expect(sheetKeysForGeminiKey("bceg_grade")).toEqual(["bceg_grade"]);
    expect(sheetKeysForGeminiKey("loss_of_rents")).toEqual(["loss_of_rents"]);
    expect(sheetKeysForGeminiKey("fair_rental_value")).toEqual(["loss_of_rents", "coverage_d"]);
    expect(sheetKeysForGeminiKey("landlord_liability")).toEqual(["landlord_liability", "coverage_e"]);
  });

  it("maps four-point system years onto sheet fields from Gemini JSON", () => {
    const result = mapGeminiJsonToFields(
      {
        electrical_year: { value: "2008", confidence: 0.92 },
        plumbing_year: { value: "1998", confidence: 0.9 },
        hvac_year: { value: "2019", confidence: 0.91 },
        water_heater_year: { value: "2016", confidence: 0.88 },
        electrical_updated: { value: "2015", confidence: 0.85 },
        roof_condition: { value: "Good", confidence: 0.9 },
        four_point_date: { value: "01/15/2024", confidence: 0.93 },
      },
      "four_point",
    );
    const byKey = Object.fromEntries(result.fields.map((f) => [f.fieldKey, f]));
    expect(byKey.electrical_year.normalizedValue).toBe("2008");
    expect(byKey.plumbing_year.normalizedValue).toBe("1998");
    expect(byKey.hvac_year.normalizedValue).toBe("2019");
    expect(byKey.water_heater_year.normalizedValue).toBe("2016");
    expect(byKey.electrical_updated.normalizedValue).toBe("2015");
    expect(byKey.roof_condition.normalizedValue).toBe("Good");
    expect(byKey.four_point_date.normalizedValue).toBe("01/15/2024");
    expect(byKey.date_inspected.normalizedValue).toBe("01/15/2024");
  });

  it("parses city/state/zip from property_address when possible", () => {
    const parts = parseAddressParts("100 Palm St, Fort Myers, FL 33901");
    expect(parts).toEqual({
      street: "100 Palm St",
      city: "Fort Myers",
      state: "FL",
      zip: "33901",
    });
  });

  it("writes above-threshold values and skips auto-fill below threshold", () => {
    const result = mapGeminiJsonToFields(
      {
        applicant_name: { value: "Elena Ruiz", confidence: 0.95 },
        year_built: { value: "1998", confidence: 0.5 },
        coverage_a: { value: "350000", confidence: CONFIDENCE_THRESHOLD },
        property_address: {
          value: "100 Palm St, Fort Myers, FL 33901",
          confidence: 0.9,
        },
      },
      "dec",
    );

    const byKey = Object.fromEntries(result.fields.map((f) => [f.fieldKey, f]));
    expect(byKey.applicant_name.normalizedValue).toBe("Elena Ruiz");
    expect(byKey.applicant_name.flagged).toBe(false);
    expect(byKey.applicant_name.matchPath).toBe("gemini");

    expect(byKey.year_built.rawValue).toBe("1998");
    expect(byKey.year_built.normalizedValue).toBe("");
    expect(byKey.year_built.flagged).toBe(true);
    expect(byKey.year_built.blankAfterMatch).toBe(true);
    expect(byKey.year_built.missReason).toBe("below_confidence_threshold");

    expect(byKey.coverage_a.normalizedValue).toBe("350000");
    expect(byKey.coverage_a.flagged).toBe(false);

    expect(byKey.address1.normalizedValue).toBe("100 Palm St");
    expect(byKey.city.normalizedValue).toBe("Fort Myers");
    expect(byKey.state.normalizedValue).toBe("FL");
    expect(byKey.zip.normalizedValue).toBe("33901");

    const fillable = fillableGeminiFields(result.fields);
    expect(fillable.every((f) => f.normalizedValue.trim() !== "")).toBe(true);
    expect(fillable.find((f) => f.fieldKey === "year_built")).toBeUndefined();
    expect(result.glanceRequired).toBe(true);
  });
});

describe("normalizeOirLetterCode", () => {
  it("strips long OIR labels to letter codes", () => {
    expect(normalizeOirLetterCode("roof_deck_attachment", "C. Plywood/OSB roof sheathing")).toBe("C");
    expect(normalizeOirLetterCode("roof_to_wall", "A. Toenails")).toBe("A");
    expect(normalizeOirLetterCode("opening_protection", "Class A (All Openings)")).toBe("A");
    expect(normalizeOirLetterCode("building_code", "B. 1994 South Florida Building Code")).toBe("B");
    expect(normalizeOirLetterCode("terrain", "C")).toBe("C");
    expect(normalizeOirLetterCode("building_code", "4")).toBe("4");
  });

  it("maps roof geometry words to OIR-B1-1802 letters", () => {
    expect(normalizeOirLetterCode("roof_shape", "hip")).toBe("A");
    expect(normalizeOirLetterCode("roof_shape", "flat")).toBe("B");
    expect(normalizeOirLetterCode("roof_shape", "gable")).toBe("C");
  });

  it("applies letter coercion when mapping Gemini JSON to sheet fields", () => {
    const result = mapGeminiJsonToFields(
      {
        roof_shape: { value: "hip", confidence: 0.95 },
        roof_deck_attachment: { value: "C. Plywood/OSB roof sheathing", confidence: 0.92 },
        roof_to_wall: { value: "A. Toenails", confidence: 0.9 },
        opening_protection: { value: "Class A (All Openings)", confidence: 0.9 },
        terrain: { value: "C", confidence: 0.88 },
        wind_mit_form: { value: "OIR-B1-1802", confidence: 0.95 },
        wind_mit_date: { value: "03/12/2024", confidence: 0.9 },
        roof_year: { value: "2016", confidence: 0.9 },
      },
      "wind_mit",
    );
    const byKey = Object.fromEntries(result.fields.map((f) => [f.fieldKey, f]));
    expect(byKey.roof_shape.normalizedValue).toBe("A");
    expect(byKey.roof_shape.rawValue).toBe("hip");
    expect(byKey.roof_deck.normalizedValue).toBe("C");
    expect(byKey.roof_to_wall.normalizedValue).toBe("A");
    expect(byKey.opening_protection.normalizedValue).toBe("A");
    expect(byKey.terrain.normalizedValue).toBe("C");
    expect(byKey.wind_mit_form.normalizedValue).toBe("OIR-B1-1802");
    expect(byKey.wind_mit_date.normalizedValue).toBe("03/12/2024");
    expect(byKey.roof_year.normalizedValue).toBe("2016");
  });
});

describe("auto gemini keys", () => {
  it("maps vin / vehicle / driver keys onto the auto sheet", () => {
    expect(sheetKeysForGeminiKey("vin")).toEqual(["vin"]);
    expect(sheetKeysForGeminiKey("vehicle_year")).toEqual(["vehicle_year"]);
    expect(sheetKeysForGeminiKey("driver_1_name")).toEqual(["driver_1_name"]);
    expect(geminiKeysForShopLine("auto")).toContain("vin");
    expect(geminiKeysForShopLine("home")).not.toContain("vin");
  });
});
