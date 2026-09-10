import { describe, expect, it } from "vitest";
import {
  DEAL_LINE_OPTIONS,
  lobForProduct,
  resolveDealProduct,
  resolveDealSheetLine,
  sheetProductForQuotingForm,
  shopLineForProduct,
} from "./deal-line";

describe("deal line of business", () => {
  it("defaults to Homeowners when nothing is picked", () => {
    expect(resolveDealProduct({})).toBe("homeowners");
    expect(resolveDealSheetLine({})).toBe("home");
  });

  it("maps each product to one shop line and existing deal LOB", () => {
    expect(shopLineForProduct("homeowners")).toBe("home");
    expect(lobForProduct("homeowners")).toBe("HO");
    expect(shopLineForProduct("renters")).toBe("home");
    expect(shopLineForProduct("landlord")).toBe("home");
    expect(shopLineForProduct("auto")).toBe("auto");
    expect(lobForProduct("auto")).toBe("AUTO");
    expect(shopLineForProduct("motorcycle")).toBe("auto");
    expect(shopLineForProduct("commercial_auto")).toBe("auto");
    expect(shopLineForProduct("rv")).toBe("rec_rv");
    expect(lobForProduct("flood")).toBe("FLOOD");
    expect(lobForProduct("gl")).toBe("GL");
    expect(lobForProduct("workers_comp")).toBe("WC");
  });

  it("lists the desk products plus niche lines", () => {
    const labels = DEAL_LINE_OPTIONS.map((row) => row.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Homeowners",
        "Renters",
        "Landlord",
        "Auto",
        "RV",
        "Motorcycle",
        "Flood",
        "GL",
        "Workers Comp",
        "Commercial Auto",
      ]),
    );
  });

  it("honors a stored product over the HO default", () => {
    expect(resolveDealProduct({ sheetProduct: "renters", lineOfBusiness: "HO" })).toBe("renters");
    expect(resolveDealProduct({ lineOfBusiness: "AUTO" })).toBe("auto");
  });

  it("quotingForm drives the master-sheet product (HO5→home, DP1→landlord)", () => {
    expect(sheetProductForQuotingForm("HO3")).toBe("homeowners");
    expect(sheetProductForQuotingForm("HO5")).toBe("homeowners");
    expect(sheetProductForQuotingForm("HO6")).toBe("homeowners");
    expect(sheetProductForQuotingForm("DP1")).toBe("landlord");
    expect(sheetProductForQuotingForm("DP3")).toBe("landlord");
    expect(sheetProductForQuotingForm("PA")).toBe("auto");
    expect(resolveDealProduct({ quotingForm: "HO6", sheetProduct: "renters" })).toBe("homeowners");
    expect(resolveDealProduct({ quotingForm: "DP1" })).toBe("landlord");
  });
});
