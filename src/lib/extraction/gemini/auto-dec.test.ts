/**
 * Auto declaration photos (Domenic Iori desk) were returning no Risk Profile fields.
 * Gemini vision often sends bare strings or a nested vehicles/drivers/coverages object.
 * Production check: https://fit-first-seven.vercel.app → Domenic Iori deal →
 * Documents, Auto line → confirm the dec photo is on the deal → Fill Risk Profile.
 * VIN, year/make/model, drivers, BI/PD/PIP/comp/collision, and policy dates should land as CHECK.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shopLineForGeminiExtract } from "@/lib/deals/quote-docs";
import { docTypeUsesGemini } from "@/lib/extraction/gemini";
import {
  GEMINI_FETCH_TIMEOUT_MS,
  GEMINI_FILL_OVERALL_TIMEOUT_MS,
} from "@/lib/extraction/gemini/client";
import { HEIC_CONVERT_TIMEOUT_MS } from "@/lib/extraction/ocr";
import { MASTER_FILL_STEP_TIMEOUT_MS } from "@/lib/quote-sheet/master-fill";
import { fillableGeminiFields, mapGeminiJsonToFields } from "@/lib/extraction/gemini/map";
import { buildGeminiSystemPrompt, buildGeminiUserPrompt } from "@/lib/extraction/gemini/prompt";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues, extractKeyToSheetKey } from "@/lib/quote-sheet/catalog";

const ACORD_AUTO_DEC_JSON = {
  named_insured: "Domenic Iori",
  policy_number: "PA-441902",
  policy_period: "03/15/2026 to 09/15/2026",
  writing_company: "Progressive",
  total_policy_premium: "1,640",
  vehicles: [
    {
      description: "2019 TOYOTA CAMRY",
      vin: "4T1B11HK5KU123456",
      garaging_zip: "32901",
    },
    {
      year: "2016",
      make: "HONDA",
      model: "CR-V",
      VIN: "2HKRM4H75GH123456",
    },
  ],
  drivers: [
    { name: "Domenic Iori", dob: "04/02/1984", license: "I400-123-45-678", gender: "Male" },
    {
      name: "Alex Iori",
      date_of_birth: "11/11/1986",
      license_number: "I400-999-00-111",
      relationship: "Spouse",
    },
  ],
  coverages: {
    bodily_injury: "100/300",
    property_damage: "$100,000",
    uninsured_motorist: "100/300",
    personal_injury_protection: "10000",
    comprehensive: { deductible: "500", confidence: 0.92 },
    collision: "500",
  },
};

describe("auto declaration extract → Auto risk profile", () => {
  it("fills Auto RP fields from a nested ACORD-style Gemini payload", () => {
    const mapped = mapGeminiJsonToFields(ACORD_AUTO_DEC_JSON, "photo", "auto");
    const fillable = fillableGeminiFields(mapped.fields);
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillable);

    expect(applied.values.vin.value).toBe("4T1B11HK5KU123456");
    expect(applied.values.vehicle_year.value).toBe("2019");
    expect(applied.values.vehicle_make.value).toBe("TOYOTA");
    expect(applied.values.vehicle_model.value).toBe("CAMRY");
    expect(applied.values.garaging_zip.value).toBe("32901");
    expect(applied.values.vehicle_2_vin.value).toBe("2HKRM4H75GH123456");
    expect(applied.values.vehicle_2_year.value).toBe("2016");
    expect(applied.values.vehicle_2_make.value).toBe("HONDA");
    expect(applied.values.vehicle_2_model.value).toBe("CR-V");
    expect(applied.values.driver_1_name.value).toBe("Domenic Iori");
    expect(applied.values.driver_1_dob.value).toBe("04/02/1984");
    expect(applied.values.driver_1_license.value).toBe("I400-123-45-678");
    expect(applied.values.driver_1_gender.value).toBe("Male");
    expect(applied.values.driver_2_name.value).toBe("Alex Iori");
    expect(applied.values.driver_2_dob.value).toBe("11/11/1986");
    expect(applied.values.driver_2_license.value).toBe("I400-999-00-111");
    expect(applied.values.driver_2_relationship?.value).toBe("Spouse");
    expect(applied.values.liability_bi.value).toBe("100/300");
    expect(applied.values.liability_pd.value).toBe("100000");
    expect(applied.values.um_uim.value).toBe("100/300");
    expect(applied.values.pip.value).toBe("10000");
    expect(applied.values.comp_deductible.value).toBe("500");
    expect(applied.values.collision_deductible.value).toBe("500");
    expect(applied.values.effective_date.value).toBe("03/15/2026");
    expect(applied.values.expiration_date.value).toBe("09/15/2026");
    expect(applied.values.policy_number.value).toBe("PA-441902");
    expect(applied.values.current_carrier.value).toBe("Progressive");
    expect(applied.values.current_premium.value).toBe("1640");
    expect(applied.filledKeys.length).toBeGreaterThan(10);
  });

  it("treats bare printed strings as fillable instead of dropping them under 0.8", () => {
    const mapped = mapGeminiJsonToFields(
      {
        vin: "1HGCM82633A004352",
        vehicle_year: "2018",
        vehicle_make: "Honda",
        liability_bi: "50/100",
      },
      "photo",
      "auto",
    );
    const vin = mapped.fields.find((field) => field.fieldKey === "vin");
    expect(vin?.confidence).toBeGreaterThanOrEqual(0.8);
    expect(vin?.normalizedValue).toBe("1HGCM82633A004352");
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.vin.value).toBe("1HGCM82633A004352");
    expect(applied.values.vehicle_year.value).toBe("2018");
    expect(applied.values.liability_bi.value).toBe("50/100");
  });

  it("keeps an explicit low confidence blank and does not steal Home year_built", () => {
    const low = mapGeminiJsonToFields(
      { year_built: { value: "1998", confidence: 0.5 }, coverage_a: "250000" },
      "dec",
      "home",
    );
    const year = low.fields.find((field) => field.fieldKey === "year_built");
    expect(year?.normalizedValue).toBe("");
    expect(low.fields.some((field) => field.fieldKey === "vehicle_year")).toBe(false);
    const coverage = low.fields.find((field) => field.fieldKey === "coverage_a");
    expect(coverage?.normalizedValue).toBe("250000");
  });

  it("maps extra vehicles and drivers onto the repeatable Auto sheet keys", () => {
    expect(extractKeyToSheetKey("auto", "vehicle_3_vin")).toBe("vehicle_3_vin");
    expect(extractKeyToSheetKey("auto", "driver_2_gender")).toBe("driver_2_gender");
    expect(extractKeyToSheetKey("home", "vehicle_3_vin")).toBeNull();
  });

  it("teaches Gemini to read auto policies and declarations into priority Auto RP fields", () => {
    const system = buildGeminiSystemPrompt("photo", "auto");
    const user = buildGeminiUserPrompt("policy", "auto");
    const pdf = buildGeminiUserPrompt("dec", "auto");
    expect(system).toMatch(/Auto policies and Auto declarations/);
    expect(system).toMatch(/phone photos and PDFs/);
    expect(system).toMatch(/ACORD 90/);
    expect(system).toMatch(/2019 TOYOTA CAMRY/);
    expect(system).toMatch(/Never return an empty object/);
    expect(system).toMatch(/Bodily Injury/);
    expect(system.indexOf("Vehicles and VIN")).toBeLessThan(system.indexOf("Other allowed keys"));
    expect(system.indexOf("Drivers")).toBeLessThan(system.indexOf("Coverage limits"));
    expect(system.indexOf("effective_date and expiration_date")).toBeLessThan(system.indexOf("current_carrier"));
    expect(user).toMatch(/Auto policy or Auto declaration/);
    expect(user).toMatch(/not_declaration/);
    expect(user).toMatch(/Do not treat this as homeowners/);
    expect(user).toMatch(/coverage table/);
    expect(user).toMatch(/policy_number/);
    expect(pdf).toMatch(/vin and vehicle_year/);
    expect(docTypeUsesGemini("current_policy")).toBe(true);
    expect(docTypeUsesGemini("policy")).toBe(true);
  });

  it("maps dec-style split limits and Policy # onto Auto RP options", () => {
    const mapped = mapGeminiJsonToFields(
      {
        "Policy #": "PA 90211",
        carrier: "GEICO",
        liability_bi: "$100,000/$300,000",
        liability_pd: "$50,000",
        um_uim: "100k/300k",
        effective_date: "01/01/2026",
        expiration_date: "07/01/2026",
      },
      "current_policy",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.policy_number.value).toBe("PA 90211");
    expect(applied.values.current_carrier.value).toBe("GEICO");
    expect(applied.values.liability_bi.value).toBe("100/300");
    expect(applied.values.liability_pd.value).toBe("50000");
    expect(applied.values.um_uim.value).toBe("100/300");
    expect(applied.values.effective_date.value).toBe("01/01/2026");
    expect(applied.values.expiration_date.value).toBe("07/01/2026");
  });

  it("uses the Auto prompt for an Auto deal photo even when the file is typed dec", () => {
    expect(
      shopLineForGeminiExtract({
        docType: "photo",
        filename: "IMG_1001.HEIC",
        quotingLine: "auto",
      }),
    ).toBe("auto");
    expect(
      shopLineForGeminiExtract({
        docType: "dec",
        filename: "domenic-iori-dec.jpg",
        quotingLine: "auto",
      }),
    ).toBe("auto");
    expect(
      shopLineForGeminiExtract({
        docType: "wind_mit",
        filename: "wind-mit.pdf",
        quotingLine: "auto",
      }),
    ).toBe("home");
    expect(
      shopLineForGeminiExtract({
        docType: "dec",
        filename: "HO3-declarations.pdf",
        quotingLine: "home",
      }),
    ).toBe("home");

    const documents = readFileSync("src/app/actions/documents.ts", "utf8");
    const client = readFileSync("src/lib/extraction/gemini/client.ts", "utf8");
    expect(documents).toMatch(/shopLineForGeminiExtract/);
    expect(client).toMatch(/mapGeminiJsonToFields\(json, docType, options\?\.shopLine\)/);
    expect(client).toMatch(/prepareGeminiInlineBytes/);
    expect(readFileSync("src/lib/extraction/gemini/image-bytes.ts", "utf8")).toMatch(/prepareImageBuffer/);
    expect(readFileSync("src/app/actions/quote-sheet.ts", "utf8")).toMatch(/shopLine: line/);
    expect(readFileSync("src/app/deals/[id]/page.tsx", "utf8")).toMatch(/export const maxDuration = 300/);
  });

  it("keeps hard deadlines so one photo cannot hang Fill Risk Profile Docs forever", () => {
    expect(GEMINI_FETCH_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
    expect(GEMINI_FILL_OVERALL_TIMEOUT_MS).toBeLessThanOrEqual(MASTER_FILL_STEP_TIMEOUT_MS);
    expect(HEIC_CONVERT_TIMEOUT_MS).toBeLessThanOrEqual(15_000);
    const client = readFileSync("src/lib/extraction/gemini/client.ts", "utf8");
    expect(client).toMatch(/withDeadline/);
    expect(client).toMatch(/GEMINI_FILL_OVERALL_TIMEOUT_MS/);
    const action = readFileSync("src/app/actions/quote-sheet.ts", "utf8");
    expect(action).toMatch(/photoLike/);
    expect(action).toMatch(/isImageUpload/);
    expect(action).toMatch(/withDeadline/);
    expect(action).toMatch(/onlyLine: true/);
    expect(action).toMatch(/shopLine: line/);
    const button = readFileSync("src/components/deal/master-sheet-fill-button.tsx", "utf8");
    expect(button).toMatch(/MASTER_FILL_STEP_TIMEOUT_MS/);
    expect(button).toMatch(/Promise\.race/);
  });

});
