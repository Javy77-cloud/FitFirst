import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyExtractedToSheet } from "./apply";
import { emptySheetValues, extractKeyToSheetKey, fieldsForLine, groupFields } from "./catalog";
import { fillSheetFromDealDetails } from "./fill-from-deal";
import { BUSINESS_IDENTITY_FIELD_KEYS } from "@/lib/custom-fields/business-identity-fields";
import {
  COMMERCIAL_COVERAGE_KEY,
  COMMERCIAL_COVERAGE_OPTIONS,
  COMMERCIAL_CONSTRUCTION_OPTIONS,
  COMMERCIAL_RISK_PROFILE_LABEL,
  COMMERCIAL_RISK_PROFILE_REUSED_KEYS,
  COMMERCIAL_SHARED_DEAL_DETAIL_KEYS,
  coverageLinesFromProducts,
  isCommercialSheetLine,
} from "./commercial-risk-profile";
import { CLAIMS_5YR_OPTIONS } from "./sheet-defaults";
import { fieldIsVisible, visibleQuoteFields } from "./sheet-visibility";

describe("Commercial Risk Profile lean catalog", () => {
  it("shares one lean catalog across WC / GL / BOP and labels it Risk Profile", () => {
    expect(COMMERCIAL_RISK_PROFILE_LABEL).toBe("Risk Profile");
    expect(isCommercialSheetLine("bop")).toBe(true);
    expect(isCommercialSheetLine("home")).toBe(false);
    const wc = fieldsForLine("workers_comp");
    const gl = fieldsForLine("general_liability");
    const bop = fieldsForLine("bop");
    expect(wc.map((field) => field.key)).toEqual(gl.map((field) => field.key));
    expect(gl.map((field) => field.key)).toEqual(bop.map((field) => field.key));
    expect(wc.some((field) => field.key === COMMERCIAL_COVERAGE_KEY)).toBe(true);
    expect(wc.find((field) => field.key === COMMERCIAL_COVERAGE_KEY)?.options).toEqual([
      ...COMMERCIAL_COVERAGE_OPTIONS,
    ]);
    expect(wc.some((field) => field.key === "applicant_marital_status")).toBe(false);
    expect(wc.some((field) => field.key === "fein")).toBe(false);
    expect(wc.some((field) => field.key === "ein")).toBe(true);
    expect(wc.some((field) => field.key === "business_name")).toBe(true);
    expect(wc.some((field) => field.key === "legal_name")).toBe(false);
    expect(coverageLinesFromProducts(["gl", "bop", "workers_comp"])).toEqual([
      "Workers' Comp",
      "General Liability",
      "BOP",
    ]);
  });

  it("reuses Deal Details keys on the shared/general section instead of minting duplicates", () => {
    const keys = fieldsForLine("general_liability").map((field) => field.key);
    for (const key of COMMERCIAL_SHARED_DEAL_DETAIL_KEYS) {
      expect(keys).toContain(key);
      expect([...BUSINESS_IDENTITY_FIELD_KEYS]).toContain(key);
    }
    for (const key of COMMERCIAL_RISK_PROFILE_REUSED_KEYS) {
      expect(keys).toContain(key);
    }
    expect(keys).not.toContain("square_footage");
    expect(keys).not.toContain("construction_type");
    expect(keys).not.toContain("premises_address");
    expect(keys).not.toContain("premises_owned");
    expect(keys).not.toContain("alarm");
    expect(keys).not.toContain("employees");
    expect(keys).not.toContain("fein");
    expect(keys).not.toContain("annual_revenue");
    expect(keys).not.toContain("primary_use");
    expect(keys).not.toContain("claims_last_5_years");
    expect(keys).not.toContain("first_name");
    expect(keys).not.toContain("date_of_birth");
    expect(keys).not.toContain("phone");
    expect(keys).not.toContain("email");
    expect(fieldsForLine("bop").find((field) => field.key === "construction")?.options).toEqual([
      ...COMMERCIAL_CONSTRUCTION_OPTIONS,
    ]);
    expect(fieldsForLine("bop").find((field) => field.key === "claims_5yr")?.options).toEqual([
      ...CLAIMS_5YR_OPTIONS,
    ]);
    expect(fieldsForLine("bop").find((field) => field.key === "own_rent")?.label).toBe("Owned or leased");
    expect(fieldsForLine("bop").find((field) => field.key === "central_alarm")?.label).toBe("Alarm");
    expect(fieldsForLine("bop").find((field) => field.key === "central_alarm")?.options).toEqual(["yes", "no"]);
    expect(fieldsForLine("bop").find((field) => field.key === "sprinkler")?.options).toEqual(["yes", "no"]);
    expect(fieldsForLine("bop").find((field) => field.key === "vehicle_usage")?.label).toBe("Primary use");
  });

  it("shows BOP only when BOP is checked, like Medicare only when a Medicare plan is selected", () => {
    const commercial = fieldsForLine("bop");
    const bopFields = commercial.filter((field) => field.group === "BOP");
    expect(bopFields.length).toBeGreaterThan(2);
    expect(
      visibleQuoteFields(bopFields, { coverage_lines: "General Liability" }).map((field) => field.key),
    ).toEqual([]);
    expect(
      visibleQuoteFields(bopFields, { coverage_lines: "BOP" }).some((field) => field.key === "building_limit"),
    ).toBe(true);

    const health = fieldsForLine("health");
    const medicare = health.filter((field) => field.group === "Medicare");
    expect(medicare.length).toBeGreaterThan(0);
    expect(
      visibleQuoteFields(medicare, { plan_type: "Marketplace" }).map((field) => field.key),
    ).toEqual([]);
    expect(
      visibleQuoteFields(medicare, { plan_type: "Medicare A&B" }).some(
        (field) => field.key === "medicare_number",
      ),
    ).toBe(true);
  });

  it("cascades WC and GL blocks from coverage chips and keeps business / location / claims once", () => {
    const values = { coverage_lines: "Workers' Comp,General Liability" };
    const groups = Object.fromEntries(
      groupFields("general_liability", undefined, values).map((row) => [row.group, row.fields]),
    );
    expect(groups.Business?.some((field) => field.key === "ein")).toBe(true);
    expect(groups.Business?.some((field) => field.key === "employee_count")).toBe(true);
    expect(groups.Business?.some((field) => field.key === "annual_sales")).toBe(true);
    expect(groups["Workers' Comp"]?.some((field) => field.key === "class_code")).toBe(true);
    expect(groups["Workers' Comp"]?.some((field) => field.key === "employees_ft")).toBe(true);
    expect(groups["General Liability"]?.some((field) => field.key === "products_services")).toBe(true);
    expect(groups["General Liability"]?.some((field) => field.key === "annual_sales")).toBeFalsy();
    expect(groups.BOP).toBeUndefined();
    expect(groups["Location / premises"]?.length).toBeGreaterThan(3);
    expect(groups.Claims?.some((field) => field.key === "claims_5yr")).toBe(true);
    expect(groups["Commercial Property"]).toBeUndefined();

    const wcClaim = fieldsForLine("workers_comp").find((field) => field.key === "wc_claims_count");
    expect(fieldIsVisible(wcClaim!, { wc_prior_claims: "No" })).toBe(false);
    expect(fieldIsVisible(wcClaim!, { wc_prior_claims: "Yes" })).toBe(true);
  });

  it("ensureQuoteSheet seeds coverage chips from the deal's commercial products", () => {
    const source = readFileSync("src/app/actions/quote-sheet.ts", "utf8");
    expect(source).toMatch(/coverageLinesValueForDeal/);
    expect(source).toMatch(/shopProducts/);
  });

  it("seeds coverage chips from commercial products when filling from Deal Details", () => {
    const filled = fillSheetFromDealDetails(
      {
        quotingForm: "GL",
        quotingLine: "general_liability",
        shopProducts: ["gl", "bop"],
        stored: { business_name: "Harbor Tile LLC", mailing_address: "10 Dock St" },
      },
      emptySheetValues("general_liability"),
    );
    expect(filled.values.coverage_lines.value).toBe("General Liability,BOP");
    expect(filled.values.premises_same_as_business.value).toBe("Yes");
  });

  it("copies Deal Details keys onto the shared Risk Profile without parallel aliases", () => {
    const filled = fillSheetFromDealDetails(
      {
        quotingForm: "GL",
        quotingLine: "general_liability",
        shopProducts: ["gl"],
        stored: {
          business_name: "Harbor Tile LLC",
          dba: "Harbor Tile",
          entity_type: "LLC",
          ein: "12-3456789",
          years_in_business: "8",
          naics: "238340",
          operations: "Tile install",
          annual_sales: "850000",
          employee_count: "12",
          payroll: "480000",
          mailing_address: "10 Dock St",
          city: "Naples",
          state: "FL",
          zip: "34102",
          first_name: "Rosa",
          last_name: "Diaz",
          date_of_birth: "1980-04-12",
          phone: "2395550100",
          email: "rosa@example.com",
          square_footage: "4200",
          construction: "Masonry",
        },
      },
      emptySheetValues("general_liability"),
    );
    expect(filled.values.business_name.value).toBe("Harbor Tile LLC");
    expect(filled.values.dba.value).toBe("Harbor Tile");
    expect(filled.values.entity_type.value).toBe("LLC");
    expect(filled.values.ein.value).toBe("12-3456789");
    expect(filled.values.years_in_business.value).toBe("8");
    expect(filled.values.naics.value).toBe("238340");
    expect(filled.values.operations.value).toBe("Tile install");
    expect(filled.values.annual_sales.value).toBe("850000");
    expect(filled.values.employee_count.value).toBe("12");
    expect(filled.values.payroll.value).toBe("480000");
    expect(filled.values.mailing_address.value).toBe("10 Dock St");
    expect(filled.values.city.value).toBe("Naples");
    expect(filled.values.square_feet.value).toBe("4200");
    expect(filled.values.construction.value).toBe("Masonry");
    expect(filled.values.employees).toBeUndefined();
    expect(filled.values.fein).toBeUndefined();
    expect(filled.values.annual_revenue).toBeUndefined();
    expect(filled.values.legal_name).toBeUndefined();
    expect(filled.values.first_name).toBeUndefined();
    expect(filled.values.date_of_birth).toBeUndefined();
    expect(filled.values.phone).toBeUndefined();
    expect(filled.values.email).toBeUndefined();

    const claimsDetails = fieldsForLine("workers_comp").find((field) => field.key === "claims_details");
    expect(fieldIsVisible(claimsDetails!, { claims_5yr: "No claims" })).toBe(false);
    expect(fieldIsVisible(claimsDetails!, { claims_5yr: "2" })).toBe(true);
  });

  it("remaps document aliases onto Deal Details keys on commercial sheets", () => {
    expect(extractKeyToSheetKey("general_liability", "fein")).toBe("ein");
    expect(extractKeyToSheetKey("workers_comp", "employees")).toBe("employee_count");
    expect(extractKeyToSheetKey("bop", "annual_revenue")).toBe("annual_sales");
    expect(extractKeyToSheetKey("general_liability", "legal_name")).toBe("business_name");
    expect(extractKeyToSheetKey("home", "employees")).toBeNull();

    const applied = applyExtractedToSheet("general_liability", emptySheetValues("general_liability"), [
      { fieldKey: "fein", normalizedValue: "98-7654321" },
      { fieldKey: "employees", normalizedValue: "9" },
      { fieldKey: "annual_revenue", normalizedValue: "250000" },
    ]);
    expect(applied.values.ein.value).toBe("98-7654321");
    expect(applied.values.employee_count.value).toBe("9");
    expect(applied.values.annual_sales.value).toBe("250000");
    expect(applied.values.fein).toBeUndefined();
    expect(applied.values.employees).toBeUndefined();

    const aliased = fillSheetFromDealDetails(
      {
        quotingLine: "workers_comp",
        shopProducts: ["workers_comp"],
        stored: {
          fein: "11-2233445",
          employees: "4",
          annual_revenue: "120000",
          legal_name: "Dockside LLC",
        },
      },
      emptySheetValues("workers_comp"),
    );
    expect(aliased.values.ein.value).toBe("11-2233445");
    expect(aliased.values.employee_count.value).toBe("4");
    expect(aliased.values.annual_sales.value).toBe("120000");
    expect(aliased.values.business_name.value).toBe("Dockside LLC");
  });
});
