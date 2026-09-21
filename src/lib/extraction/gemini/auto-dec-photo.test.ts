import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues, extractKeyToSheetKey } from "@/lib/quote-sheet/catalog";
import { normalizeAutoSplitLimit } from "@/lib/quote-sheet/sheet-defaults";
import { fillableGeminiFields, mapGeminiJsonToFields } from "./map";
import { buildGeminiSystemPrompt, buildGeminiUserPrompt } from "./prompt";

/**
 * Shape Gemini actually returns for a phone photo of a Florida personal auto dec
 * when it does not follow the flat key list: low confidence, ACORD labels, or
 * nested vehicle / driver / coverage schedules. Values are a sample, not a live file.
 */
const PHOTO_FLAT = {
  named_insured: { value: "Alex Marin", confidence: 0.62 },
  secondary_named_insured: { value: "Jamie Marin", confidence: 0.62 },
  vin: { value: "1HGCM82633A004352", confidence: 0.66 },
  vehicle_year: { value: "2018", confidence: 0.7 },
  vehicle_make: { value: "Honda", confidence: 0.7 },
  vehicle_model: { value: "Accord", confidence: 0.7 },
  bodily_injury: { value: "$100,000/$300,000", confidence: 0.61 },
  property_damage: { value: "$100,000", confidence: 0.61 },
  comprehensive: { value: "$500", confidence: 0.6 },
  collision: { value: "500", confidence: 0.6 },
  pip: { value: "10000", confidence: 0.64 },
  "Uninsured Motorist": { value: "100/300", confidence: 0.64 },
  policy_number: { value: "PRG-FL-552190", confidence: 0.64 },
  effective_date: { value: "09/01/2026 to 03/01/2027", confidence: 0.63 },
  current_premium: { value: "1640", confidence: 0.62 },
  current_carrier: { value: "Progressive", confidence: 0.7 },
};

const NESTED_ACORD = {
  document_kind: "declaration",
  policy: {
    policy_number: "FL-AUTO-1001",
    carrier: "GEICO",
    premium: "1890",
    effective: "01/15/2026",
    expiration: "07/15/2026",
    named_insured: "Alex Marin",
  },
  vehicles: [
    {
      Year: "2020",
      Make: "Toyota",
      Model: "RAV4",
      VIN: "2T3W1RFV8LC123456",
      Garaging: "100 Sample Dec Ln, Palm Bay, FL 32909",
    },
    {
      year: "2016",
      make: "Ford",
      model: "F-150",
      vin: "1FTEW1EP4GKF12345",
    },
  ],
  drivers: [
    {
      name: "Alex Marin",
      dob: "04/02/1984",
      gender: "Male",
      license: "M123-456-78-901-0",
      relationship: "Named insured",
    },
    {
      name: "Jamie Marin",
      dob: "11/19/1986",
      gender: "Female",
      relationship: "Spouse",
      license: "M999-111-22-333-0",
    },
  ],
  coverages: [
    { name: "Bodily Injury Liability", limit: "50/100" },
    { name: "Property Damage", limit: "50000" },
    { name: "Uninsured Motorist", limit: "50/100" },
    { name: "Personal Injury Protection", limit: "10000" },
    { name: "Other Than Collision", deductible: "1000" },
    { name: "Collision", deductible: "1000" },
  ],
};

function valueOf(
  fields: { fieldKey: string; normalizedValue: string }[],
  key: string,
): string {
  return fields.find((field) => field.fieldKey === key)?.normalizedValue ?? "";
}

describe("auto dec photo → Auto risk profile", () => {
  it("keeps a readable photo extract that scores under the homeowners 0.8 bar", () => {
    const extracted = mapGeminiJsonToFields(PHOTO_FLAT, "photo", { shopLine: "auto" });
    const fillable = fillableGeminiFields(extracted.fields);
    expect(valueOf(fillable, "vin")).toBe("1HGCM82633A004352");
    expect(valueOf(fillable, "vehicle_year")).toBe("2018");
    expect(valueOf(fillable, "vehicle_make")).toBe("Honda");
    expect(valueOf(fillable, "driver_1_name")).toBe("Alex Marin");
    expect(valueOf(fillable, "driver_2_name")).toBe("Jamie Marin");
    expect(valueOf(fillable, "liability_bi")).toBe("$100,000/$300,000");
    expect(valueOf(fillable, "comp_deductible")).toBe("$500");
    expect(valueOf(fillable, "policy_number")).toBe("PRG-FL-552190");
    expect(valueOf(fillable, "effective_date")).toBe("09/01/2026");
    expect(valueOf(fillable, "expiration_date")).toBe("03/01/2027");
    expect(valueOf(fillable, "um_uim")).toBe("100/300");
    expect(fillable.some((field) => field.fieldKey === "driver_1_relationship")).toBe(false);

    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillable);
    expect(applied.values.vin.value).toBe("1HGCM82633A004352");
    expect(applied.values.vehicle_model.value).toBe("Accord");
    expect(applied.values.driver_1_name.value).toBe("Alex Marin");
    expect(applied.values.driver_2_name.value).toBe("Jamie Marin");
    expect(applied.values.liability_bi.value).toBe("100/300");
    expect(applied.values.liability_pd.value).toBe("100000");
    expect(applied.values.pip.value).toBe("10000");
    expect(applied.values.comp_deductible.value).toBe("500");
    expect(applied.values.collision_deductible.value).toBe("500");
    expect(applied.values.policy_number.value).toBe("PRG-FL-552190");
    expect(applied.values.effective_date.value).toBe("09/01/2026");
    expect(applied.values.expiration_date.value).toBe("03/01/2027");
    expect(applied.values.current_carrier.value).toBe("Progressive");
    expect(applied.values.current_premium.value).toBe("1640");
    expect(applied.filledKeys.length).toBeGreaterThan(8);
  });

  it("flattens a nested ACORD vehicle, driver, and coverage schedule onto sheet keys", () => {
    const extracted = mapGeminiJsonToFields(NESTED_ACORD, "dec", { shopLine: "auto" });
    const fillable = fillableGeminiFields(extracted.fields);
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillable);

    expect(applied.values.vin.value).toBe("2T3W1RFV8LC123456");
    expect(applied.values.vehicle_year.value).toBe("2020");
    expect(applied.values.vehicle_make.value).toBe("Toyota");
    expect(applied.values.vehicle_model.value).toBe("RAV4");
    expect(applied.values.garaging_address.value).toMatch(/Sample Dec Ln/);
    expect(applied.values.garaging_zip.value).toBe("32909");
    expect(applied.values.vehicle_2_vin.value).toBe("1FTEW1EP4GKF12345");
    expect(applied.values.vehicle_2_year.value).toBe("2016");
    expect(applied.values.vehicle_2_make.value).toBe("Ford");
    expect(applied.values.driver_1_name.value).toBe("Alex Marin");
    expect(applied.values.driver_1_dob.value).toBe("04/02/1984");
    expect(applied.values.driver_1_gender.value).toBe("Male");
    expect(applied.values.driver_2_name.value).toBe("Jamie Marin");
    expect(applied.values.driver_2_gender.value).toBe("Female");
    expect(applied.values.driver_2_relationship.value).toBe("Spouse");
    expect(applied.values.driver_1_relationship).toBeUndefined();
    expect(applied.values.liability_bi.value).toBe("50/100");
    expect(applied.values.liability_pd.value).toBe("50000");
    expect(applied.values.um_uim.value).toBe("50/100");
    expect(applied.values.pip.value).toBe("10000");
    expect(applied.values.comp_deductible.value).toBe("1000");
    expect(applied.values.collision_deductible.value).toBe("1000");
    expect(applied.values.policy_number.value).toBe("FL-AUTO-1001");
    expect(applied.values.current_carrier.value).toBe("GEICO");
    expect(applied.values.current_premium.value).toBe("1890");
    expect(applied.values.effective_date.value).toBe("01/15/2026");
    expect(applied.values.expiration_date.value).toBe("07/15/2026");
  });

  it("does not lower the homeowners confidence bar when the page is not an auto dec", () => {
    const home = mapGeminiJsonToFields(
      { coverage_a: { value: "285000", confidence: 0.62 } },
      "dec",
      { shopLine: "home" },
    );
    expect(valueOf(home.fields, "coverage_a")).toBe("");
    expect(fillableGeminiFields(home.fields)).toHaveLength(0);

    const mixed = mapGeminiJsonToFields(
      {
        vin: { value: "1HGCM82633A004352", confidence: 0.66 },
        coverage_a: { value: "285000", confidence: 0.62 },
      },
      "photo",
    );
    expect(valueOf(fillableGeminiFields(mixed.fields), "vin")).toBe("1HGCM82633A004352");
    expect(valueOf(mixed.fields, "coverage_a")).toBe("");
  });

  it("accepts repeatable Auto driver keys the static catalog does not list", () => {
    expect(extractKeyToSheetKey("auto", "driver_2_gender")).toBe("driver_2_gender");
    expect(extractKeyToSheetKey("auto", "vehicle_2_usage")).toBe("vehicle_2_usage");
    expect(extractKeyToSheetKey("home", "driver_2_gender")).toBeNull();
    expect(normalizeAutoSplitLimit("$100,000/$300,000")).toBe("100/300");
    expect(normalizeAutoSplitLimit("10-20")).toBe("10/20");
  });

  it("teaches Gemini the auto dec photo layout without the homeowners empty-dec instruction", () => {
    const system = buildGeminiSystemPrompt("photo", "auto");
    const user = buildGeminiUserPrompt("photo", "auto");
    expect(system).toMatch(/ACORD/);
    expect(system).toMatch(/confidence >= 0\.9/);
    expect(system).toMatch(/Personal Injury Protection/);
    expect(system).toMatch(/vehicle schedule/i);
    expect(system).toMatch(/Never return \{\}/);
    expect(user).toMatch(/Phone photos/);
    expect(user).toMatch(/confidence must be at least 0\.9/);
    expect(user).toMatch(/Do not treat this as homeowners/);
    expect(user).not.toMatch(/leave policy fields empty/);
    expect(readFileSync("src/app/actions/documents.ts", "utf8")).toMatch(/shopLineForGeminiExtract/);
    expect(readFileSync("src/lib/extraction/gemini/client.ts", "utf8")).toMatch(
      /shopLine: options\?\.shopLine/,
    );
    expect(readFileSync("src/app/actions/quote-sheet.ts", "utf8")).toMatch(/shopLine: line/);
  });
});
