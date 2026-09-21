import { describe, expect, it } from "vitest";
import { renewalPolicyTypeLabel } from "./policy-type";

describe("renewal policy type", () => {
  it("names the line instead of a bare policy", () => {
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "HO", policySubType: "HO3" })).toBe("Home · HO3");
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "AUTO" })).toBe("Auto");
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "LIFE", insuranceType: "Term" })).toBe("Life · Term");
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "" })).toBe("Line open");
    expect(renewalPolicyTypeLabel({ lineOfBusiness: "HO" })).not.toBe("Policy");
  });
});
