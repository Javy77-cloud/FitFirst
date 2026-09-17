import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emptySheetValues, fieldsForLine, groupFields } from "./catalog";
import { fillSheetFromDealDetails } from "./fill-from-deal";
import {
  COMMERCIAL_COVERAGE_KEY,
  COMMERCIAL_COVERAGE_OPTIONS,
  COMMERCIAL_CONSTRUCTION_OPTIONS,
  COMMERCIAL_RISK_PROFILE_LABEL,
  COMMERCIAL_RISK_PROFILE_REUSED_KEYS,
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
    expect(wc.some((field) => field.key === "ein")).toBe(false);
    expect(wc.some((field) => field.key === "legal_name")).toBe(false);
    expect(coverageLinesFromProducts(["gl", "bop", "workers_comp"])).toEqual([
      "Workers' Comp",
      "General Liability",
      "BOP",
    ]);
  });

  it("reuses existing sheet/deal keys instead of minting Risk Profile duplicates", () => {
    const keys = fieldsForLine("general_liability").map((field) => field.key);
    for (const key of COMMERCIAL_RISK_PROFILE_REUSED_KEYS) {
      expect(keys).toContain(key);
    }
    expect(keys).not.toContain("square_footage");
    expect(keys).not.toContain("construction_type");
    expect(keys).not.toContain("premises_address");
    expect(keys).not.toContain("premises_owned");
    expect(keys).not.toContain("alarm");
    expect(keys).not.toContain("employees_ft");
    expect(keys).not.toContain("employees_pt");
    expect(keys).not.toContain("employees_seasonal");
    expect(keys).not.toContain("primary_use");
    expect(keys).not.toContain("claims_last_5_years");
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
        (field) => field.key === "medicare_parts",
      ),
    ).toBe(true);
  });

  it("cascades WC and GL blocks from coverage chips and keeps location / claims once", () => {
    const values = { coverage_lines: "Workers' Comp,General Liability" };
    const groups = Object.fromEntries(
      groupFields("general_liability", undefined, values).map((row) => [row.group, row.fields]),
    );
    expect(groups["Workers' Comp"]?.some((field) => field.key === "class_code")).toBe(true);
    expect(groups["General Liability"]?.some((field) => field.key === "products_services")).toBe(true);
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

  it("copies existing sheet keys from Details and leaves business identity off the Risk Profile", () => {
    const filled = fillSheetFromDealDetails(
      {
        quotingForm: "GL",
        quotingLine: "general_liability",
        shopProducts: ["gl"],
        stored: {
          business_name: "Harbor Tile LLC",
          ein: "12-3456789",
          operations: "Tile install",
          annual_sales: "850000",
          employee_count: "12",
          square_footage: "4200",
          construction: "Masonry",
          mailing_address: "10 Dock St",
        },
      },
      emptySheetValues("general_liability"),
    );
    expect(filled.values.annual_sales.value).toBe("850000");
    expect(filled.values.employees.value).toBe("12");
    expect(filled.values.square_feet.value).toBe("4200");
    expect(filled.values.construction.value).toBe("Masonry");
    expect(filled.values.legal_name).toBeUndefined();
    expect(filled.values.ein).toBeUndefined();
    expect(filled.values.fein).toBeUndefined();
    expect(filled.values.operations_description).toBeUndefined();
    expect(filled.values.dba).toBeUndefined();

    const claimsDetails = fieldsForLine("workers_comp").find((field) => field.key === "claims_details");
    expect(fieldIsVisible(claimsDetails!, { claims_5yr: "No claims" })).toBe(false);
    expect(fieldIsVisible(claimsDetails!, { claims_5yr: "2" })).toBe(true);
  });
});
