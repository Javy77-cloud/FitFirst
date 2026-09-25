import { describe, expect, it } from "vitest";
import { mapGeminiJsonToFields } from "./map";
import {
  classifyManufacturedHomeForm,
  formatHomeDeductibleAmount,
  formatHomeDollarAmount,
} from "./home-dollar";

describe("manufactured home form", () => {
  it("uses MHO for a generic HO3 dec that prints a home unit", () => {
    expect(
      classifyManufacturedHomeForm({
        form: "HO3",
        insuranceType: "Home",
        carrier: "American Traditions",
        unitYear: "2006",
        unitMake: "General MFG",
        unitSerial: "GMHGA40533527a/b",
      }),
    ).toBe("MHO");
  });

  it("leaves a stick-built HO3 alone", () => {
    expect(classifyManufacturedHomeForm({ form: "HO3", carrier: "American Traditions" })).toBeNull();
    expect(classifyManufacturedHomeForm({ form: "HO5", unitYear: "2006" })).toBeNull();
    expect(classifyManufacturedHomeForm({ form: "HO3", unitYear: "None", unitMake: "N/A" })).toBeNull();
  });

  it("accepts manufactured-home language and form codes", () => {
    expect(classifyManufacturedHomeForm({ form: "HMO" })).toBe("MHO");
    expect(classifyManufacturedHomeForm({ insuranceType: "Manufactured Home", form: "HO3" })).toBe("MHO");
  });
});

describe("home dollar display", () => {
  it("keeps percents and adds a dollar sign to dollar amounts", () => {
    expect(formatHomeDollarAmount("130000")).toBe("$130,000");
    expect(formatHomeDollarAmount("500")).toBe("$500");
    expect(formatHomeDollarAmount("10%")).toBe("10%");
    expect(formatHomeDeductibleAmount("1000")).toBe("$1,000");
    expect(formatHomeDeductibleAmount("2%")).toBe("2%");
    expect(formatHomeDeductibleAmount("25%")).toBe("25%");
    expect(formatHomeDeductibleAmount("2.0% of Coverage A - $8,672")).toBe("2% ($8,672)");
  });

  it("formats home coverage dollars from Gemini and classifies the form", () => {
    const mapped = mapGeminiJsonToFields(
      {
        form: "HO3",
        coverage_a: "130000",
        coverage_c: "65000",
        aop_deductible: "1000",
        hurricane_deductible: "2%",
        windstorm_or_hail: "1000",
        unit_make: "General MFG",
      },
      "dec",
      "home",
    );
    const byKey = Object.fromEntries(mapped.fields.map((field) => [field.fieldKey, field.normalizedValue]));
    expect(byKey.form).toBe("MHO");
    expect(byKey.coverage_a).toBe("$130,000");
    expect(byKey.coverage_c).toBe("$65,000");
    expect(byKey.aop_deductible).toBe("$1,000");
    expect(byKey.hurricane_deductible).toBe("2%");
    expect(byKey.wind_hail_deductible).toBe("$1,000");
  });

  it("maps American Traditions optionals, sinkhole, and rating aliases with dollars", () => {
    const mapped = mapGeminiJsonToFields(
      {
        all_other_perils: "1000",
        windstorm_or_hail_other_than_hurricane: "1000",
        hurricane_deductible: "2% of Coverage A",
        sinkhole: "Not Included",
        personal_injury: "100000",
        personal_injury_premium: "Included",
        home_computer: "1000",
        home_computer_premium: "4.94",
        ordinance_law: "33700",
        ordinance_law_premium: "-82.40",
        water_back_up_and_sump_overflow: "5000",
        water_backup_premium: "20.58",
        personal_property_replacement_cost_premium: "172.99",
        year_of_roof_updated: "2024",
        year_of_construction: "2024",
        type_of_residence: "Owner Occupied",
      },
      "dec",
      "home",
    );
    const byKey = Object.fromEntries(mapped.fields.map((field) => [field.fieldKey, field.normalizedValue]));
    expect(byKey.aop_deductible).toBe("$1,000");
    expect(byKey.wind_hail_deductible).toBe("$1,000");
    expect(byKey.hurricane_deductible).toBe("2% of Coverage A");
    expect(byKey.sinkhole_deductible).toBe("Not Included");
    expect(byKey.personal_injury).toBe("$100,000");
    expect(byKey.personal_injury_premium).toBe("Included");
    expect(byKey.home_computer).toBe("$1,000");
    expect(byKey.home_computer_premium).toBe("$4.94");
    expect(byKey.ordinance_or_law).toBe("$33,700");
    expect(byKey.ordinance_or_law_premium).toBe("-$82.40");
    expect(byKey.water_backup).toBe("$5,000");
    expect(byKey.water_backup_premium).toBe("$20.58");
    expect(byKey.personal_property_replacement_cost_premium).toBe("$172.99");
    expect(byKey.roof_year).toBe("2024");
    expect(byKey.year_built).toBe("2024");
    expect(byKey.type_of_residence).toBe("Owner Occupied");
    expect(byKey.roof_year).not.toContain("$");
    expect(byKey.form).toBeUndefined();
  });

  it("does not rewrite auto deductibles as home coverage", () => {
    const mapped = mapGeminiJsonToFields({ coverage_a: "250000", comp_deductible: "500" }, "dec", "auto");
    const coverage = mapped.fields.find((field) => field.fieldKey === "coverage_a");
    const comp = mapped.fields.find((field) => field.fieldKey === "comp_deductible");
    expect(coverage?.normalizedValue).toBe("250000");
    expect(comp?.normalizedValue).toBe("$500");
  });
});
