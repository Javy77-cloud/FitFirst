import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ho3BookExclusionReason, isBookHo3Policy } from "@/lib/policy/ho3-book";

describe("HO3 book Fill-from-DEC selection", () => {
  const ho3 = {
    lineOfBusiness: "HO",
    formType: "HO3",
    policyType: "Home",
    policySubType: "HO3",
  };

  it("includes form HO3 and leaves HO6, wind-only, DP, flood, and auto out", () => {
    expect(isBookHo3Policy(ho3)).toBe(true);
    expect(isBookHo3Policy({ ...ho3, policySubType: null, formType: "HO3" })).toBe(true);
    expect(isBookHo3Policy({ ...ho3, formType: null, policySubType: "HO3" })).toBe(true);
    expect(isBookHo3Policy({ lineOfBusiness: "HO", policyType: "Home" })).toBe(false);
    expect(isBookHo3Policy({ lineOfBusiness: "HO", formType: "Homeowners", policyType: "Home" })).toBe(
      false,
    );
    expect(
      isBookHo3Policy({
        lineOfBusiness: "HO",
        formType: "HO3 Wind Only",
        policyType: "Home",
        policySubType: "HO3 Wind Only",
      }),
    ).toBe(false);
    expect(
      isBookHo3Policy({
        lineOfBusiness: "HO",
        formType: "HO6",
        policyType: "Home",
        policySubType: "HO6 ( Condo)",
      }),
    ).toBe(false);
    expect(isBookHo3Policy({ lineOfBusiness: "DP", formType: "DP3", policySubType: "DP3" })).toBe(false);
    expect(isBookHo3Policy({ lineOfBusiness: "DP", formType: "DP1", policySubType: "DP1" })).toBe(false);
    expect(isBookHo3Policy({ lineOfBusiness: "FLOOD", formType: "NFIP Flood", policyType: "Flood" })).toBe(
      false,
    );
    expect(isBookHo3Policy({ lineOfBusiness: "FLOOD", formType: "Private Flood" })).toBe(false);
    expect(isBookHo3Policy({ lineOfBusiness: "AUTO", formType: "Auto", policyType: "Auto" })).toBe(false);
    expect(isBookHo3Policy({ lineOfBusiness: "AUTO", formType: "PA", policySubType: "PA" })).toBe(false);
    expect(isBookHo3Policy({ ...ho3, formType: "HO3", policySubType: "HO6" })).toBe(false);
  });

  it("names the exclusion", () => {
    expect(ho3BookExclusionReason(ho3)).toBeNull();
    expect(
      ho3BookExclusionReason({ formType: "HO3 Wind Only", policySubType: "HO3 Wind Only", lineOfBusiness: "HO" }),
    ).toBe("HO3 Wind Only");
    expect(ho3BookExclusionReason({ formType: "HO6", policySubType: "HO6 ( Condo)", lineOfBusiness: "HO" })).toBe(
      "HO6",
    );
    expect(ho3BookExclusionReason({ formType: "DP3", lineOfBusiness: "DP" })).toBe("DP3");
    expect(ho3BookExclusionReason({ formType: "NFIP Flood", lineOfBusiness: "FLOOD" })).toBe("flood");
    expect(ho3BookExclusionReason({ formType: "Auto", lineOfBusiness: "AUTO" })).toBe("Auto");
    expect(ho3BookExclusionReason({ formType: "Marketplace", lineOfBusiness: "HEALTH" })).toBe("not HO3");
  });
});

describe("HO3 book runner wiring", () => {
  it("delegates to the book script and still fills through fillPolicyFromDec with overwrite", () => {
    const wrapper = readFileSync("scripts/ff-fill-ho3-from-dec.ts", "utf8");
    expect(wrapper).toMatch(/ff-fill-book-from-dec/);
    expect(wrapper).toMatch(/--family/);
    expect(wrapper).toMatch(/"ho3"/);

    const script = readFileSync("scripts/ff-fill-book-from-dec.ts", "utf8");
    expect(script).toMatch(/loadFillDecDocument/);
    expect(script).toMatch(/fillPolicyFromDec/);
    expect(script).toMatch(/confirmOverwrite: true/);
    expect(script).toMatch(/source: "manual"/);
    expect(script).toMatch(/argv\.includes\("--apply"\)/);
    expect(script).toMatch(/FF_OPS_FILL = "1"/);
    expect(script).not.toMatch(/quote_sheets|fillQuoteSheet/);

    const action = readFileSync("src/app/actions/policy-fill-from-dec.ts", "utf8");
    const fill = action.slice(action.indexOf("export async function fillPolicyFromDec("));
    const body = fill.slice(0, fill.indexOf("export async function fillPolicyFromDecOnIssue"));
    expect(body.indexOf('FF_OPS_FILL === "1"')).toBeGreaterThan(-1);
    expect(body.indexOf('FF_OPS_FILL === "1"')).toBeLessThan(body.indexOf("Sign in required."));
    expect(action).toMatch(/import \{ loadFillDecDocument \} from "@\/lib\/policy\/fill-dec-document"/);
    expect(action).toMatch(/prepareFill\(\{/);
  });
});
