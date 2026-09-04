import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import {
  defaultTermForFamily,
  expirationFromTerm,
  insuranceFamilyFromPolicy,
  policyStatusTone,
  premiumLabel,
} from "./policy-family";

describe("policy family", () => {
  it("keeps Ana unbound in the fixture — quoting Cov A is not a policy field", () => {
    expect(fixture.risk.coverageA).toBe(321000);
    expect(fixture.outcome.bindableAt321k).toBe(0);
  });

  it("colors Active green, Lapse/Bound yellow, else red", () => {
    expect(policyStatusTone("active")).toBe("green");
    expect(policyStatusTone("Active")).toBe("green");
    expect(policyStatusTone("bound")).toBe("yellow");
    expect(policyStatusTone("lapse")).toBe("yellow");
    expect(policyStatusTone("lapsed")).toBe("yellow");
    expect(policyStatusTone("pending")).toBe("red");
    expect(policyStatusTone("cancelled")).toBe("red");
    expect(policyStatusTone("expired")).toBe("red");
  });

  it("infers Life / Health / P&C from stored fields", () => {
    expect(insuranceFamilyFromPolicy({ insuranceType: "Life" })).toBe("Life");
    expect(insuranceFamilyFromPolicy({ lineOfBusiness: "LIFE" })).toBe("Life");
    expect(insuranceFamilyFromPolicy({ lineOfBusiness: "HEALTH", policySubType: "Marketplace" })).toBe(
      "Health",
    );
    expect(insuranceFamilyFromPolicy({ lineOfBusiness: "HO" })).toBe("P&C");
  });

  it("computes Zoho-style terms by family", () => {
    const start = new Date("2026-09-01T12:00:00.000Z");
    expect(defaultTermForFamily("P&C")).toBe("12 Months");
    expect(expirationFromTerm(start, "12 Months")?.toISOString().slice(0, 10)).toBe("2027-09-01");
    expect(expirationFromTerm(start, "6 Months")?.toISOString().slice(0, 10)).toBe("2027-03-01");
    expect(expirationFromTerm(start, "20 Year")?.toISOString().slice(0, 10)).toBe("2046-09-01");
    expect(expirationFromTerm(start, "Whole Life", start)?.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(premiumLabel("P&C")).toBe("Annual premium");
  });
});
