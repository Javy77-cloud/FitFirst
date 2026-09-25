import { describe, expect, it } from "vitest";
import { renewalPolicyTypeLabel } from "./policy-type";

describe("renewal policy type", () => {
  it("names the line instead of a bare policy", () => {
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "HO", policySubType: "HO3" })).toBe("HO3");
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "HO", formType: "HO3", policyType: "Home" })).toBe("HO3");
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "HO", policyType: "Home" })).toBe("Home");
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "WC", policyType: "Workers' Comp" })).toBe("WC");
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "AUTO" })).toBe("Auto");
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "LIFE", insuranceType: "Term" })).toBe("Life · Term");
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "" })).toBe("Line open");
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "HO" })).not.toBe("Policy");
    expect(
      renewalPolicyTypeLabel({
        lineOfBusiness: "GL",
        formType: "Errors & Omissions",
        policySubType: "Errors & Omissions",
      }),
    ).toBe("E&O");
    expect(
      renewalPolicyTypeLabel({ lineOfBusiness: "GL", policySubType: "General Liability" }),
    ).toBe("Commercial · General Liability");
  });
});
