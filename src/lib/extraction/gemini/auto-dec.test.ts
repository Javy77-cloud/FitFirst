/**
 * Auto declaration photos (Domenic Iori desk) were returning no Risk Profile fields.
 * Gemini vision often sends bare strings or a nested vehicles/drivers/coverages object.
 * Production check: https://fit-first-seven.vercel.app → Domenic Iori deal →
 * Documents, Auto line → confirm the dec photo is on the deal → Fill Risk Profile.
 * VIN, year/make/model, full driver names, BI/PD/UM/PIP/comp/collision,
 * and the Current Policy block should land as CHECK.
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
import {
  ADRIANA_IORI_DEC_PAGE_FILENAME,
  ADRIANA_IORI_TRAVELERS_DEC_PAGE,
  ADRIANA_IORI_TRAVELERS_DEC_PREMIUM_BOX,
} from "@/lib/extraction/gemini/fixtures/adriana-iori-travelers-dec";
import {
  TRAVELERS_COVERAGE_SCHEDULE,
  TRAVELERS_DECLARATIONS_ENVELOPE,
  TRAVELERS_ISSUED_AUTO_NESTED,
  TRAVELERS_ITEM_BLOCKS,
  TRAVELERS_POLICY_PERIOD_WITH_CLOCK,
  TRAVELERS_VEHICLE_TOTALS,
} from "@/lib/extraction/gemini/fixtures/travelers-issued-auto";
import { splitPolicyPeriod } from "@/lib/extraction/gemini/auto-layout";
import { sanitizeGeminiPreview } from "@/lib/extraction/gemini/preview";
import { fillableGeminiFields, mapGeminiJsonToFields } from "@/lib/extraction/gemini/map";
import { evaluateMintExtract, mintGeminiValue } from "@/lib/policy/mint-gate";
import { buildGeminiSystemPrompt, buildGeminiUserPrompt } from "@/lib/extraction/gemini/prompt";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues, extractKeyToSheetKey } from "@/lib/quote-sheet/catalog";
import { visibleUnitCount } from "@/lib/quote-sheet/repeatable-units";

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
    expect(coverage?.normalizedValue).toBe("$250,000");
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
    expect(system.indexOf("current_carrier")).toBeLessThan(system.indexOf("Vehicles and VIN"));
    expect(system).toMatch(/Do not invent coverages/);
    expect(system).toMatch(/page 2/);
    expect(system).toMatch(/same name and date of birth/);
    expect(system).toMatch(/Allstate Fire and Casualty Insurance Company/);
    expect(system).toMatch(/Current Policy example/);
    expect(system).toMatch(/Domenic M Iori/);
    expect(system).toMatch(/Do not truncate/);
    expect(system).toMatch(/years_with_carrier/);
    expect(system).toMatch(/currently_insured/);
    expect(system).toMatch(/aaa_member/);
    expect(system).toMatch(/Never copy these sample values/);
    expect(system).toMatch(/Never invent/);
    expect(system).toMatch(/Adriana Iori DEC Page Travelers\.pdf/);
    expect(system).toMatch(/Begins and Ends/);
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
        docType: "current_policy",
        filename: "Travelers policy.HEIC",
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
    expect(action).toMatch(/export async function fillMasterSheetDocument/);
    expect(action).toMatch(/export async function listMasterFillDocs/);
    expect(action).toMatch(/documentId/);
    expect(action).toMatch(/shopLine: line/);
    const button = readFileSync("src/components/deal/master-sheet-fill-button.tsx", "utf8");
    expect(button).toMatch(/fillMasterSheetDocument/);
    expect(button).toMatch(/listMasterFillDocs/);
    expect(button).toMatch(/step\.id === "docs"/);
    expect(button).toMatch(/MASTER_FILL_DOC_CLIENT_TIMEOUT_MS/);
    expect(button).toMatch(/MASTER_FILL_STEP_TIMEOUT_MS/);
    expect(button).toMatch(/Promise\.race/);
  });

  it("fills Current Policy from nested dec labels that used to be dropped", () => {
    const mapped = mapGeminiJsonToFields(
      {
        current_policy: {
          insurance_name: "Progressive American Insurance Company",
          current_policy_id: "923456789",
          effective_date: "03/15/2026",
          expiration_date: "09/15/2026",
          premium: "$1,640",
          years_with_carrier: "3 years",
          currently_insured: "Currently insured 6 months or more",
          aaa_member: "None",
        },
        drivers: [
          {
            name: "Domenic Ic",
            first_name: "Domenic",
            middle_initial: "M",
            last_name: "Iori",
          },
        ],
        coverages: {
          liability_bodily_injury: "$100,000/$300,000",
          property_damage_liability: "$100,000",
          uninsured_motorist_bodily_injury: "100/300",
          personal_injury_protection: "10000",
          other_than_collision: "500",
          collision_coverage: "500",
        },
        "v.i.n.": "4T1B11HK5KU123456",
        vehicle: "2019 TOYOTA CAMRY",
      },
      "photo",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.current_carrier.value).toBe("Progressive American Insurance Company");
    expect(applied.values.policy_number.value).toBe("923456789");
    expect(applied.values.effective_date.value).toBe("03/15/2026");
    expect(applied.values.expiration_date.value).toBe("09/15/2026");
    expect(applied.values.current_premium.value).toBe("1640");
    expect(applied.values.years_with_carrier.value).toBe("3");
    expect(applied.values.currently_insured.value).toBe("Currently insured 6 months or more");
    expect(applied.values.aaa_member.value).toBe("None");
    expect(applied.values.driver_1_name.value).toBe("Domenic M Iori");
    expect(applied.values.liability_bi.value).toBe("100/300");
    expect(applied.values.liability_pd.value).toBe("100000");
    expect(applied.values.um_uim.value).toBe("100/300");
    expect(applied.values.pip.value).toBe("10000");
    expect(applied.values.comp_deductible.value).toBe("500");
    expect(applied.values.collision_deductible.value).toBe("500");
    expect(applied.values.vin.value).toBe("4T1B11HK5KU123456");
    expect(applied.values.vehicle_year.value).toBe("2019");
    expect(applied.values.vehicle_make.value).toBe("TOYOTA");
    expect(applied.values.vehicle_model.value).toBe("CAMRY");
  });

  it("keeps a full driver name and joins Each Person / Each Accident BI", () => {
    const mapped = mapGeminiJsonToFields(
      {
        driver_1_name: "Domenic Ic",
        driver_1_first_name: "Domenic",
        driver_1_middle_name: "M",
        driver_1_last_name: "Iori",
        coverages: {
          bodily_injury_each_person: "100000",
          bodily_injury_each_accident: "300000",
        },
        named_insurer: "GEICO General Insurance Company",
        "Current policy ID": "PA 90211",
      },
      "current_policy",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.driver_1_name.value).toBe("Domenic M Iori");
    expect(applied.values.liability_bi.value).toBe("100/300");
    expect(applied.values.current_carrier.value).toBe("GEICO General Insurance Company");
    expect(applied.values.policy_number.value).toBe("PA 90211");
  });

  it("does not invent Current Policy facts that are not in the extract", () => {
    const mapped = mapGeminiJsonToFields(
      {
        vin: "4T1B11HK5KU123456",
        driver_1_name: "Domenic M Iori",
        currently_insured: "Yes",
        aaa_member: "Yes",
      },
      "photo",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.vin.value).toBe("4T1B11HK5KU123456");
    expect(applied.values.driver_1_name.value).toBe("Domenic M Iori");
    expect(applied.values.current_carrier.value).toBe("");
    expect(applied.values.policy_number.value).toBe("");
    expect(applied.values.current_premium.value).toBe("");
    expect(applied.values.years_with_carrier.value).toBe("");
    expect(applied.values.effective_date.value).toBe("");
    expect(applied.values.expiration_date.value).toBe("");
    expect(applied.values.currently_insured.value).toBe("Yes");
    expect(applied.values.aaa_member.value).toBe("Yes");
  });

  it("reads a Travelers issued auto policy into policy number, premium, and dates", () => {
    const mapped = mapGeminiJsonToFields(
      {
        writing_company: "Travelers",
        "Policy Number": "612345678 101 1",
        "Total Premium": "$2,109.00",
        policy_period: "09/21/2026 to 03/21/2027",
      },
      "current_policy",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.current_carrier.value).toBe("Travelers");
    expect(applied.values.policy_number.value).toBe("612345678 101 1");
    expect(applied.values.current_premium.value).toBe("2109.00");
    expect(applied.values.effective_date.value).toBe("09/21/2026");
    expect(applied.values.expiration_date.value).toBe("03/21/2027");
    const gate = evaluateMintExtract(
      mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
        rawValue: field.rawValue,
        confidence: field.confidence,
        flagged: field.flagged,
      })),
    );
    expect(gate.ok).toBe(true);
    if (gate.ok) {
      expect(gate.policyNumber).toBe("612345678 101 1");
      expect(gate.premium).toBe("2109");
      expect(gate.effectiveDate).toMatch(/2026-09-21/);
    }
    expect(buildGeminiSystemPrompt("current_policy", "auto")).toMatch(/Full Term Premium/);
    expect(buildGeminiSystemPrompt("current_policy", "auto")).toMatch(/6 Month Premium/);
    expect(buildGeminiSystemPrompt("current_policy", "auto")).toMatch(/12:01 A\.M\./);
    expect(buildGeminiSystemPrompt("current_policy", "auto")).toMatch(/wind mitigation/);
    expect(buildGeminiUserPrompt("current_policy", "auto")).toMatch(/current_premium/);
    expect(buildGeminiUserPrompt("current_policy", "auto")).toMatch(/Premium Due/);
    expect(buildGeminiUserPrompt("current_policy", "auto")).toMatch(/HEIC/);
    expect(buildGeminiUserPrompt("current_policy", "auto")).toMatch(/not a shopping quote/);
    expect(buildGeminiUserPrompt("current_policy", "auto")).toMatch(/every page/);
    expect(buildGeminiUserPrompt("current_policy", "auto")).toMatch(/Adriana Iori DEC Page Travelers\.pdf/);
    expect(buildGeminiUserPrompt("current_policy", "auto")).toMatch(/Begins and Ends/);
    expect(buildGeminiSystemPrompt("current_policy", "auto")).toMatch(/not a shopping quote/);
  });

  it("reads a nested Travelers issued policy without inventing a coverage-line premium", () => {
    const mapped = mapGeminiJsonToFields(TRAVELERS_ISSUED_AUTO_NESTED, "current_policy", "auto");
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.current_carrier.value).toBe("Travelers");
    expect(applied.values.policy_number.value).toBe("612345678 101 1");
    expect(applied.values.current_premium.value).toBe("2109.00");
    expect(applied.values.effective_date.value).toBe("September 21, 2026");
    expect(applied.values.expiration_date.value).toBe("March 21, 2027");
    expect(applied.values.liability_bi.value).toBe("100/300");
    expect(applied.values.liability_pd.value).toBe("100000");
    const gate = evaluateMintExtract(
      mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
        rawValue: field.rawValue,
        confidence: field.confidence,
        flagged: field.flagged,
      })),
    );
    expect(gate.ok).toBe(true);
    if (gate.ok) {
      expect(gate.policyNumber).toBe("612345678 101 1");
      expect(gate.premium).toBe("2109");
      expect(gate.effectiveDate).toMatch(/2026-09-21/);
    }
  });

  it("prefers Full Term Premium over a coverage-line premium and splits a month-name policy period", () => {
    expect(splitPolicyPeriod("From: September 21, 2026 To: March 21, 2027")).toEqual({
      effective: "September 21, 2026",
      expiration: "March 21, 2027",
    });
    expect(splitPolicyPeriod("From: 09/21/2026 12:01 A.M. To: 03/21/2027")).toEqual({
      effective: "09/21/2026",
      expiration: "03/21/2027",
    });
    expect(splitPolicyPeriod(TRAVELERS_POLICY_PERIOD_WITH_CLOCK)).toEqual({
      effective: "September 21, 2026",
      expiration: "March 21, 2027",
    });
    const mapped = mapGeminiJsonToFields(
      {
        company: "The Standard Fire Insurance Company",
        "Policy Number": "612345678 101 1",
        premium: "412.00",
        "Full Term Premium": "$2,109.00",
        policy_period: "From: September 21, 2026 To: March 21, 2027",
      },
      "current_policy",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.current_carrier.value).toBe("The Standard Fire Insurance Company");
    expect(applied.values.current_premium.value).toBe("2109.00");
    expect(applied.values.effective_date.value).toBe("September 21, 2026");
    expect(applied.values.expiration_date.value).toBe("March 21, 2027");
    expect(applied.values.policy_number.value).toBe("612345678 101 1");
  });

  it("keeps a printed Travelers policy number at 0.7 and still blanks an explicit 0.5", () => {
    const kept = mapGeminiJsonToFields(
      {
        policy_number: { value: "612345678 101 1", confidence: 0.7 },
        current_premium: { value: "2109.00", confidence: 0.72 },
        effective_date: { value: "09/21/2026", confidence: 0.66 },
        current_carrier: { value: "Travelers", confidence: 0.61 },
      },
      "current_policy",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(kept.fields));
    expect(applied.values.policy_number.value).toBe("612345678 101 1");
    expect(applied.values.current_premium.value).toBe("2109.00");
    expect(applied.values.effective_date.value).toBe("09/21/2026");
    expect(applied.values.current_carrier.value).toBe("Travelers");
    const low = mapGeminiJsonToFields(
      { policy_number: { value: "612345678 101 1", confidence: 0.5 } },
      "current_policy",
      "auto",
    );
    const blank = low.fields.find((field) => field.fieldKey === "policy_number");
    expect(blank?.normalizedValue).toBe("");
    expect(blank?.rawValue).toBe("612345678 101 1");
    expect(
      mintGeminiValue(
        low.fields.map((field) => ({
          fieldKey: field.fieldKey,
          normalizedValue: field.normalizedValue,
          rawValue: field.rawValue,
          confidence: field.confidence,
        })),
        "policy_number",
      ),
    ).toBe("612345678 101 1");
  });

  it("uses Premium Due when that is the only term premium printed", () => {
    const mapped = mapGeminiJsonToFields(
      {
        writing_company: "Travelers",
        policy_number: "612345678 101 1",
        premiums: { premium_due: "2109.00" },
        effective_date: "09/21/2026",
        expiration_date: "03/21/2027",
      },
      "current_policy",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.current_premium.value).toBe("2109.00");
    expect(applied.values.current_carrier.value).toBe("Travelers");
    expect(applied.values.expiration_date.value).toBe("03/21/2027");
  });

  it("fills Allstate Current Policy keys and leaves years, insured, and AAA blank when unprinted", () => {
    const mapped = mapGeminiJsonToFields(
      {
        current_carrier: "Allstate Fire and Casualty Insurance Company",
        current_premium: "3393.51",
        effective_date: "Sept 29, 2026",
        expiration_date: "Mar 29, 2027",
        policy_number: "941 953 485",
        driver_1_name: "Domenic Iori",
      },
      "photo",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.current_carrier.value).toBe("Allstate Fire and Casualty Insurance Company");
    expect(applied.values.current_premium.value).toBe("3393.51");
    expect(applied.values.effective_date.value).toBe("Sept 29, 2026");
    expect(applied.values.expiration_date.value).toBe("Mar 29, 2027");
    expect(applied.values.policy_number.value).toBe("941 953 485");
    expect(applied.values.driver_1_name.value).toBe("Domenic Iori");
    expect(applied.values.years_with_carrier.value).toBe("");
    expect(applied.values.currently_insured.value).toBe("");
    expect(applied.values.aaa_member.value).toBe("");
    expect(applied.values.liability_bi.value).toBe("");
    expect(applied.values.liability_pd.value).toBe("");
    expect(applied.values.um_uim.value).toBe("");
    expect(applied.values.pip.value).toBe("");
    expect(applied.values.comp_deductible.value).toBe("");
    expect(applied.values.collision_deductible.value).toBe("");
  });

  it("reads coverages from page 2 and does not invent them from a summary page", () => {
    const mapped = mapGeminiJsonToFields(
      {
        current_carrier: "Allstate Fire and Casualty Insurance Company",
        pages: [
          { named_insured: "Domenic Iori" },
          {
            coverages: {
              bodily_injury: "100/300",
              property_damage: "100000",
              uninsured_motorist: "100/300",
              personal_injury_protection: "10000",
              comprehensive: "500",
              collision: "500",
            },
          },
        ],
      },
      "dec",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.current_carrier.value).toBe("Allstate Fire and Casualty Insurance Company");
    expect(applied.values.liability_bi.value).toBe("100/300");
    expect(applied.values.liability_pd.value).toBe("100000");
    expect(applied.values.um_uim.value).toBe("100/300");
    expect(applied.values.pip.value).toBe("10000");
    expect(applied.values.comp_deductible.value).toBe("500");
    expect(applied.values.collision_deductible.value).toBe("500");
  });

  it("dedupes a driver repeated with the same name and date of birth", () => {
    const mapped = mapGeminiJsonToFields(
      {
        drivers: [
          { name: "Domenic Iori", dob: "04/02/1984" },
          { name: "James Iori", dob: "06/01/1990", gender: "Male" },
          { name: "James Iori", dob: "6/1/1990", license: "I400-222-33-444" },
          { name: "Maria Iori", dob: "07/07/1992" },
        ],
        driver_2_name: "James Iori",
        driver_2_dob: "06/01/1990",
        driver_3_name: "James Iori",
        driver_3_dob: "06/01/1990",
      },
      "photo",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.driver_1_name.value).toBe("Domenic Iori");
    expect(applied.values.driver_2_name.value).toBe("James Iori");
    expect(applied.values.driver_2_dob.value).toBe("06/01/1990");
    expect(applied.values.driver_2_license.value).toBe("I400-222-33-444");
    expect(applied.values.driver_2_gender.value).toBe("Male");
    expect(applied.values.driver_3_name.value).toBe("Maria Iori");
    expect(applied.values.driver_3_dob.value).toBe("07/07/1992");
    expect(mapped.fields.some((field) => field.fieldKey === "driver_4_name")).toBe(false);
  });

  it("keeps two drivers who share a name and have different dates of birth", () => {
    const mapped = mapGeminiJsonToFields(
      {
        drivers: [
          { name: "James Iori", dob: "06/01/1962" },
          { name: "James Iori", dob: "06/01/1990" },
        ],
      },
      "photo",
      "auto",
    );
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.driver_1_name.value).toBe("James Iori");
    expect(applied.values.driver_1_dob.value).toBe("06/01/1962");
    expect(applied.values.driver_2_name.value).toBe("James Iori");
    expect(applied.values.driver_2_dob.value).toBe("06/01/1990");
  });

  it("merges James Iori 04/22/1959 across three photo extracts and keeps other drivers", () => {
    const photos = [
      { driver_1_name: "James Iori", driver_1_dob: "04/22/1959", driver_1_gender: "Male" },
      { driver_2_name: "James Iori", driver_2_dob: "4/22/59", driver_2_license: "I400-222-33-444" },
      {
        driver_1_name: "Domenic Iori",
        driver_1_dob: "04/02/1984",
        driver_2_name: "Maria Iori",
        driver_2_dob: "07/07/1992",
        driver_3_name: "James Iori",
        driver_3_dob: "April 22, 1959",
      },
    ];
    let values = emptySheetValues("auto");
    for (const json of photos) {
      const mapped = mapGeminiJsonToFields(json, "photo", "auto");
      values = applyExtractedToSheet("auto", values, fillableGeminiFields(mapped.fields)).values;
    }
    expect(values.driver_1_name.value).toBe("James Iori");
    expect(values.driver_1_gender.value).toBe("Male");
    expect(values.driver_1_license.value).toBe("I400-222-33-444");
    expect(values.driver_2_name.value).toBe("Domenic Iori");
    expect(values.driver_3_name.value).toBe("Maria Iori");
    expect(values.driver_4_name?.value ?? "").toBe("");
    expect(visibleUnitCount(values, "driver")).toBe(3);
  });

  function mintRows(json: Record<string, unknown>) {
    const mapped = mapGeminiJsonToFields(json, "current_policy", "auto");
    return {
      mapped,
      rows: mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
        rawValue: field.rawValue,
        confidence: field.confidence,
        flagged: field.flagged,
      })),
    };
  }

  function expectIssuedTravelers(json: Record<string, unknown>) {
    const { mapped, rows } = mintRows(json);
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.policy_number.value).toBe("612345678 101 1");
    expect(applied.values.current_premium.value.replace(/\.00$/, "")).toMatch(/^2109/);
    expect(applied.values.effective_date.value).toMatch(/2026/);
    expect(applied.values.expiration_date.value).toMatch(/2027/);
    const gate = evaluateMintExtract(rows, {
      documentKind: mapped.documentKind,
      geminiPreview: mapped.geminiPreview,
      filename: "travelers-auto-dec.pdf",
      docType: "current_policy",
    });
    expect(gate.ok).toBe(true);
    if (gate.ok) {
      expect(gate.policyNumber).toBe("612345678 101 1");
      expect(gate.premium).toBe("2109");
      expect(gate.effectiveDate).toMatch(/2026-09-21/);
    }
  }

  it("reads a Travelers coverage-schedule total and a clock before each policy date", () => {
    const mapped = mapGeminiJsonToFields(TRAVELERS_COVERAGE_SCHEDULE, "current_policy", "auto");
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.current_premium.value).toBe("2109.00");
    expect(applied.values.effective_date.value).toBe("September 21, 2026");
    expect(applied.values.expiration_date.value).toBe("March 21, 2027");
    expect(applied.values.liability_bi.value).toBe("100/300");
    expect(applied.values.current_carrier.value).toBe("The Standard Fire Insurance Company");
    expect(applied.values.policy_number.value).toBe("612345678 101 1");
    const gate = evaluateMintExtract(
      mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
        rawValue: field.rawValue,
        confidence: field.confidence,
        flagged: field.flagged,
      })),
    );
    expect(gate.ok).toBe(true);
  });

  it("reads Travelers item two dates and the spelled-out item three premium", () => {
    const mapped = mapGeminiJsonToFields(TRAVELERS_ITEM_BLOCKS, "current_policy", "auto");
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.effective_date.value).toBe("September 21, 2026");
    expect(applied.values.expiration_date.value).toBe("March 21, 2027");
    expect(applied.values.current_premium.value).toBe("2109.00");
    expect(applied.values.policy_number.value).toBe("612345678 101 1");
    const gate = evaluateMintExtract(
      mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
        rawValue: field.rawValue,
        confidence: field.confidence,
        flagged: field.flagged,
      })),
    );
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.effectiveDate).toMatch(/2026-09-21/);
  });

  it("reads a nested declarations block with 6 Month Premium and clocks on the dates", () => {
    const mapped = mapGeminiJsonToFields(TRAVELERS_DECLARATIONS_ENVELOPE, "current_policy", "auto");
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.current_carrier.value).toBe("Travelers");
    expect(applied.values.current_premium.value).toBe("2109.00");
    expect(applied.values.effective_date.value).toBe("September 21, 2026");
    expect(applied.values.expiration_date.value).toBe("March 21, 2027");
    expect(applied.values.policy_number.value).toBe("612345678 101 1");
    const gate = evaluateMintExtract(
      mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
        rawValue: field.rawValue,
        confidence: field.confidence,
        flagged: field.flagged,
      })),
    );
    expect(gate.ok).toBe(true);
  });

  it("sums per-vehicle Travelers totals when the policy total is not printed", () => {
    expectIssuedTravelers(TRAVELERS_VEHICLE_TOTALS);
  });

  it("reads the Adriana Iori Travelers DEC page across page 1 header and a later Full Term row", () => {
    const first = mapGeminiJsonToFields(ADRIANA_IORI_TRAVELERS_DEC_PAGE, "current_policy", "auto");
    const mapped = mapGeminiJsonToFields(ADRIANA_IORI_TRAVELERS_DEC_PAGE, "current_policy", "auto");
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.policy_number.value).toBe("612345678 101 1");
    expect(applied.values.policy_number.value).not.toBe("1");
    expect(applied.values.current_carrier.value).toBe("Travelers");
    expect(applied.values.current_premium.value).toBe("2109.00");
    expect(applied.values.current_premium.value).not.toMatch(/^412/);
    expect(applied.values.current_premium.value).not.toMatch(/^1200/);
    expect(applied.values.effective_date.value).toBe("September 21, 2026");
    expect(applied.values.expiration_date.value).toBe("March 21, 2027");
    expect(applied.values.vin.value).toBe("4T1B11HK5KU123456");
    expect(applied.values.liability_bi.value).toBe("100/300");
    expect(first.fields.find((field) => field.fieldKey === "current_premium")?.normalizedValue).toBe(
      mapped.fields.find((field) => field.fieldKey === "current_premium")?.normalizedValue,
    );
    const gate = evaluateMintExtract(
      mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
        rawValue: field.rawValue,
        confidence: field.confidence,
        flagged: field.flagged,
      })),
      {
        documentKind: mapped.documentKind,
        filename: ADRIANA_IORI_DEC_PAGE_FILENAME,
        docType: "current_policy",
        geminiPreview: mapped.geminiPreview,
      },
    );
    expect(gate.ok).toBe(true);
    if (gate.ok) {
      expect(gate.policyNumber).toBe("612345678 101 1");
      expect(gate.premium).toBe("2109");
      expect(gate.effectiveDate).toMatch(/2026-09-21/);
    }
  });

  it("reads a nested Travelers premium box when the DEC header and the term premium are on different pages", () => {
    const mapped = mapGeminiJsonToFields(ADRIANA_IORI_TRAVELERS_DEC_PREMIUM_BOX, "current_policy", "auto");
    const applied = applyExtractedToSheet("auto", emptySheetValues("auto"), fillableGeminiFields(mapped.fields));
    expect(applied.values.policy_number.value).toBe("612345678 101 1");
    expect(applied.values.current_carrier.value).toBe("Travelers");
    expect(applied.values.current_premium.value).toBe("2109.00");
    expect(applied.values.effective_date.value).toBe("September 21, 2026");
    expect(applied.values.expiration_date.value).toBe("March 21, 2027");
    const gate = evaluateMintExtract(
      mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
        rawValue: field.rawValue,
        confidence: field.confidence,
        flagged: field.flagged,
      })),
      {
        documentKind: "not_declaration",
        filename: ADRIANA_IORI_DEC_PAGE_FILENAME,
        docType: "current_policy",
        geminiPreview: mapped.geminiPreview,
      },
    );
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.effectiveDate).toMatch(/2026-09-21/);
  });

  it("does not mint a coverage-line premium when the term total is missing", () => {
    const { rows } = mintRows({
      policy_number: "612345678 101 1",
      effective_date: "09/21/2026",
      premiums: { bodily_injury: "412.00" },
    });
    const gate = evaluateMintExtract(rows, {
      documentKind: "declaration",
      geminiPreview: sanitizeGeminiPreview({
        policy_number: "612345678 101 1",
        premiums: { bodily_injury: "412.00" },
      }),
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.missing).toEqual(["premium"]);
      expect(gate.message).toMatch(/premium/);
      expect(gate.message).toMatch(/412/);
      expect(gate.message).not.toMatch(/wind mitigation/i);
    }
  });

  it("says wind mit when the Manual file is not an issued policy", () => {
    const mapped = mapGeminiJsonToFields(
      {
        document_kind: "wind_mit",
        wind_mit_form: "OIR-B1-1802",
        roof_shape: "A",
        applicant_name: "Domenic Iori",
      },
      "current_policy",
      "auto",
    );
    const gate = evaluateMintExtract(
      mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
        rawValue: field.rawValue,
        confidence: field.confidence,
        flagged: field.flagged,
      })),
      {
        documentKind: mapped.documentKind,
        filename: "iori-wind-mit.pdf",
        docType: "wind_mit",
        geminiPreview: mapped.geminiPreview,
      },
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.message).toMatch(/wind mitigation/i);
      expect(gate.message).not.toMatch(/could not extract/i);
      expect(gate.missing).toEqual(expect.arrayContaining(["premium", "effective date", "policy number"]));
    }
  });

  it("lists the missing fields for a DEC page filename instead of calling it a non-policy", () => {
    const gate = evaluateMintExtract([], {
      documentKind: "not_declaration",
      filename: ADRIANA_IORI_DEC_PAGE_FILENAME,
      geminiPreview: "document_kind=not_declaration",
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.missing).toEqual(["policy number", "premium", "effective date"]);
      expect(gate.message).toMatch(/Could not extract policy number, premium, effective date/);
      expect(gate.message).toMatch(/Expiration date was blank/);
      expect(gate.message).toMatch(/Adriana Iori DEC Page Travelers\.pdf/);
      expect(gate.message).toMatch(/The file stays in the folder/);
      expect(gate.message).not.toMatch(/not an issued policy/i);
      expect(gate.message).not.toMatch(/wind mitigation/i);
    }
  });

  it("says the file is not an issued policy when Gemini marks not_declaration and finds no policy facts", () => {
    const gate = evaluateMintExtract([], {
      documentKind: "not_declaration",
      filename: "shopping-quote.pdf",
      geminiPreview: "named_insured=Domenic Iori",
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.message).toMatch(/not an issued policy/i);
      expect(gate.message).not.toMatch(/could not extract/i);
    }
  });

  it("names the missing fields and the sanitized Gemini return when a dec is only partly read", () => {
    const preview = sanitizeGeminiPreview({
      policy_number: "612345678 101 1",
      premiums: [{ description: "Bodily Injury", premium: "412.00" }],
      notes: "ignore this very long blob " + "x".repeat(200),
    });
    expect(preview.length).toBeLessThanOrEqual(280);
    expect(preview).not.toMatch(/x{20}/);
    const gate = evaluateMintExtract(
      [
        {
          fieldKey: "policy_number",
          normalizedValue: "612345678 101 1",
          rawValue: "612345678 101 1",
          confidence: 0.9,
          flagged: false,
        },
      ],
      { documentKind: "declaration", filename: "travelers.pdf", geminiPreview: preview },
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.missing).toEqual(["premium", "effective date"]);
      expect(gate.message).toMatch(/Could not extract premium, effective date/);
      expect(gate.message).toMatch(/612345678 101 1/);
      expect(gate.message).toMatch(/412/);
      expect(gate.message).toMatch(/The file stays in the folder/);
    }
  });

  it("says an ID card is not the declarations page when the premium is missing", () => {
    const gate = evaluateMintExtract(
      [
        {
          fieldKey: "policy_number",
          normalizedValue: "612345678 101 1",
          rawValue: "612345678 101 1",
          confidence: 0.9,
          flagged: false,
        },
        {
          fieldKey: "effective_date",
          normalizedValue: "2026-09-21",
          rawValue: "09/21/2026",
          confidence: 0.9,
          flagged: false,
        },
      ],
      { documentKind: "id_card", filename: "auto-id-card.jpg" },
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.message).toMatch(/ID card/i);
      expect(gate.message).not.toMatch(/could not extract the premium/i);
    }
  });

});
