import { describe, expect, it } from "vitest";
import {
  policyFormBesideLine,
  policyFormChipLabel,
  policyFormCode,
  policyFormProductLabel,
} from "./form-label";

describe("policy form product label", () => {
  it("uses the form code instead of Home", () => {
    expect(policyFormCode("HO3")).toBe("HO3");
    expect(policyFormCode("HO-6")).toBe("HO6");
    expect(policyFormCode("HO6 ( Condo)")).toBe("HO6");
    expect(policyFormCode("DP1")).toBe("DP1");
    expect(policyFormCode("dp-3")).toBe("DP3");
    expect(policyFormCode("Workers' Comp")).toBe("WC");
    expect(policyFormCode("PA")).toBe("Auto");
    expect(policyFormCode("Errors & Omissions")).toBe("E&O");
    expect(policyFormCode("Home")).toBeNull();
    expect(policyFormCode("Commercial Auto")).toBeNull();
    expect(policyFormCode("General Liability")).toBeNull();

    const home = { policyType: "Home", formType: "HO3", lineOfBusiness: "HO" };
    expect(policyFormChipLabel(home)).toBe("HO3");
    expect(policyFormProductLabel(home)).toBe("HO3");
    expect(policyFormChipLabel({ policyType: "Home", lineOfBusiness: "HO" })).toBe("");
    expect(policyFormProductLabel({ policyType: "Home", lineOfBusiness: "HO" })).toBe("Home");
    expect(
      policyFormProductLabel({ policyType: "Home", policySubType: "DP3", lineOfBusiness: "HO" }),
    ).toBe("DP3");
    expect(policyFormProductLabel({ policyType: "Workers' Comp", lineOfBusiness: "WC" })).toBe("WC");
    expect(
      policyFormProductLabel({ policyType: "Commercial", policySubType: "General Liability" }),
    ).toBe("General Liability");
    expect(policyFormProductLabel({ policyType: "Auto", lineOfBusiness: "AUTO" })).toBe("Auto");
    expect(policyFormBesideLine("Homeowners", { policyType: "Home", formType: "HO3" })).toBe("HO3");
    expect(policyFormBesideLine("Homeowners", { policyType: "Home" })).toBe("");
    expect(policyFormBesideLine("Auto", { policyType: "Auto" })).toBe("");
  });

  it("uses Flood or FLD on a flood line, never Home", () => {
    expect(policyFormCode("FLD")).toBe("FLD");
    expect(policyFormCode("FLD1200043")).toBe("FLD");
    expect(policyFormCode("FLOOD")).toBe("Flood");
    expect(policyFormCode("Selective Flood")).toBe("Flood");
    expect(policyFormCode("NFIP")).toBe("Flood");
    const zoila = {
      lineOfBusiness: "FLOOD",
      policyType: "Home",
      formType: "Home",
      policySubType: "Home",
    };
    expect(policyFormChipLabel(zoila)).toBe("Flood");
    expect(policyFormProductLabel(zoila)).toBe("Flood");
    expect(policyFormProductLabel({ ...zoila, formType: "FLD", policySubType: "FLD" })).toBe("FLD");
    expect(
      policyFormProductLabel({ lineOfBusiness: "FLOOD", formType: "HO3", policyType: "Home" }),
    ).toBe("Flood");
    expect(policyFormBesideLine("Flood", { lineOfBusiness: "FLOOD", formType: "FLD" })).toBe("FLD");
    expect(policyFormBesideLine("Flood", { lineOfBusiness: "FLOOD" })).toBe("");
    expect(policyFormProductLabel({ policyType: "Home", formType: "HO3", lineOfBusiness: "HO" })).toBe(
      "HO3",
    );
  });
});
