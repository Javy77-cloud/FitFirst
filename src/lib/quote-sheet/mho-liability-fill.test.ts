import { describe, expect, it, vi } from "vitest";
import { QUOTING_FORMS } from "@/lib/domain";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues, extractKeyToSheetKey, fieldsForLine } from "@/lib/quote-sheet/catalog";
import { fillSheetFromDealDetails } from "@/lib/quote-sheet/fill-from-deal";
import {
  quotingFormIsManufacturedHome,
  resolveHomeRiskAddresses,
  streetsAreSameLocation,
} from "@/lib/quote-sheet/home-address-fill";
import { applyPropertyRecordsToSheet } from "@/lib/florida-property/apply";
import { buildGeminiUserPrompt } from "@/lib/extraction/gemini/prompt";
import { expandManufacturedHomeFacts, mergePropertyFillFacts } from "@/lib/property-fill/merge";
import { orchestratePropertyFill } from "@/lib/property-fill/orchestrate";
import { coerceQuotingFormId } from "@/lib/quoting/forms";
import { sheetProductForQuotingForm } from "@/lib/deals/deal-line";

const CATHERINE_MAILING = "1842 Palm Bay Rd";

describe("MHO / HO3 Risk Profile address + property map", () => {
  it("uses quoting form MHO (MMHO coerces to MHO; there is no MMHO form id)", () => {
    expect(QUOTING_FORMS.some((form) => form.id === "MHO")).toBe(true);
    expect(QUOTING_FORMS.some((form) => form.id === "MMHO")).toBe(false);
    expect(coerceQuotingFormId("MHO")).toBe("MHO");
    expect(coerceQuotingFormId("MH")).toBe("MHO");
    expect(coerceQuotingFormId("MMHO")).toBe("MHO");
    expect(sheetProductForQuotingForm("MHO")).toBe("homeowners");
    expect(quotingFormIsManufacturedHome("MHO", "MMHO")).toBe(true);
    expect(quotingFormIsManufacturedHome("HO3")).toBe(false);
    expect(quotingFormIsManufacturedHome("MDP")).toBe(false);
  });

  it("Catherine: confirmed Deal Details mailing becomes property address; mailing stays blank", () => {
    const resolved = resolveHomeRiskAddresses({
      stored: {
        contact_mailing_address: CATHERINE_MAILING,
        contact_mailing_city: "Melbourne",
        contact_mailing_state: "FL",
        contact_mailing_zip: "32935",
        contact_mailing_county: "Brevard",
      },
    });
    expect(resolved.property.street).toBe(CATHERINE_MAILING);
    expect(resolved.property.city).toBe("Melbourne");
    expect(resolved.property.county).toBe("Brevard");
    expect(resolved.mailing.street).toBe("");
    expect(resolved.mailingReason).toBe("same_as_property");

    const result = fillSheetFromDealDetails(
      {
        quotingForm: "MHO",
        quotingLine: "home",
        primaryNamedInsured: "Catherine Garcia",
        stored: {
          contact_mailing_address: CATHERINE_MAILING,
          contact_mailing_city: "Melbourne",
          contact_mailing_state: "FL",
          contact_mailing_zip: "32935",
          contact_mailing_county: "Brevard",
        },
      },
      emptySheetValues("home", "homeowners"),
    );
    expect(result.values.address1.value).toBe(CATHERINE_MAILING);
    expect(result.values.city.value).toBe("Melbourne");
    expect(result.values.county.value).toBe("Brevard");
    expect(result.values.mailing_address.value).toBe("");
    expect(result.filledKeys).not.toContain("mailing_address");
    expect(result.values.mobile_home.value).toBe("yes");
    expect(result.values.structure_type.value).toBe("Manufactured Home");
    expect(result.values.named_insured.value).toBe("Catherine Garcia");
  });

  it("insured address alone fills property and does not copy onto mailing", () => {
    const result = fillSheetFromDealDetails(
      {
        quotingForm: "HO3",
        quotingLine: "home",
        stored: {
          mailing_address: "5181 Tallwood Cir",
          city: "Naples",
          state: "FL",
          zip: "34113",
          county: "Collier",
        },
      },
      emptySheetValues("home", "homeowners"),
    );
    expect(result.values.address1.value).toBe("5181 Tallwood Cir");
    expect(result.values.county.value).toBe("Collier");
    expect(result.values.mailing_address.value).toBe("");
    expect(result.values.mobile_home.value).toBe("");
    expect(result.values.structure_type.value).toBe("");
  });

  it("Rosa HO3: property stays Cypress Point and a different mailing is copied", () => {
    const result = fillSheetFromDealDetails(
      {
        quotingForm: "HO3",
        quotingLine: "home",
        primaryNamedInsured: "Rosa Castellanos",
        stored: {
          mailing_address: "18025 Cypress Point Rd",
          city: "Fort Myers",
          state: "FL",
          zip: "33967",
          county: "Lee",
          contact_mailing_address: "8561 SW 85th St Ave",
          contact_mailing_city: "Miami",
          contact_mailing_state: "FL",
          contact_mailing_zip: "33173",
        },
      },
      emptySheetValues("home", "homeowners"),
    );
    expect(result.values.address1.value).toBe("18025 Cypress Point Rd");
    expect(result.values.county.value).toBe("Lee");
    expect(result.values.mailing_address.value).toBe("8561 SW 85th St Ave, Miami, FL 33173");
    expect(streetsAreSameLocation(result.values.address1.value, result.values.mailing_address.value)).toBe(
      false,
    );
  });

  it("liability-only Gemini fills policy facts and the lone address as property, not dwelling", () => {
    const sheet = emptySheetValues("home", "homeowners");
    const result = applyExtractedToSheet("home", sheet, [
      { fieldKey: "named_insured", normalizedValue: "Catherine Garcia" },
      { fieldKey: "current_carrier", normalizedValue: "American Modern" },
      { fieldKey: "policy_number", normalizedValue: "LIA-100" },
      { fieldKey: "mailing_address", normalizedValue: `${CATHERINE_MAILING}, Melbourne, FL 32935` },
      { fieldKey: "coverage_e", normalizedValue: "300000" },
      { fieldKey: "coverage_f", normalizedValue: "1000" },
    ]);
    expect(result.values.named_insured.value).toBe("Catherine Garcia");
    expect(result.values.current_carrier.value).toBe("American Modern");
    expect(result.values.policy_number.value).toBe("LIA-100");
    expect(result.values.coverage_e.value).toBe("$300k");
    expect(result.values.coverage_f.value).toBe("$1k");
    expect(result.values.address1.value).toContain("Palm Bay");
    expect(result.values.mailing_address.value).toBe("");
    expect(result.values.year_built.value).toBe("");
    expect(result.values.coverage_a.value).toBe("");
    expect(result.values.square_feet.value).toBe("");
    expect(buildGeminiUserPrompt("dec", "home")).toMatch(/Liability-only/);
    expect(buildGeminiUserPrompt("dec", "home")).toMatch(/Do not invent year_built/);
  });

  it("keeps a distinct Gemini property address and does not replace it with mailing", () => {
    const result = applyExtractedToSheet("home", emptySheetValues("home", "homeowners"), [
      { fieldKey: "address", normalizedValue: "18025 Cypress Point Rd, Fort Myers, FL 33967" },
      { fieldKey: "mailing_address", normalizedValue: "8561 SW 85th St Ave, Miami, FL 33173" },
    ]);
    expect(result.values.address1.value).toContain("Cypress Point");
    expect(result.values.mailing_address.value).toContain("85th");
  });

  it("maps flood + county property keys onto Home/MHO fields, including manufactured land use", () => {
    const homeKeys = new Set(fieldsForLine("home", "homeowners").map((field) => field.key));
    const apiKeys = [
      "year_built",
      "square_feet",
      "beds",
      "baths",
      "stories",
      "flood_zone",
      "bfe",
      "firm_panel",
      "firm_effective_date",
      "parcel_id",
      "land_use",
      "mobile_home",
      "structure_type",
      "construction",
      "pool",
      "garage_type",
      "carport",
      "acres",
      "year_purchased",
      "assessed_value",
      "county",
      "named_insured",
    ];
    for (const key of apiKeys) {
      expect(homeKeys.has(key), key).toBe(true);
      expect(extractKeyToSheetKey("home", key)).toBe(key);
    }
    expect(extractKeyToSheetKey("home", "applicant_name")).toBe("named_insured");

    const expanded = expandManufacturedHomeFacts([
      {
        fieldKey: "land_use",
        sheetKey: "land_use",
        value: "MOBILE HOME",
        sourceLabel: "county PA",
        kind: "county",
      },
      {
        fieldKey: "year_built",
        sheetKey: "year_built",
        value: "1998",
        sourceLabel: "county PA",
        kind: "county",
      },
      {
        fieldKey: "flood_zone",
        sheetKey: "flood_zone",
        value: "X",
        sourceLabel: "FloodZoneMap",
        kind: "fema",
      },
      {
        fieldKey: "firm_panel",
        sheetKey: "firm_panel",
        value: "12009C",
        sourceLabel: "FEMA",
        kind: "fema",
      },
    ]);
    expect(expanded.find((fact) => fact.sheetKey === "mobile_home")?.value).toBe("yes");
    expect(expanded.find((fact) => fact.sheetKey === "structure_type")?.value).toBe("Mobile Home");

    const { facts } = mergePropertyFillFacts({
      countyPa: expanded.filter((fact) => fact.kind === "county"),
      floodZoneMap: expanded.filter((fact) => fact.sheetKey === "flood_zone"),
      fema: expanded.filter((fact) => fact.sheetKey === "firm_panel"),
    });
    const existing = emptySheetValues("home", "homeowners");
    existing.address1 = { value: CATHERINE_MAILING, status: "check", source: "agent", sourceLabel: "deal details" };
    existing.mobile_home = { value: "no", status: "check", source: "agent", sourceLabel: "default" };
    existing.mailing_address = { value: "", status: "missing", source: "blank" };
    const applied = applyPropertyRecordsToSheet("home", existing, [
      ...facts,
      {
        fieldKey: "mailing_address",
        sheetKey: "mailing_address",
        value: `${CATHERINE_MAILING}, Melbourne, FL 32935`,
        sourceLabel: "property records",
        kind: "county",
      },
      {
        fieldKey: "coverage_a",
        sheetKey: "coverage_a",
        value: "150000",
        sourceLabel: "property records",
        kind: "county",
      },
    ]);
    expect(applied.values.year_built.value).toBe("1998");
    expect(applied.values.flood_zone.value).toBe("X");
    expect(applied.values.firm_panel.value).toBe("12009C");
    expect(applied.values.land_use.value).toBe("MOBILE HOME");
    expect(applied.values.mobile_home.value).toBe("yes");
    expect(applied.values.structure_type.value).toBe("Mobile Home");
    expect(applied.values.mailing_address.value).toBe("");
    expect(applied.values.coverage_a.value).toBe("");
    expect(applied.skippedKeys).toContain("mailing_address");
    expect(applied.skippedKeys).toContain("coverage_a");
  });

  it("geocoded county is sent to county PA when the sheet county is blank", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => {
      const u = String(url);
      calls.push(u);
      if (u.includes("geocode.arcgis.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                location: { x: -80.6, y: 28.1 },
                attributes: { Subregion: "Brevard County", City: "Melbourne", Region: "Florida", Postal: "32935" },
              },
            ],
          }),
        };
      }
      if (u.includes("floodzonemap.org")) {
        return { ok: true, status: 200, json: async () => ({ zones: [{ zone: "AE", base_flood_elevation: "8" }] }) };
      }
      return { ok: true, status: 200, json: async () => ({ features: [] }) };
    });
    const bundle = await orchestratePropertyFill({
      address: { address1: CATHERINE_MAILING, city: "Melbourne", state: "FL", zip: "32935" },
      apiKey: null,
      fetchImpl,
    });
    expect(calls.some((url) => url.includes("geocode.arcgis.com"))).toBe(true);
    expect(bundle.facts.some((fact) => fact.sheetKey === "county" && fact.value === "Brevard")).toBe(true);
    expect(bundle.facts.some((fact) => fact.sheetKey === "flood_zone" && fact.value === "AE")).toBe(true);
    expect(bundle.warnings?.some((row) => /GetParcelData key missing/i.test(row))).toBe(true);
    expect(bundle.warnings?.join(" ")).not.toMatch(/Flood lookup returned no flood fields/);
  });

  it("Auto Deal Details fill still seeds driver 1 and does not require a property address", () => {
    const result = fillSheetFromDealDetails(
      {
        primaryNamedInsured: "Domenic M Iori",
        quotingLine: "auto",
        stored: {
          date_of_birth: "1980-04-04",
          mailing_address: "10 Oak St",
          contact_mailing_address: "PO Box 9",
        },
      },
      emptySheetValues("auto"),
    );
    expect(result.values.driver_1_name.value).toBe("Domenic M Iori");
    expect(result.values.driver_1_dob.value).toBe("4/4/1980");
    expect(result.values.address1).toBeUndefined();
    expect(result.values.mailing_address).toBeUndefined();
  });
});
