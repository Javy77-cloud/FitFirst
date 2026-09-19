import { describe, expect, it } from "vitest";
import {
  renewalDeltaPhrase,
  renewalDaysPhrase,
  renewalUrgencyBand,
  rankRenewalCards,
  renewalWhyLine,
  stubRenewalRisk,
  stubRenewalRiskFromDays,
  urgencyPulseShares,
} from "./urgency";

describe("renewal urgency bands", () => {
  it("puts overdue and under-30 in terracotta High, 30–60 in Medium, else Low", () => {
    expect(renewalUrgencyBand(-4)).toBe("under30");
    expect(renewalUrgencyBand(0)).toBe("under30");
    expect(renewalUrgencyBand(29)).toBe("under30");
    expect(renewalUrgencyBand(30)).toBe("30to60");
    expect(renewalUrgencyBand(59)).toBe("30to60");
    expect(renewalUrgencyBand(60)).toBe("60to90");
    expect(renewalUrgencyBand(89)).toBe("60to90");
    expect(renewalUrgencyBand(90)).toBe("90plus");
    expect(renewalUrgencyBand(180)).toBe("90plus");
    expect(stubRenewalRisk("under30")).toBe("high");
    expect(stubRenewalRisk("30to60")).toBe("medium");
    expect(stubRenewalRisk("60to90")).toBe("low");
    expect(stubRenewalRisk("90plus")).toBe("low");
    expect(stubRenewalRiskFromDays(12)).toBe("high");
    expect(stubRenewalRiskFromDays(45)).toBe("medium");
    expect(stubRenewalRiskFromDays(73)).toBe("low");
  });

  it("does not treat Upcoming/Contacted/Quoted/Bound/Lost as bands", () => {
    const source = [
      renewalUrgencyBand,
      stubRenewalRisk,
      renewalWhyLine,
      urgencyPulseShares,
    ]
      .map((fn) => String(fn))
      .join("\n");
    expect(source).not.toMatch(/upcoming|contacted|quoted|bound|lost/i);
  });
});

describe("renewal why line", () => {
  it("stubs a one-liner from days and premium delta", () => {
    expect(renewalDaysPhrase(-1)).toBe("1 day overdue");
    expect(renewalDaysPhrase(-12)).toBe("12 days overdue");
    expect(renewalDaysPhrase(0)).toBe("Expires today");
    expect(renewalDaysPhrase(1)).toBe("Expires in 1 day");
    expect(renewalDaysPhrase(28)).toBe("Expires in 28 days");
    expect(renewalDeltaPhrase(363)).toBe("premium up +$363");
    expect(renewalDeltaPhrase(-72)).toBe("premium down $72");
    expect(renewalDeltaPhrase(0)).toBe("premium unchanged");
    expect(renewalDeltaPhrase(null)).toBeNull();
    expect(renewalWhyLine({ daysUntil: 28, premiumDelta: 363 })).toBe(
      "Expires in 28 days · premium up +$363",
    );
    expect(renewalWhyLine({ daysUntil: 73 })).toBe("Expires in 73 days");
  });
});

describe("renewal priority stack rank", () => {
  it("sorts soonest first, then higher risk", () => {
    expect(
      rankRenewalCards([
        { daysUntil: 80, riskScore: 90, clientName: "Zed" },
        { daysUntil: 12, riskScore: 10, clientName: "Ann" },
        { daysUntil: 12, riskScore: 40, clientName: "Bea" },
      ]).map((row) => row.clientName),
    ).toEqual(["Bea", "Ann", "Zed"]);
  });
});

describe("urgency pulse shares", () => {
  it("reports percent of book in each band and sums to 100", () => {
    const shares = urgencyPulseShares([12, 45, 73, 120, 140]);
    const byBand = Object.fromEntries(shares.map((row) => [row.band, row]));
    expect(byBand.under30).toEqual({ band: "under30", count: 1, pct: 20 });
    expect(byBand["30to60"]).toEqual({ band: "30to60", count: 1, pct: 20 });
    expect(byBand["60to90"]).toEqual({ band: "60to90", count: 1, pct: 20 });
    expect(byBand["90plus"]).toEqual({ band: "90plus", count: 2, pct: 40 });
    expect(shares.reduce((sum, row) => sum + row.pct, 0)).toBe(100);
  });

  it("returns zeros when the book is empty", () => {
    expect(urgencyPulseShares([])).toEqual([
      { band: "under30", count: 0, pct: 0 },
      { band: "30to60", count: 0, pct: 0 },
      { band: "60to90", count: 0, pct: 0 },
      { band: "90plus", count: 0, pct: 0 },
    ]);
  });
});
