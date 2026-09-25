import { describe, expect, it } from "vitest";
import { extractWithGeminiPdf } from "./client";
import { mapGeminiJsonToFields, type GeminiExtractJson } from "./map";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { autoCoverageExtras, autoCoverageSchedule } from "@/lib/policy/auto-coverage";
import { groupAppliedFill, proposeFillFromDec } from "@/lib/policy/fill-from-dec";

/**
 * Mocked Gemini JSON for Domenic Iori's Auto dec: two drivers, three vehicles,
 * LAST FIRST name, and optional coverages the page does not print.
 */
const DOMENIC_DEC = {
  named_insured: { value: "IORI, DOMENIC", confidence: 0.96 },
  current_carrier: { value: "Travelers", confidence: 0.95 },
  policy_number: { value: "612345678 101 1", confidence: 0.94 },
  effective_date: { value: "09/21/2026", confidence: 0.95 },
  expiration_date: { value: "03/21/2027", confidence: 0.95 },
  current_premium: { value: "2109.00", confidence: 0.93 },
  term_length: { value: "6 month", confidence: 0.9 },
  discounts: ["Multi-car", "Paperless"],
  drivers: [
    {
      name: "IORI DOMENIC",
      dob: "04/02/1984",
      license: "I123-456-78-901",
      license_state: "FL",
      relationship: "Named insured",
      excluded: "no",
    },
    {
      name: "IORI, ADRIANA",
      dob: "06/11/1986",
      license: "I999-000-11-222",
      license_state: "FL",
      relationship: "Spouse",
      excluded: "yes",
    },
  ],
  vehicles: [
    {
      year: "2019",
      make: "TOYOTA",
      model: "CAMRY",
      vin: "4T1B11HK5KU123456",
      use: "Pleasure",
      annual_miles: "12000",
      garaging_address: "100 Main St, Tampa FL 33602",
      lienholder: "Toyota Financial Services",
      premium: "900.00",
      coverages: {
        comprehensive: { deductible: "500" },
        collision: { deductible: "500" },
      },
    },
    {
      year: "2016",
      make: "HONDA",
      model: "CR-V",
      vin: "2HKRM4H75GH123456",
      use: "Commute",
      annual_miles: "8000",
      garaging_address: "100 Main St, Tampa FL 33602",
      lienholder: "Some Local Credit Union",
      premium: "700.00",
      coverages: { comprehensive: { deductible: "1000" } },
    },
    {
      year: "2012",
      make: "FORD",
      model: "F150",
      vin: "1FTEW1EP5CFC12345",
      use: "Business",
    },
  ],
  liability_bi: { value: "100/300", confidence: 0.92 },
  liability_pd: { value: "100000", confidence: 0.9 },
  rental: { value: "30/day", confidence: 0.88 },
};

function byKey(result: ReturnType<typeof mapGeminiJsonToFields>) {
  return Object.fromEntries(result.fields.map((field) => [field.fieldKey, field]));
}

describe("Auto DEC fill mapping", () => {
  const mapped = mapGeminiJsonToFields(DOMENIC_DEC as GeminiExtractJson, "dec", "auto");
  const fields = byKey(mapped);

  it("normalizes LAST FIRST and fills two drivers and three vehicles", () => {
    expect(fields.named_insured?.normalizedValue).toBe("Domenic Iori");
    expect(fields.named_insured?.flagged).toBe(false);
    expect(fields.driver_1_name?.normalizedValue).toBe("Domenic Iori");
    expect(fields.driver_2_name?.normalizedValue).toBe("Adriana Iori");
    expect(fields.driver_2_relationship?.normalizedValue).toBe("Spouse");
    expect(fields.driver_2_household_status?.normalizedValue).toBe("Excluded driver");
    expect(fields.driver_1_relationship).toBeUndefined();
    expect(fields.vin?.normalizedValue).toBe("4T1B11HK5KU123456");
    expect(fields.vehicle_2_vin?.normalizedValue).toBe("2HKRM4H75GH123456");
    expect(fields.vehicle_3_vin?.normalizedValue).toBe("1FTEW1EP5CFC12345");
    expect(fields.vehicle_3_make?.normalizedValue).toBe("FORD");
  });

  it("maps use, miles, garaging, and lienholder onto existing columns", () => {
    expect(fields.vehicle_usage?.normalizedValue).toBe("Personal");
    expect(fields.vehicle_2_usage?.normalizedValue).toBe("Commute");
    expect(fields.vehicle_3_usage?.normalizedValue).toBe("Business");
    expect(fields.annual_miles?.normalizedValue).toBe("12,000 – 14,999");
    expect(fields.vehicle_2_annual_miles?.normalizedValue).toBe("8,000 – 8,999");
    expect(fields.garaging_address?.normalizedValue).toMatch(/100 Main St/);
    expect(fields.vehicle_lienholder?.normalizedValue).toBe("Toyota Financial Services");
    expect(fields.vehicle_2_lienholder?.normalizedValue).toBe("Other");
    expect(fields.vehicle_2_lienholder_other?.normalizedValue).toBe("Some Local Credit Union");
  });

  it("fills printed coverages and leaves missing optional coverages blank", () => {
    expect(fields.liability_bi?.normalizedValue).toBe("100/300");
    expect(fields.liability_pd?.normalizedValue).toBe("100000");
    expect(fields.comp_deductible?.normalizedValue).toBe("500");
    expect(fields.collision_deductible?.normalizedValue).toBe("500");
    expect(fields.pip).toBeUndefined();
    expect(fields.um_uim).toBeUndefined();
    expect(fields.current_premium?.normalizedValue).toBe("2109.00");
  });

  it("keeps facts with no Risk Profile column on the fill-gap list", () => {
    const labels = mapped.unmappedLabels.map((row) => row.sourceLabel);
    expect(labels).toEqual(
      expect.arrayContaining([
        "fill_gap_term_length",
        "fill_gap_discounts",
        "fill_gap_rental",
        "fill_gap_driver_1_license_state",
        "fill_gap_driver_2_license_state",
        "fill_gap_driver_1_relationship",
        "fill_gap_vehicle_1_premium",
        "fill_gap_vehicle_2_premium",
        "fill_gap_vehicle_2_comp_deductible",
      ]),
    );
    const term = mapped.unmappedLabels.find((row) => row.sourceLabel === "fill_gap_term_length");
    expect(term?.rawValue).toBe("6 month");
  });

  it("keeps per-coverage premiums and a PIP deductible for policy Fill", () => {
    const mapped = mapGeminiJsonToFields(
      {
        named_insured: { value: "Veronica Boyle", confidence: 0.95 },
        vehicles: [
          {
            year: "2018",
            make: "HONDA",
            model: "CIVIC",
            vin: "2HGFC2F59JH123456",
            use: "Pleasure",
            premium: "640.00",
          },
        ],
        coverages: [
          { name: "Bodily Injury", limit: "100/300", premium: "412.00" },
          { name: "Property Damage", limit: "100000", premium: "188" },
          { name: "Personal Injury Protection", limit: "10000", deductible: "1000", premium: "220" },
          { name: "Comprehensive", deductible: "500", premium: "90" },
          { name: "Collision", deductible: "500", premium: "310" },
        ],
      },
      "dec",
      "auto",
    );
    const fields = byKey(mapped);
    expect(fields.liability_bi?.normalizedValue).toBe("100/300");
    expect(fields.liability_bi_premium?.normalizedValue).toBe("412.00");
    expect(fields.liability_pd_premium?.normalizedValue).toBe("188");
    expect(fields.pip?.normalizedValue).toBe("10000");
    expect(fields.pip_deductible?.normalizedValue).toBe("1000");
    expect(fields.pip_premium?.normalizedValue).toBe("220");
    expect(fields.comp_deductible?.normalizedValue).toBe("500");
    expect(fields.comp_premium?.normalizedValue).toBe("90");
    expect(fields.collision_premium?.normalizedValue).toBe("310");
    expect(fields.vehicle_usage?.normalizedValue).toBe("Personal");
    expect(fields.vehicle_1_premium?.normalizedValue).toBe("640.00");
    const applied = applyExtractedToSheet(
      "auto",
      {},
      mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
      })),
    );
    expect(applied.values.liability_bi_premium).toBeUndefined();
    expect(applied.values.pip_deductible).toBeUndefined();
    expect(applied.values.comp_deductible?.value).toBe("500");
  });

  it("lands Veronica Boyle coverage limits, deductibles, and premiums on the policy schedule", () => {
    const mapped = mapGeminiJsonToFields(
      {
        named_insured: { value: "Veronica Boyle", confidence: 0.95 },
        current_carrier: { value: "Travelers", confidence: 0.95 },
        policy_number: { value: "612345678 101 1", confidence: 0.94 },
        effective_date: { value: "09/21/2026", confidence: 0.95 },
        expiration_date: { value: "03/21/2027", confidence: 0.95 },
        current_premium: { value: "2109.00", confidence: 0.93 },
        discounts: ["Multi-car", "Paperless"],
        vehicles: [
          {
            year: "2018",
            make: "HONDA",
            model: "CIVIC",
            vin: "2HGFC2F59JH123456",
            use: "Pleasure",
            annual_miles: "12000",
            garaging_address: "100 Main St, Orlando FL 32801",
            lienholder: "Honda Financial",
            premium: "640.00",
          },
        ],
        premiums: {
          bodily_injury: "412.00",
          property_damage: "188",
          full_term: "2109.00",
        },
        coverages: [
          { name: "Bodily Injury", limit: "100/300", premium: "412.00" },
          { name: "Property Damage", limit: "100000", premium: "188" },
          { name: "Personal Injury Protection", limit: "10000", deductible: "1000", premium: "220" },
          { name: "Medical Payments", limit: "5000", premium: "18" },
          { name: "Uninsured Motorist", limit: "100/300", premium: "64", stacked: "No" },
          { name: "Uninsured Motorist Property Damage", limit: "100000", premium: "22" },
          { name: "Comprehensive", deductible: "500", premium: "90" },
          { name: "Collision", deductible: "500", premium: "310" },
          { name: "Rental Reimbursement", limit: "30/900", premium: "12" },
          { name: "Towing and Labor", limit: "100", premium: "6" },
          { name: "Full Glass", deductible: "50", premium: "4" },
        ],
      },
      "dec",
      "auto",
    );
    const fields = byKey(mapped);
    expect(fields.liability_bi_premium?.normalizedValue).toBe("412.00");
    expect(fields.um_pd?.normalizedValue).toBe("100000");
    expect(fields.um_stacked?.normalizedValue).toBe("No");
    expect(fields.glass?.normalizedValue).toBe("50");
    expect(fields.discounts?.normalizedValue).toMatch(/Multi-car/);
    expect(fields.current_premium?.normalizedValue).toBe("2109.00");
    expect(fields.pip?.normalizedValue).toBe("10000");
    expect(fields.pip_deductible?.normalizedValue).toBe("1000");
    expect(fields.med_pay?.normalizedValue).toBe("5000");
    expect(fields.rental_premium?.normalizedValue).toBe("12");
    expect(fields.towing_premium?.normalizedValue).toBe("6");

    const proposed = proposeFillFromDec({
      family: "auto",
      rows: mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
        rawValue: field.rawValue,
        confidence: field.confidence,
        flagged: field.flagged,
      })),
    });
    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    const schedule = autoCoverageSchedule({
      coverageLimits: patch.coverageLimits,
      comprehensiveDeductible: patch.term.comprehensiveDeductible,
      collisionDeductible: patch.term.collisionDeductible,
    });
    const byRow = Object.fromEntries(schedule.map((row) => [row.key, row]));
    expect(byRow.liability_bi?.limit).toMatch(/100/);
    expect(byRow.liability_bi?.premium).toMatch(/412/);
    expect(byRow.liability_pd?.premium).toMatch(/188/);
    expect(byRow.pip?.deductible).toMatch(/1,?000/);
    expect(byRow.pip?.premium).toMatch(/220/);
    expect(byRow.med_pay?.limit).toMatch(/5,?000/);
    expect(byRow.med_pay?.premium).toMatch(/18/);
    expect(byRow.um_uim?.premium).toMatch(/64/);
    expect(byRow.um_pd?.limit).toMatch(/100/);
    expect(byRow.um_pd?.premium).toMatch(/22/);
    expect(byRow.comprehensive?.deductible).toMatch(/500/);
    expect(byRow.comprehensive?.premium).toMatch(/90/);
    expect(byRow.collision?.premium).toMatch(/310/);
    expect(byRow.rental?.premium).toMatch(/12/);
    expect(byRow.towing?.premium).toMatch(/6/);
    expect(byRow.glass?.deductible).toMatch(/50/);
    expect(byRow.glass?.premium).toMatch(/4/);
    const extras = autoCoverageExtras({ coverageLimits: patch.coverageLimits });
    expect(extras.find((row) => row.key === "um_stacked")?.value).toBe("Non-stacked");
    expect(extras.find((row) => row.key === "discounts")?.value).toMatch(/Multi-car/);
    expect(byRow.liability_bi?.deductible).toBe("None");
  });

  it("fills blanks and leaves an agent edit, with a diff", () => {
    const cell = (value: string, source: "agent" | "blank" = "blank") =>
      source === "agent"
        ? { value, status: "confirmed" as const, source: "agent" as const }
        : { value: "", status: "missing" as const, source: "blank" as const };
    const applied = applyExtractedToSheet(
      "auto",
      {
        vehicle_year: cell("2018", "agent"),
        driver_1_name: cell(""),
      },
      mapped.fields.map((field) => ({
        fieldKey: field.fieldKey,
        normalizedValue: field.normalizedValue,
      })),
      { source: "extracted", recordMismatches: true, mismatchIncomingLabel: "Gemini" },
    );
    expect(applied.values.vehicle_year?.value).toBe("2018");
    expect(applied.values.driver_1_name?.value).toBe("Domenic Iori");
    expect(applied.values.driver_2_name?.value).toBe("Adriana Iori");
    expect(applied.values.vin?.value).toBe("4T1B11HK5KU123456");
    expect(applied.skippedKeys).toContain("vehicle_year");
    expect(applied.diffs?.join(" ")).toMatch(/2019/);
    expect(applied.diffs?.join(" ")).toMatch(/2018/);
  });
});

describe("Auto DEC photo and PDF both reach Gemini as the file", () => {
  it("sends a PDF declaration as a PDF and fills the same Auto profile", async () => {
    let inlineMime = "";
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        contents?: Array<{ parts?: Array<{ inlineData?: { mimeType?: string } }> }>;
      };
      inlineMime = body.contents?.[0]?.parts?.find((part) => part.inlineData)?.inlineData?.mimeType ?? "";
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(DOMENIC_DEC) }] } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await extractWithGeminiPdf(Buffer.from("%PDF-1.4 domenic"), "dec", {
      apiKey: "test-key",
      mimeType: "application/pdf",
      filename: "domenic-iori-dec.pdf",
      shopLine: "auto",
      purpose: "fill",
      fetchImpl,
    });
    expect(inlineMime).toBe("application/pdf");
    expect(result.ok).toBe(true);
    const name = result.result.fields.find((field) => field.fieldKey === "named_insured");
    const third = result.result.fields.find((field) => field.fieldKey === "vehicle_3_vin");
    expect(name?.normalizedValue).toBe("Domenic Iori");
    expect(name?.flagged).toBe(false);
    expect(third?.normalizedValue).toBe("1FTEW1EP5CFC12345");
  });
});
