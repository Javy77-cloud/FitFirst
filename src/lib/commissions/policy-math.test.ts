import { describe, expect, it } from "vitest";
import {
  computePolicyCommission,
  effectivePcRatePct,
  healthKind,
  normalizeSellingAgency,
  policyCommissionVisibility,
} from "./policy-math";

describe("live Zoho selling agency", () => {
  it("maps Agility display to the Pimsco/Agility actual value", () => {
    expect(normalizeSellingAgency("AFA")).toBe("afa");
    expect(normalizeSellingAgency("First Connect")).toBe("first_connect");
    expect(normalizeSellingAgency("Agentero")).toBe("agentero");
    expect(normalizeSellingAgency("Agility")).toBe("pimsco_agility");
    expect(normalizeSellingAgency("Pimsco/Agility")).toBe("pimsco_agility");
    expect(normalizeSellingAgency("BackNine")).toBe("backnine");
  });

  it("halves only AFA Commission4", () => {
    expect(effectivePcRatePct(10, "afa")).toBe(5);
    expect(effectivePcRatePct(18, "AFA")).toBe(9);
    expect(effectivePcRatePct(8, "afa")).toBe(4);
    expect(effectivePcRatePct(10, "first_connect")).toBe(10);
    expect(effectivePcRatePct(14, "agentero")).toBe(14);
    expect(effectivePcRatePct(25, "pimsco_agility")).toBe(25);
  });
});

describe("Life — Jonathan Ochoa Accidental Death / BackNine", () => {
  it("uses TAC = GWP × 80%, Initial 9/12, Deferred 3/12, Monthly 0", () => {
    const result = computePolicyCommission({
      insuranceType: "Life",
      policyType: "Life",
      policySubType: "Accidental Death",
      sellingAgency: "backnine",
      gwp: 620.4,
      commission4: 80,
      premiumFrequency: "Annual",
      numberOfInsured: null,
    });
    expect(result.rule).toBe("life");
    expect(result.totalAnnualCommission).toBe(496.32);
    expect(result.initialCommission).toBe(372.24);
    expect(result.deferredCommission).toBe(124.08);
    expect(result.monthlyCommission).toBe(0);
  });

  it("keeps Monthly at 0 even when frequency is Monthly (Steven Asvazadourian)", () => {
    const result = computePolicyCommission({
      insuranceType: "Life",
      policySubType: "Accidental Death",
      sellingAgency: "BackNine",
      gwp: 1139,
      commission4: 80,
      premiumFrequency: "Monthly",
    });
    expect(result.totalAnnualCommission).toBe(911.2);
    expect(result.initialCommission).toBe(683.4);
    expect(result.deferredCommission).toBe(227.8);
    expect(result.monthlyCommission).toBe(0);
  });
});

describe("P&C — live AFA half-rate samples", () => {
  it("Cromartie DP3: Commission4 10 → TAC = GWP × 5%", () => {
    const result = computePolicyCommission({
      insuranceType: "P&C",
      policyType: "Renter & Landord",
      policySubType: "DP3",
      sellingAgency: "afa",
      gwp: 3158,
      commission4: 10,
      premiumFrequency: "Annual",
    });
    expect(result.totalAnnualCommission).toBe(157.9);
    expect(result.initialCommission).toBe(0);
    expect(result.deferredCommission).toBe(0);
    expect(result.monthlyCommission).toBe(0);
    expect(result.effectiveRatePct).toBe(5);
  });

  it("Miranda Auto: Commission4 18 → TAC = GWP × 9%", () => {
    const result = computePolicyCommission({
      insuranceType: "P&C",
      policyType: "Auto",
      policySubType: "Auto",
      sellingAgency: "AFA",
      gwp: 428,
      commission4: 18,
      premiumFrequency: "Semi-Annual",
    });
    expect(result.totalAnnualCommission).toBe(38.52);
    expect(result.monthlyCommission).toBe(0);
  });

  it("Patterson DP3: Commission4 8 → TAC = GWP × 4%", () => {
    const result = computePolicyCommission({
      insuranceType: "P&C",
      policySubType: "DP3",
      sellingAgency: "afa",
      gwp: 1741.04,
      commission4: 8,
      premiumFrequency: "Annual",
    });
    expect(result.totalAnnualCommission).toBe(69.64);
  });
});

describe("P&C — First Connect and Agentero use full Commission4", () => {
  it("Palacios WC monthly: TAC = GWP × 10%, Monthly = TAC/12", () => {
    const result = computePolicyCommission({
      insuranceType: "P&C",
      policyType: "Commercial",
      policySubType: "Workers' Comp",
      sellingAgency: "first_connect",
      gwp: 14200,
      commission4: 10,
      premiumFrequency: "Monthly",
    });
    expect(result.totalAnnualCommission).toBe(1420);
    expect(result.monthlyCommission).toBe(118.33);
    expect(result.initialCommission).toBe(0);
  });

  it("Palacios GL annual: Monthly stays 0", () => {
    const result = computePolicyCommission({
      insuranceType: "P&C",
      policyType: "Commercial",
      policySubType: "General Liability",
      sellingAgency: "First Connect",
      gwp: 4038,
      commission4: 10,
      premiumFrequency: "Annual",
    });
    expect(result.totalAnnualCommission).toBe(403.8);
    expect(result.monthlyCommission).toBe(0);
  });

  it("Logan Agentero GL: full 14%, not halved", () => {
    const result = computePolicyCommission({
      insuranceType: "P&C",
      policyType: "Commercial",
      policySubType: "General Liability",
      sellingAgency: "agentero",
      gwp: 359,
      commission4: 14,
      premiumFrequency: "Annual",
    });
    expect(result.totalAnnualCommission).toBe(50.26);
    expect(result.effectiveRatePct).toBe(14);
  });
});

describe("Health — live Marketplace / MA / Supplemental", () => {
  it("Mcalister Marketplace: PMPM × insured, Commission4 unused", () => {
    const result = computePolicyCommission({
      insuranceType: "Health",
      policyType: "Health",
      policySubType: "Marketplace",
      sellingAgency: "pimsco_agility",
      gwp: 30,
      commission4: null,
      premiumFrequency: "Monthly",
      numberOfInsured: 2,
    });
    expect(result.rule).toBe("marketplace");
    expect(result.monthlyCommission).toBe(60);
    expect(result.totalAnnualCommission).toBe(720);
    expect(result.effectiveRatePct).toBeNull();
  });

  it("Seraphin Medicare Advantage: one-time TAC = GWP", () => {
    const result = computePolicyCommission({
      insuranceType: "Health",
      policySubType: "Medicare Advantage",
      sellingAgency: "Pimsco/Agility",
      gwp: 363,
      commission4: null,
      premiumFrequency: "Annual",
    });
    expect(result.rule).toBe("medicare_advantage");
    expect(result.totalAnnualCommission).toBe(363);
    expect(result.monthlyCommission).toBe(0);
  });

  it("Valencia Supplemental: Monthly = GWP × 25%, TAC from unrounded monthly × 12", () => {
    const result = computePolicyCommission({
      insuranceType: "Health",
      policySubType: "Supplemental Health",
      sellingAgency: "pimsco_agility",
      gwp: 115.49,
      commission4: 25,
      premiumFrequency: "Monthly",
    });
    expect(result.rule).toBe("supplemental");
    expect(result.monthlyCommission).toBe(28.87);
    expect(result.totalAnnualCommission).toBe(346.47);
  });

  it("does not invent a rate for unspecified Health subtypes without Commission4", () => {
    const result = computePolicyCommission({
      insuranceType: "Health",
      policySubType: "Dental",
      sellingAgency: "pimsco_agility",
      gwp: 80,
      commission4: null,
      premiumFrequency: "Monthly",
    });
    expect(result.rule).toBe("health_other");
    expect(result.totalAnnualCommission).toBe(0);
    expect(result.monthlyCommission).toBe(0);
  });
});

describe("layout switches", () => {
  it("hides Commission4 on Marketplace and Medicare Advantage", () => {
    expect(
      policyCommissionVisibility({ insuranceType: "Health", policySubType: "Marketplace" })
        .showCommission4,
    ).toBe(false);
    expect(
      policyCommissionVisibility({
        insuranceType: "Health",
        policySubType: "Medicare Advantage",
      }).showCommission4,
    ).toBe(false);
    expect(
      policyCommissionVisibility({
        insuranceType: "Health",
        policySubType: "Supplemental Health",
      }).showCommission4,
    ).toBe(true);
    expect(
      policyCommissionVisibility({ insuranceType: "Life", policySubType: "Term Life" })
        .showLifeSplit,
    ).toBe(true);
    expect(healthKind("Supplemental Health")).toBe("supplemental");
  });
});
